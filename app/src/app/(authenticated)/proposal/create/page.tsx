'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProposalForm } from '@/components/ProposalForm';
import { ProposalPreview } from '@/components/ProposalPreview';
import { SpinnerIcon } from '@phosphor-icons/react';
import { useAtom } from 'jotai';
import { proposalFormDataAtom } from '@/store/proposal';
import { userAtom } from '@/store';
import { useAnchor } from '@/hooks/useAnchor';
import { useWalletProtection } from '@/hooks/useWalletProtection';
import { PublicKey } from '@solana/web3.js';

type ProposalData = {
  name: string;
  description: string;
  choices: string[];
};

type ProposalState = 'form' | 'creating' | 'onchain' | 'finalizing' | 'completed' | 'error';

export default function CreateProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isWalletConnected, walletPublicKey } = useAnchor();
  
  // Apply wallet protection - we'll get the current URL inside the hook
  const { isProtected } = useWalletProtection();
  
  const [formData] = useAtom(proposalFormDataAtom);
  const [user] = useAtom(userAtom);
  
  const [currentState, setCurrentState] = useState<ProposalState>('form');
  const [proposalId, setProposalId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  // Check if we're continuing from a previous step
  const continueParam = searchParams.get('continue');
  const idParam = searchParams.get('id');

  // Reset form state when wallet is properly connected
  useEffect(() => {
    if (isProtected) {
      setIsDisabled(false);
      setCurrentState('form');
    }
  }, [isProtected]);

  useEffect(() => {
    if (continueParam && idParam) {
      // Remove the continue param from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('continue');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Load the existing proposal and continue from onchain step
      loadProposalAndContinue(parseInt(idParam));
    }
  }, [continueParam, idParam]);

  const loadProposalAndContinue = async (id: number) => {
    try {
      const response = await fetch(`/api/proposal/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load proposal');
      }
      
      const data = await response.json();
      setProposalId(id);
      setCurrentState('onchain');
      setIsDisabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      setCurrentState('error');
    }
  };

  const handleFormSubmit = async (data: { name: string; description: string; choices: string[] }) => {
    setCurrentState('creating');
    setError(null);

    try {
      // Step 1: Create proposal in database
      const response = await fetch('/api/proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          choices: data.choices,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create proposal');
      }

      const result = await response.json();
      
      setProposalId(result.proposal.id);

      // Verify wallet address matches
      if (result.proposal.author.wallet_address !== walletPublicKey?.toBase58()) {
        throw new Error('Wallet address mismatch. Please use the correct wallet.');
      }

      // Redirect to proposal page with continue param
      router.push(`/proposal/${result.proposal.id}?continue`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
      setCurrentState('error');
    }
  };

  const handleOnchainCreation = async () => {
    if (!proposalId) return;

    setCurrentState('onchain');
    setError(null);

    try {
      // Get the proposal data to retrieve hash and payer pubkey
      const response = await fetch(`/api/proposal/${proposalId}`);
      if (!response.ok) {
        throw new Error('Failed to load proposal data');
      }

      const proposal = await response.json();
      
      // Call the anchor program to create the proposal onchain
      const { program, provider } = useAnchor();
      
      const hashBytes = Buffer.from(proposal.hash, 'hex');
      const uri = `/proposal/${proposalId}`;
      
      // Create the transaction
      const tx = await program.methods
        .createProposal(uri, Array.from(hashBytes))
        .accounts({
          author: walletPublicKey!,
          payer: new PublicKey(proposal.payerPubkey),
        })
        .rpc({ commitment: 'confirmed' });

      
      // Move to finalization step
      setCurrentState('finalizing');
      await handleFinalization();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create onchain proposal');
      setCurrentState('error');
    }
  };

  const handleFinalization = async () => {
    if (!proposalId) return;

    try {
      const response = await fetch(`/api/proposal/${proposalId}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize proposal');
      }

      setCurrentState('completed');
      
      // Redirect to the proposal page
      setTimeout(() => {
        router.push(`/proposal/${proposalId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize proposal');
      setCurrentState('error');
    }
  };

  const renderStateMessage = () => {
    switch (currentState) {
      case 'creating':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <SpinnerIcon className="h-4 w-4 text-blue-600 mr-3 animate-spin" />
              <span className="text-blue-800">Creating proposal in database...</span>
            </div>
          </div>
        );
      case 'onchain':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <SpinnerIcon className="h-4 w-4 text-yellow-600 mr-3 animate-spin" />
                <span className="text-yellow-800">Creating proposal on blockchain...</span>
              </div>
              <button
                onClick={handleOnchainCreation}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );
      case 'finalizing':
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <SpinnerIcon className="h-4 w-4 text-green-600 mr-3 animate-spin" />
              <span className="text-green-800">Finalizing proposal...</span>
            </div>
          </div>
        );
      case 'completed':
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 rounded-full mr-3"></div>
              <span className="text-green-800">Proposal created successfully! Redirecting...</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-600 rounded-full mr-3"></div>
                <span className="text-red-800">Error: {error}</span>
              </div>
              <button
                onClick={() => {
                  setCurrentState('form');
                  setError(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Show loading while wallet protection is being checked
  if (!isProtected) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <SpinnerIcon className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Proposal</h1>
          <p className="mt-2 text-gray-600">
            Create a new voting proposal for the community
          </p>
        </div>

        {renderStateMessage()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form Column */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Proposal Details</h2>
            <ProposalForm
              onSubmit={handleFormSubmit}
              disabled={isDisabled}
              showSubmit={currentState === 'form'}
            />
          </div>

          {/* Preview Column */}
          <div className="h-fit">
            <ProposalPreview
              name={formData.name}
              description={formData.description}
              choices={formData.choices.filter(choice => choice.trim() !== '')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}