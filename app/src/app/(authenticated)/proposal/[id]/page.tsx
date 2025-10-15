'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProposalForm } from '@/components/ProposalForm';
import { ProposalPreview } from '@/components/ProposalPreview';
import { useAtom } from 'jotai';
import { proposalFormDataAtom } from '@/store/proposal';
import { useAnchor } from '@/hooks/useAnchor';
import { isWalletConnectedAtom, walletPublicKeyAtom } from '@/lib/anchor';
import { userAtom } from '@/store';
// import { useWalletProtection } from '@/hooks/useWalletProtection';
import { PublicKey } from '@solana/web3.js';
import { PauseIcon } from '@phosphor-icons/react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { LoadFundsModal } from '@/components/LoadFundsModal';
import { trimAddress, computeProposalHash, calculateVoteAccountRentExemptMinimum } from '@/lib/utils';

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
  const [user] = useAtom(userAtom);
  const [isWalletConnectedState] = useAtom(isWalletConnectedAtom);
  const [walletPublicKeyState] = useAtom(walletPublicKeyAtom);
  
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
  const [onchainHash, setOnchainHash] = useState<string | null>(null);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [isHashLoading, setIsHashLoading] = useState(false);
  const [isProposalFinalized, setIsProposalFinalized] = useState(false);
  const [fundsAccountBalance, setFundsAccountBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [rentExemptMinimum, setRentExemptMinimum] = useState<number | null>(null);
  const [isRentLoading, setIsRentLoading] = useState(false);
  const [isLoadFundsModalOpen, setIsLoadFundsModalOpen] = useState(false);
  const isLoadingRef = useRef(false);

  // We'll handle wallet protection manually after loading the proposal
  // const { isProtected } = useWalletProtection();

  // No automatic wallet protection - we'll handle it manually after loading proposal

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

  const computeHashFromProposal = async (proposal: ProposalData) => {
    try {
      const hash = await computeProposalHash(proposal.name, proposal.description, proposal.choices);
      setComputedHash(hash);
    } catch (err) {
      console.error('Failed to compute hash:', err);
      setComputedHash(null);
    }
  };

  const fetchOnchainHash = async (pda: string) => {
    if (!program) return;
    
    setIsHashLoading(true);
    try {
      const proposalPubkey = new PublicKey(pda);
      const onchainProposal = await program.account.proposal.fetch(proposalPubkey);
      const hashBytes = onchainProposal.hash as number[];
      const hashHex = Buffer.from(hashBytes).toString('hex');
      setOnchainHash(hashHex);
    } catch (err) {
      console.error('Failed to fetch onchain hash:', err);
      setOnchainHash(null);
    } finally {
      setIsHashLoading(false);
    }
  };

  const fetchFundsAccountBalance = async (payerPubkey: string) => {
    if (!program) return;
    
    setIsBalanceLoading(true);
    try {
      const payerPublicKey = new PublicKey(payerPubkey);
      const balance = await program.provider.connection.getBalance(payerPublicKey);
      // Convert lamports to SOL
      const balanceInSOL = balance / 1e9;
      setFundsAccountBalance(balanceInSOL);
    } catch (err) {
      console.error('Failed to fetch funds account balance:', err);
      setFundsAccountBalance(null);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  const fetchRentExemptMinimum = async () => {
    if (!program) return;
    
    setIsRentLoading(true);
    try {
      const minimum = await calculateVoteAccountRentExemptMinimum(program.provider.connection);
      setRentExemptMinimum(minimum);
    } catch (err) {
      console.error('Failed to fetch rent-exempt minimum:', err);
      setRentExemptMinimum(null);
    } finally {
      setIsRentLoading(false);
    }
  };

  const handleLoadFundsSuccess = async () => {
    // Refresh the funds account balance after successful funding
    if (proposal) {
      await fetchFundsAccountBalance(proposal.payerPubkey);
    }
  };

  const loadProposal = async (id: number) => {
    
    // Prevent multiple loads if we're already loading or in signing process
    if (isLoadingRef.current || (hasLoadedProposal && isInSigningProcess)) {
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
      
      // Compute hash from proposal data
      await computeHashFromProposal(data);
      
      // Fetch funds account balance and rent-exempt minimum
      await Promise.all([
        fetchFundsAccountBalance(data.payerPubkey),
        fetchRentExemptMinimum()
      ]);
      
      if (data.pda) {
        // Proposal is already finalized - fetch onchain hash
        setCurrentState('draft');
        setIsDisabled(true);
        setIsProposalFinalized(true);
        await fetchOnchainHash(data.pda);
      } else {
        // Proposal exists but not finalized - check if we should auto-resume
        const continueParam = searchParams.get('continue');
        const urlHasContinue = window.location.href.includes('continue');
        
        if (continueParam || urlHasContinue) {
          // Auto-resume with ?continue
          setCurrentState('signing');
          setIsDisabled(true);
          setHasProcessedContinue(true);
          setIsInSigningProcess(true);
        } else {
          // Show as read-only with Continue button
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
      // Use computed hash instead of database hash
      if (!computedHash) {
        throw new Error('Hash computation failed');
      }
      const hashBytes = Buffer.from(computedHash, 'hex');
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
      
      // Check if the account already exists (proposal already on-chain)
      const isAccountAlreadyExists = errorMessage.includes('already in use') ||
                                    errorMessage.includes('Account already in use') ||
                                    (errorMessage.includes('Allocate: account') && errorMessage.includes('already in use')) ||
                                    (errorMessage.includes('custom program error: 0x0') && errorMessage.includes('already in use'));
      
      if (isUserCancelled) {
        setUserCancelledTx(true);
        setCurrentState('draft'); // Go back to draft state to show yellow card
        setError(null); // Clear any error message
        setIsInSigningProcess(false); // Reset signing process flag
      } else if (isAccountAlreadyExists) {
        // Account already exists, automatically finalize
        console.log('Proposal account already exists on-chain, proceeding to finalize...');
        console.log('Error message that triggered auto-finalize:', errorMessage);
        setCurrentState('finalizing');
        try {
          await handleFinalization();
        } catch (finalizeError) {
          console.error('Failed to finalize after detecting existing account:', finalizeError);
          setError('Failed to finalize proposal. Please try again.');
          setCurrentState('error');
        }
      } else {
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
      return null;
    }

    // Check if ?continue is present in URL
    const continueParam = searchParams.get('continue');
    const hasContinueParam = continueParam !== null;

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
      
      case 'signing':
        // Show blue card when user is signing transaction (Step 2)
        // Check if wallet is connected to show appropriate message
        if (!isWalletConnected) {
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Waiting for wallet connection...</span>
              </div>
            </div>
          );
        }
        
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Proposal is pending, awaiting to sign transaction</span>
            </div>
          </div>
        );
      
      case 'finalizing':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Finalizing proposal...</span>
            </div>
          </div>
        );
      
      case 'draft':
        // Always show yellow card with Continue button when in draft state
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <PauseIcon className="w-4 h-4 text-yellow-600 mr-3" />
                <span className="text-yellow-800">Ready to create the blockchain account...</span>
              </div>
              <button
                onClick={() => {
                  setUserCancelledTx(false);
                  handleOnchainCreation();
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors cursor-pointer"
              >
                Continue
              </button>
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
                  setCurrentState('signing');
                  setError(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
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

  // No wallet protection for finalized proposals - they are public

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

  // If proposal is finalized (has PDA), show the new layout
  if (proposal.pda) {
    const isTampered = onchainHash && computedHash && computedHash !== onchainHash;
    
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col xl:flex-row gap-8 xl:min-h-[calc(100vh-4rem)]">
            {/* Main Body - takes remaining space */}
            <div className="flex-1 flex flex-col xl:min-h-[calc(100vh-4rem)]">
              {/* Proposal Name */}
              <h1 className="text-3xl font-bold text-gray-900 flex-none mb-6">
                {proposal.name}
              </h1>

              {/* Description - takes available space on xl, normal flow below */}
              <div className="xl:flex-1 xl:overflow-y-auto xl:mb-6 mb-6">
                {proposal.description ? (
                  <MarkdownRenderer>{proposal.description}</MarkdownRenderer>
                ) : (
                  <p className="text-gray-500 italic">No description provided</p>
                )}
              </div>

              {/* Choices - pushed to bottom on xl, normal flow below */}
              <div className="xl:flex-none">
                <div className="flex flex-col xl:flex-row gap-4">
                  {proposal.choices.map((choice, index) => {
                    const choiceLabel = String.fromCharCode(97 + index); // a, b, c, etc.
                    return (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm flex-1"
                      >
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center justify-center">
                          {choiceLabel}.
                        </span>
                        <span className="text-gray-900">{choice}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Details Panel - fixed width on xl, full width below */}
            <div className="xl:w-80 w-full">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full xl:sticky xl:top-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Details</h2>
                
                <div className="space-y-4">
                  {/* Author */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Author</label>
                    <p className="text-gray-900">{proposal.author.username}</p>
                  </div>

                  {/* Funds Account */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Funds Account</label>
                    <div className="flex items-center justify-between">
                      <a
                        href={`https://solscan.io/account/${proposal.payerPubkey}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-mono text-sm cursor-pointer"
                      >
                        {trimAddress(proposal.payerPubkey)}
                      </a>
                      <div className="flex items-center">
                        {isBalanceLoading || isRentLoading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                            <span className="text-sm text-gray-500">Loading...</span>
                          </div>
                        ) : fundsAccountBalance !== null && rentExemptMinimum !== null ? (
                          <span className={`text-sm font-medium ${
                            fundsAccountBalance < rentExemptMinimum ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {fundsAccountBalance.toFixed(6)} SOL
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Failed to load</span>
                        )}
                      </div>
                    </div>
                    {fundsAccountBalance !== null && rentExemptMinimum !== null && fundsAccountBalance < rentExemptMinimum && (
                      <p className="text-xs text-red-500 mt-1">
                        Insufficient balance for vote account creation (minimum: {rentExemptMinimum.toFixed(6)} SOL per vote)
                      </p>
                    )}
                    {isWalletConnected && (
                      <button 
                        onClick={() => setIsLoadFundsModalOpen(true)}
                        className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Load Funds Account
                      </button>
                    )}
                  </div>

                  {/* Account (PDA) */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Proposal Onchain Account</label>
                    <a
                      href={`https://solscan.io/account/${proposal.pda}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-mono text-sm block cursor-pointer"
                    >
                      {trimAddress(proposal.pda)}
                    </a>
                  </div>

                  {/* Hash */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Hash</label>
                    <div className="space-y-2">
                      {isHashLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-sm text-gray-500">Loading...</span>
                        </div>
                      ) : onchainHash && computedHash ? (
                        <div>
                          <p className={`font-mono text-sm break-all ${isTampered ? 'text-red-500' : 'text-gray-900'}`}>
                            {onchainHash}
                          </p>
                          {isTampered && (
                            <p className="text-red-500 text-sm font-medium">TAMPERED</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Failed to load</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Load Funds Modal */}
        {proposal && rentExemptMinimum && (
          <LoadFundsModal
            isOpen={isLoadFundsModalOpen}
            onClose={() => setIsLoadFundsModalOpen(false)}
            fundsAccountAddress={proposal.payerPubkey}
            rentExemptMinimum={rentExemptMinimum}
            onSuccess={handleLoadFundsSuccess}
          />
        )}
      </div>
    );
  }

  // Original layout for non-finalized proposals
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
