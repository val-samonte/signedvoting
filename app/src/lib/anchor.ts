import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { atom } from 'jotai';
import IDL from '../generated/anchor/signedvoting.json';
import { Signedvoting } from '../generated/anchor/signedvoting';

// Define Wallet interface since it's not exported from @solana/web3.js
interface Wallet {
  publicKey: PublicKey;
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
}

// Program ID from the IDL
export const PROGRAM_ID = new PublicKey(IDL.address);

// Devnet RPC endpoint
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Create a dummy wallet for when user is disconnected
const createDummyWallet = (): Wallet => {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      throw new Error('Wallet not connected');
    },
    signAllTransactions: async (txs: any[]) => {
      throw new Error('Wallet not connected');
    },
  };
};

// Connection atom
export const connectionAtom = atom(new Connection(DEVNET_RPC, 'confirmed'));

// Wallet atom - this will be set by the wallet provider
export const walletAtom = atom<Wallet | null>(null);

// Anchor provider atom that reacts to wallet changes
export const anchorProviderAtom = atom((get) => {
  const connection = get(connectionAtom);
  const wallet = get(walletAtom);
  
  // Use connected wallet or dummy wallet for read-only operations
  const walletToUse = wallet || createDummyWallet();
  
  return new AnchorProvider(
    connection,
    walletToUse,
    {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    }
  );
});

// Program atom that automatically updates when wallet changes
export const programAtom = atom((get) => {
  const provider = get(anchorProviderAtom);
  return new Program<Signedvoting>(IDL as Signedvoting, provider);
});

// Helper function to check if wallet is connected
export const isWalletConnectedAtom = atom((get) => {
  const wallet = get(walletAtom);
  return wallet !== null;
});

// Helper function to get the current wallet's public key
export const walletPublicKeyAtom = atom((get) => {
  const wallet = get(walletAtom);
  return wallet?.publicKey || null;
});

// Export types for convenience
export type { Signedvoting };
export { IDL };
