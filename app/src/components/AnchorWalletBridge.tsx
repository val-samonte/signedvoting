'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAtom } from 'jotai';
import { walletAtom } from '@/lib/anchor';

export function AnchorWalletBridge({ children }: { children: React.ReactNode }) {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [, setWallet] = useAtom(walletAtom);

  useEffect(() => {
    if (publicKey && signTransaction && signAllTransactions) {
      // Wallet is connected, set the wallet in our atom
      setWallet({
        publicKey,
        signTransaction,
        signAllTransactions,
      });
    } else {
      // Wallet is disconnected, clear the wallet atom
      setWallet(null);
    }
  }, [publicKey, signTransaction, signAllTransactions, setWallet]);

  return <>{children}</>;
}
