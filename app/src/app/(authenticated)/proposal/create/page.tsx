'use client';

import { useAtom } from 'jotai';
import { userAtom } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ProposalForm } from './ProposalForm';

export default function CreateProposalPage() {
  const [user] = useAtom(userAtom);
  const router = useRouter();
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    if (user) {
      // Check if user has wallet_address
      if (!user.wallet_address) {
        router.push('/my-wallet?redirect=/proposal/create');
        return;
      }
      
      // Check if wallet is connected and matches user's wallet_address
      if (!connected || !publicKey || publicKey.toString() !== user.wallet_address) {
        router.push('/my-wallet?redirect=/proposal/create');
        return;
      }
    }
  }, [user, connected, publicKey, router]);

  // Show loading while checking authentication
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting to wallet setup
  if (!user.wallet_address || !connected || !publicKey || publicKey.toString() !== user.wallet_address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecting to wallet setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Proposal</h1>
        <p className="text-gray-600 mt-2">Create a new governance proposal for the community to vote on.</p>
      </div>
      
      <ProposalForm />
    </div>
  );
}
