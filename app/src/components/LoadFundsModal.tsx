'use client';

import { useState, useEffect } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useAnchor } from '@/hooks/useAnchor';
import { SpinnerIcon } from '@phosphor-icons/react';
import { calculateTransferFee } from '@/lib/utils';

interface LoadFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundsAccountAddress: string;
  rentExemptMinimum: number;
  onSuccess?: () => void;
}

export function LoadFundsModal({ 
  isOpen, 
  onClose, 
  fundsAccountAddress, 
  rentExemptMinimum,
  onSuccess 
}: LoadFundsModalProps) {
  const [numberOfVotes, setNumberOfVotes] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionFee, setTransactionFee] = useState<number>(0);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const { program } = useAnchor();

  const totalAmount = numberOfVotes * rentExemptMinimum;
  const totalTransactionFee = transactionFee * numberOfVotes;
  const totalWithFee = totalAmount + totalTransactionFee;

  // Calculate transaction fee when numberOfVotes or rentExemptMinimum changes
  useEffect(() => {
    const calculateFee = async () => {
      if (!program?.provider?.connection || !program?.provider?.wallet?.publicKey || numberOfVotes <= 0) {
        setTransactionFee(0);
        return;
      }

      setIsFeeLoading(true);
      try {
        const fromPubkey = program.provider.wallet.publicKey;
        const toPubkey = new PublicKey(fundsAccountAddress);
        const totalLamports = Math.ceil(totalAmount * 1e9);
        
        const fee = await calculateTransferFee(
          program.provider.connection,
          fromPubkey,
          toPubkey,
          totalLamports
        );
        
        setTransactionFee(fee);
      } catch (err) {
        console.error('Failed to calculate transaction fee:', err);
        setTransactionFee(0.000005); // Fallback fee
      } finally {
        setIsFeeLoading(false);
      }
    };

    calculateFee();
  }, [numberOfVotes, rentExemptMinimum, program?.provider?.connection, program?.provider?.wallet?.publicKey, fundsAccountAddress, totalAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!program || !program.provider || !program.provider.wallet || !program.provider.sendAndConfirm || numberOfVotes <= 0) {
      setError('Wallet not connected or invalid number of votes');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fromPubkey = program.provider.wallet.publicKey;
      const toPubkey = new PublicKey(fundsAccountAddress);
      
      // Calculate total lamports needed
      const totalLamports = Math.ceil(totalAmount * 1e9); // Convert SOL to lamports
      
      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: totalLamports,
        })
      );

      // Send and confirm transaction
      const signature = await program.provider.sendAndConfirm(transaction);
      
      console.log('Transfer successful:', signature);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal
      onClose();
      
    } catch (err) {
      console.error('Transfer failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setNumberOfVotes(1);
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Load Funds Account</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="votes" className="block text-sm font-medium text-gray-700 mb-2">
              Enter how much votes you would like to fund
            </label>
            <input
              type="number"
              id="votes"
              min="1"
              value={numberOfVotes}
              onChange={(e) => setNumberOfVotes(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              required
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Cost:</span>
                <span>{totalAmount.toFixed(6)} SOL for {numberOfVotes} vote{numberOfVotes > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction fees:</span>
                <span className="flex items-center">
                  {isFeeLoading ? (
                    <SpinnerIcon className="h-3 w-3 mr-1 animate-spin" />
                  ) : null}
                  {totalTransactionFee.toFixed(6)} SOL
                </span>
              </div>
              <div className="flex justify-between font-medium text-gray-900 border-t border-gray-200 pt-2 mt-2">
                <span>Total from wallet:</span>
                <span>{totalWithFee.toFixed(6)} SOL</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || numberOfVotes <= 0 || isFeeLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <SpinnerIcon className="h-4 w-4 text-white mr-2 animate-spin" />
                  Loading...
                </div>
              ) : (
                'Load Funds'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
