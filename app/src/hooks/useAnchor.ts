import { useAtom } from 'jotai';
import { 
  programAtom, 
  anchorProviderAtom, 
  isWalletConnectedAtom, 
  walletPublicKeyAtom,
  connectionAtom 
} from '@/lib/anchor';

export function useAnchor() {
  const [program] = useAtom(programAtom);
  const [provider] = useAtom(anchorProviderAtom);
  const [isWalletConnected] = useAtom(isWalletConnectedAtom);
  const [walletPublicKey] = useAtom(walletPublicKeyAtom);
  const [connection] = useAtom(connectionAtom);

  return {
    program,
    provider,
    connection,
    isWalletConnected,
    walletPublicKey,
  };
}
