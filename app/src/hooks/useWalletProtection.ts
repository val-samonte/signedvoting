'use client';

import { useAtom } from 'jotai';
import { userAtom } from '@/store';
import { isWalletConnectedAtom, walletPublicKeyAtom } from '@/lib/anchor';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useWalletProtection(redirectPath?: string) {
  const [user] = useAtom(userAtom);
  const [isWalletConnected] = useAtom(isWalletConnectedAtom);
  const [walletPublicKey] = useAtom(walletPublicKeyAtom);
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Reset redirect flag when dependencies change
    hasRedirected.current = false;
    
    // Get current URL if not provided
    const currentUrl = redirectPath || (typeof window !== 'undefined' ? window.location.href : '');
    

    // Only check if user is authenticated
    if (!user) {
      return;
    }

    // Check if user has a wallet address registered
    if (!user.wallet_address) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        const redirectUrl = currentUrl ? `/my-wallet?redirect=${encodeURIComponent(currentUrl)}` : '/my-wallet';
        router.push(redirectUrl);
      }
      return;
    }

    // Check if wallet is connected
    if (!isWalletConnected || !walletPublicKey) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        const redirectUrl = currentUrl ? `/my-wallet?redirect=${encodeURIComponent(currentUrl)}` : '/my-wallet';
        router.push(redirectUrl);
      }
      return;
    }

    // Check if connected wallet matches user's registered wallet
    if (walletPublicKey.toBase58() !== user.wallet_address) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        const redirectUrl = currentUrl ? `/my-wallet?redirect=${encodeURIComponent(currentUrl)}` : '/my-wallet';
        router.push(redirectUrl);
      }
      return;
    }

  }, [user, isWalletConnected, walletPublicKey, redirectPath, router]);

  return {
    isProtected: user?.wallet_address && isWalletConnected && walletPublicKey?.toBase58() === user.wallet_address,
    user,
    isWalletConnected,
    walletPublicKey
  };
}
