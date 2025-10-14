'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProposalForm } from '@/components/ProposalForm';
import { ProposalPreview } from '@/components/ProposalPreview';
import { useAtom } from 'jotai';
import { proposalFormDataAtom } from '@/store/proposal';
import { userAtom } from '@/store';
import { useAnchor } from '@/hooks/useAnchor';
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
  
  const [formData] = useAtom(proposalFormDataAtom);
  const [user] = useAtom(userAtom);
  
  const [currentState, setCurrentState] = useState<ProposalState>('form');
  const [proposalId, setProposalId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  // Check if we're continuing from a previous step
  const continueParam = searchParams.get('continue');
  const idParam = searchParams.get('id');

  // Check wallet connection immediately when page loads
  useEffect(() => {
    // Check if wallet is connected and matches user's wallet address
    if (!isWalletConnected || !walletPublicKey || user?.wallet_address !== walletPublicKey.toBase58()) {
      router.push('/my-wallet?redirect=/proposal/create');
      return;
    }
    
    // Reset form state when wallet is properly connected
    setIsDisabled(false);
    setCurrentState('form');
  }, [isWalletConnected, walletPublicKey, user?.wallet_address, router]);

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
      console.log('API Response:', result);
      console.log('User wallet address:', result.proposal.author.wallet_address);
      console.log('Connected wallet:', walletPublicKey?.toBase58());
      
      setProposalId(result.proposal.id);

      // Verify wallet address matches
      if (result.proposal.author.wallet_address !== walletPublicKey?.toBase58()) {
        console.error('Wallet address mismatch:', {
          stored: result.proposal.author.wallet_address,
          connected: walletPublicKey?.toBase58()
        });
        throw new Error('Wallet address mismatch. Please use the correct wallet.');
      }

      // Redirect to proposal page with continue param
      console.log('Redirecting to:', `/proposal/${result.proposal.id}?continue`);
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

      console.log('Transaction signature:', tx);
      
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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Creating proposal in database...</span>
            </div>
          </div>
        );
      case 'onchain':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-3"></div>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Proposal</h1>
          <p className="mt-2 text-gray-600">
            Create a new voting proposal for the community
          </p>
        </div>

        {renderStateMessage()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Column */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Proposal Details</h2>
            <ProposalForm
              onSubmit={handleFormSubmit}
              disabled={isDisabled}
              showSubmit={currentState === 'form'}
            />
          </div>

          {/* Preview Column */}
          <div>
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