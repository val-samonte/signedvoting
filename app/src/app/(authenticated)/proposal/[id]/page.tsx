'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProposalForm } from '@/components/ProposalForm';
import { ProposalPreview } from '@/components/ProposalPreview';
import { useAtom } from 'jotai';
import { proposalFormDataAtom } from '@/store/proposal';
import { useAnchor } from '@/hooks/useAnchor';
import { PublicKey } from '@solana/web3.js';

type ProposalData = {
  id: number;
  name: string;
  description: string;
  choices: string[];
  hash: string;
  payerPubkey: string;
  pda?: string;
  author: {
    id: number;
    username: string;
    wallet_address: string;
  };
};

type ProposalState = 'loading' | 'onchain' | 'finalizing' | 'completed' | 'error';

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isWalletConnected, walletPublicKey, program } = useAnchor();
  
  const [formData] = useAtom(proposalFormDataAtom);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [currentState, setCurrentState] = useState<ProposalState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [proposalId, setProposalId] = useState<number | null>(null);

  // Check if we're continuing from a previous step
  const continueParam = searchParams.get('continue');

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      const id = parseInt(resolvedParams.id);
      if (isNaN(id)) {
        setError('Invalid proposal ID');
        setCurrentState('error');
        return;
      }
      setProposalId(id);
      loadProposal(id);
    };
    
    loadParams();
  }, [params]);

  const loadProposal = async (id: number) => {
    try {
      const response = await fetch(`/api/proposal/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load proposal');
      }
      
      const data = await response.json();
      setProposal(data);
      
      if (continueParam) {
        // Remove the continue param from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('continue');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Continue from onchain step
        setCurrentState('onchain');
        setIsDisabled(true);
      } else if (data.pda) {
        // Proposal is already finalized
        setCurrentState('completed');
        setIsDisabled(true);
      } else {
        // Proposal exists but not finalized - show as read-only
        setCurrentState('completed');
        setIsDisabled(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      setCurrentState('error');
    }
  };

  const handleOnchainCreation = async () => {
    if (!proposal || !isWalletConnected || !walletPublicKey) {
      setError('Wallet not connected');
      return;
    }

    setCurrentState('onchain');
    setError(null);

    try {
      // Verify wallet address matches
      if (proposal.author.wallet_address !== walletPublicKey.toBase58()) {
        throw new Error('Wallet address mismatch. Please use the correct wallet.');
      }
      
      // Call the anchor program to create the proposal onchain
      const hashBytes = Buffer.from(proposal.hash, 'hex');
      const uri = `/proposal/${proposal.id}`;
      
      // Create the transaction
      const tx = await program.methods
        .createProposal(uri, Array.from(hashBytes))
        .accounts({
          author: walletPublicKey,
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
    if (!proposal) return;

    try {
      const response = await fetch(`/api/proposal/${proposal.id}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize proposal');
      }

      const result = await response.json();
      
      // Update proposal with PDA
      setProposal(prev => prev ? { ...prev, pda: result.pda } : null);
      setCurrentState('completed');
      
      // Redirect to the proposal page without continue param
      setTimeout(() => {
        router.push(`/proposal/${proposal.id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize proposal');
      setCurrentState('error');
    }
  };

  const renderStateMessage = () => {
    switch (currentState) {
      case 'loading':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Loading proposal...</span>
            </div>
          </div>
        );
      case 'onchain':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
                <span className="text-yellow-800">Ready to create proposal on blockchain...</span>
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
        return proposal?.pda ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 rounded-full mr-3"></div>
              <span className="text-green-800">Proposal created successfully!</span>
            </div>
          </div>
        ) : null;
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
                  setCurrentState('onchain');
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

  if (currentState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Proposal not found</h1>
            <p className="mt-2 text-gray-600">The proposal you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Proposal #{proposal.id}</h1>
          <p className="mt-2 text-gray-600">
            {proposal.pda ? 'Published proposal' : 'Draft proposal'}
          </p>
        </div>

        {renderStateMessage()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Column */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Proposal Details</h2>
            <ProposalForm
              initialData={{
                name: proposal.name,
                description: proposal.description,
                choices: proposal.choices,
              }}
              disabled={isDisabled}
              showSubmit={false}
            />
          </div>

          {/* Preview Column */}
          <div>
            <ProposalPreview
              name={formData.name || proposal.name}
              description={formData.description || proposal.description}
              choices={formData.choices.length > 0 ? formData.choices.filter(choice => choice.trim() !== '') : proposal.choices}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
