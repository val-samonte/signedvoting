'use client';

import { useAtom } from 'jotai';
import { userAtom } from '@/store';
import { isWalletConnectedAtom, walletPublicKeyAtom, isUserWalletConnectedAtom, userWalletAddressAtom } from '@/lib/anchor';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useWalletProtection(redirectPath?: string, disabled?: boolean) {
  const [user] = useAtom(userAtom);
  const [isWalletConnected] = useAtom(isWalletConnectedAtom);
  const [walletPublicKey] = useAtom(walletPublicKeyAtom);
  const [isUserWalletConnected] = useAtom(isUserWalletConnectedAtom);
  const [, setUserWalletAddress] = useAtom(userWalletAddressAtom);
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Set user's wallet address for comparison
  useEffect(() => {
    if (user?.wallet_address) {
      setUserWalletAddress(user.wallet_address);
    } else {
      setUserWalletAddress(null);
    }
  }, [user?.wallet_address, setUserWalletAddress]);

  useEffect(() => {
    // Reset redirect flag when dependencies change
    hasRedirected.current = false;
    
    // If disabled, don't perform any checks
    if (disabled) {
      return;
    }
    
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

    // Check if connected wallet matches user's registered wallet using the new atom
    if (!isUserWalletConnected) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        const redirectUrl = currentUrl ? `/my-wallet?redirect=${encodeURIComponent(currentUrl)}` : '/my-wallet';
        router.push(redirectUrl);
      }
      return;
    }

  }, [user, isWalletConnected, walletPublicKey, isUserWalletConnected, redirectPath, router, disabled]);

  return {
    isProtected: disabled ? true : (user?.wallet_address && isWalletConnected && isUserWalletConnected),
    user,
    isWalletConnected,
    walletPublicKey
  };
}
