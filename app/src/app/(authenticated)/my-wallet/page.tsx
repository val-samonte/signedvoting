'use client';

import { useAtom } from 'jotai';
import { userAtom, walletBalanceAtom, updateUserAtom } from '@/store';
import { useWallet } from '@solana/wallet-adapter-react';
import { isUserWalletConnectedAtom, userWalletAddressAtom } from '@/lib/anchor';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MyWalletPage() {
  const [user] = useAtom(userAtom);
  const [walletBalance, setWalletBalance] = useAtom(walletBalanceAtom);
  const [, updateUser] = useAtom(updateUserAtom);
  const [isSigning, setIsSigning] = useState(false);
  const [isUserWalletConnected] = useAtom(isUserWalletConnectedAtom);
  const [, setUserWalletAddress] = useAtom(userWalletAddressAtom);
  
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const connection = new Connection('https://api.devnet.solana.com');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch wallet balance when connected
  useEffect(() => {
    if (publicKey) {
      const fetchBalance = async () => {
        try {
          const balance = await connection.getBalance(publicKey);
          setWalletBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          // Error fetching balance
        }
      };
      fetchBalance();
    } else {
      setWalletBalance(null);
    }
  }, [publicKey, setWalletBalance]);

  // Set user's wallet address for comparison
  useEffect(() => {
    if (user?.wallet_address) {
      setUserWalletAddress(user.wallet_address);
    } else {
      setUserWalletAddress(null);
    }
  }, [user?.wallet_address, setUserWalletAddress]);

  // Handle redirect after successful wallet linking
  useEffect(() => {
    const redirectParam = searchParams.get('redirect');
    const isCorrectWallet = connected && isUserWalletConnected;
    
    
    if (redirectParam && isCorrectWallet && user?.wallet_address) {
      // Remove the redirect parameter and navigate
      const url = new URL(window.location.href);
      url.searchParams.delete('redirect');
      window.history.replaceState({}, '', url.toString());
      router.push(redirectParam);
    }
  }, [connected, isUserWalletConnected, user?.wallet_address, searchParams, router]);

  const handleSignMessage = async () => {
    if (!signMessage || !user || !publicKey || !user.id || !user.username) {
      alert('User data is incomplete. Please try logging in again.');
      return;
    }
    
    setIsSigning(true);
    try {
      const message = `Sign this to prove that you own ${user.id} ${user.username}`;
      const encodedMessage = new TextEncoder().encode(message);
      const sig = await signMessage(encodedMessage);
      
      // Send signature to backend for wallet linking
      const response = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: Array.from(sig),
          message: message,
          walletAddress: publicKey.toString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update user state with new wallet address
        updateUser(result.user);
      } else {
        const error = await response.json();
        alert('Wallet verification failed: ' + error.error);
      }
    } catch (error) {
      alert('Error signing message. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };


  // Case 1: User has no linked wallet
  if (!user?.wallet_address) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <WalletIcon size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Link Your Wallet</h2>
            <p className="text-gray-600 mb-8">
              You have not linked your wallet yet to your account! <br />
              Connect your wallet to link it to your account.
            </p>
            
            {!connected ? (
              <div className="space-y-4">
                <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !px-6 !py-3 !text-white !font-medium" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2 text-green-700">
                    <CheckCircleIcon size={20} />
                    <span className="font-medium">Wallet Connected!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    Connected: {publicKey?.toString()}
                  </p>
                </div>
                
                <div className="space-y-4">
                  {user?.id && user?.username ? (
                    <button
                      onClick={handleSignMessage}
                      disabled={isSigning}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSigning ? 'Signing...' : 'Link Wallet'}
                    </button>
                  ) : (
                    <div className="text-red-600 text-sm">
                      User data is incomplete. Please try logging in again.
                    </div>
                  )}
                  
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Links */}
        {connected && (
          <div className="text-center mt-6">
            <button
              onClick={disconnect}
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline cursor-pointer"
            >
              Disconnect Wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  // Case 2 & 3: User has linked wallet
  const isCorrectWallet = connected && isUserWalletConnected;
  const isWrongWallet = connected && !isUserWalletConnected;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <WalletIcon size={64} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Wallet</h2>
          
          {!connected ? (
            // Case 2a: Wallet disconnected
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">
                Your linked wallet is disconnected. Connect it to view your balance.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Linked wallet: {user.wallet_address}
              </p>
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg !px-6 !py-3 !text-white !font-medium" />
            </div>
          ) : isWrongWallet ? (
            // Case 2b: Wrong wallet connected
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 text-red-700 mb-2">
                  <WarningCircleIcon size={20} />
                  <span className="font-medium">Wrong Wallet Connected!</span>
                </div>
                <p className="text-sm text-red-600">
                  You have connected a wrong wallet! Your linked wallet is {user?.wallet_address}. 
                  Please make sure to switch to this wallet address!
                </p>
              </div>
            </div>
          ) : (
            // Case 3: Correct wallet connected
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 text-green-700 mb-2">
                  <CheckCircleIcon size={20} />
                  <span className="font-medium">You successfully linked your wallet!</span>
                </div>
                <p className="text-sm text-green-600">
                  Connected: {publicKey?.toString()}
                </p>
              </div>
              
              {walletBalance !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">SOL Balance</h3>
                  <p className="text-2xl font-bold text-blue-700">
                    {walletBalance.toFixed(4)} SOL
                  </p>
                </div>
              )}
              
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation Links */}
      {connected && (
        <div className="text-center mt-6">
          <button
            onClick={disconnect}
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline cursor-pointer"
          >
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
