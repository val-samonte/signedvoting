'use client';

import { useState, useEffect, useRef } from 'react';
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

type ProposalState = 'loading' | 'signing' | 'finalizing' | 'draft' | 'error';

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
  const [hasProcessedContinue, setHasProcessedContinue] = useState(false);
  const [userCancelledTx, setUserCancelledTx] = useState(false);
  const [isInSigningProcess, setIsInSigningProcess] = useState(false);
  const [hasLoadedProposal, setHasLoadedProposal] = useState(false);
  const isLoadingRef = useRef(false);

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
      
      // Don't load proposal if we're already in signing process
      if (!isInSigningProcess) {
        loadProposal(id);
      } else {
        console.log('STATE CHANGE: skipping loadProposal - already in signing process');
      }
    };
    
    loadParams();
  }, [params, isInSigningProcess]);

  // Listen for wallet connection when ?continue is processed
  useEffect(() => {
    if (hasProcessedContinue && isInSigningProcess && isWalletConnected && walletPublicKey && program) {
      // Remove ?continue from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('continue');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Call handleOnchainCreation
      handleOnchainCreation();
    }
  }, [hasProcessedContinue, isInSigningProcess, isWalletConnected, walletPublicKey, program]);

  const loadProposal = async (id: number) => {
    console.log('STATE CHANGE: loadProposal called', JSON.stringify({
      hasLoadedProposal,
      isInSigningProcess,
      currentState,
      isLoadingRef: isLoadingRef.current
    }, null, 2));
    
    // Prevent multiple loads if we're already loading or in signing process
    if (isLoadingRef.current || (hasLoadedProposal && isInSigningProcess)) {
      console.log('STATE CHANGE: skipping loadProposal - already loading or in signing process');
      return;
    }
    
    isLoadingRef.current = true;
    
    try {
      const response = await fetch(`/api/proposal/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load proposal');
      }
      
      const data = await response.json();
      setProposal(data);
      setHasLoadedProposal(true);
      
      if (data.pda) {
        // Proposal is already finalized
        setCurrentState('draft');
        setIsDisabled(true);
      } else {
        // Proposal exists but not finalized - check if we should auto-resume
        const continueParam = searchParams.get('continue');
        const urlHasContinue = window.location.href.includes('continue');
        
        if (continueParam || urlHasContinue) {
          // Auto-resume with ?continue
          console.log('STATE CHANGE: ?continue detected, setting to signing');
          setCurrentState('signing');
          setIsDisabled(true);
          setHasProcessedContinue(true);
          setIsInSigningProcess(true);
        } else {
          // Show as read-only with Continue button
          console.log('STATE CHANGE: no ?continue, setting to draft', {
            hasLoadedProposal,
            isInSigningProcess,
            currentState,
            stackTrace: new Error().stack
          });
          setCurrentState('draft');
          setIsDisabled(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      setCurrentState('error');
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleOnchainCreation = async () => {
    if (!proposal || !isWalletConnected || !walletPublicKey) {
      setError('Wallet not connected');
      return;
    }

    console.log('STATE CHANGE: setting to signing');
    setCurrentState('signing');
    setError(null);
    setUserCancelledTx(false); // Reset cancellation flag
    setIsInSigningProcess(true);

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

      
      // Move to finalization step
      console.log('STATE CHANGE: setting to finalizing');
      setCurrentState('finalizing');
      await handleFinalization();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create onchain proposal';
      
      // Check if user cancelled the transaction
      const isUserCancelled = errorMessage.includes('User rejected') || 
                             errorMessage.includes('User cancelled') ||
                             errorMessage.includes('User declined') ||
                             errorMessage.includes('cancelled') ||
                             errorMessage.includes('rejected');
      
      if (isUserCancelled) {
        console.log('STATE CHANGE: user cancelled, setting to draft');
        setUserCancelledTx(true);
        setCurrentState('draft'); // Go back to draft state to show yellow card
        setError(null); // Clear any error message
        setIsInSigningProcess(false); // Reset signing process flag
      } else {
        console.log('STATE CHANGE: error occurred, setting to error');
        setError(errorMessage);
        setCurrentState('error');
      }
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
      console.log('STATE CHANGE: finalization complete, setting to draft');
      setCurrentState('draft');
      setIsInSigningProcess(false); // Reset signing process flag
      
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
    // If proposal is finalized (has PDA), don't show any status card
    if (proposal?.pda) {
      console.log('INFO PANEL: Hidden (proposal finalized)');
      return null;
    }

    // Check if ?continue is present in URL
    const continueParam = searchParams.get('continue');
    const hasContinueParam = continueParam !== null;
    
    console.log('INFO PANEL STATE:', JSON.stringify({
      currentState,
      hasContinueParam,
      isWalletConnected,
      isInSigningProcess,
      hasProcessedContinue,
      userCancelledTx,
      proposalPda: proposal?.pda
    }, null, 2));

    switch (currentState) {
      case 'loading':
        console.log('INFO PANEL: Blue (loading)');
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Loading proposal...</span>
            </div>
          </div>
        );
      
      case 'signing':
        // Show blue card when user is signing transaction (Step 2)
        // Check if wallet is connected to show appropriate message
        if (!isWalletConnected) {
          console.log('INFO PANEL: Blue (waiting for wallet)');
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Waiting for wallet connection...</span>
              </div>
            </div>
          );
        }
        
        console.log('INFO PANEL: Blue (signing transaction)');
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Proposal is pending, awaiting to sign transaction</span>
            </div>
          </div>
        );
      
      case 'finalizing':
        console.log('INFO PANEL: Green (finalizing)');
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-3"></div>
              <span className="text-green-800">Finalizing proposal...</span>
            </div>
          </div>
        );
      
      case 'draft':
        // Always show yellow card with Continue button when in draft state
        console.log('INFO PANEL: Yellow (draft - ready for Continue)');
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-600 rounded-full mr-3"></div>
                <span className="text-yellow-800">Ready to create the blockchain account...</span>
              </div>
              <button
                onClick={() => {
                  setUserCancelledTx(false);
                  handleOnchainCreation();
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );
      
      case 'error':
        console.log('INFO PANEL: Red (error)');
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-600 rounded-full mr-3"></div>
                <span className="text-red-800">Error: {error}</span>
              </div>
              <button
                onClick={() => {
                  setCurrentState('signing');
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
