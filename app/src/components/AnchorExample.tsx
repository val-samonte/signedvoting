'use client';

import { useAnchor } from '@/hooks/useAnchor';
import { useAtom } from 'jotai';
import { walletAtom } from '@/lib/anchor';

export function AnchorExample() {
  const { program, isWalletConnected, walletPublicKey } = useAnchor();
  const [wallet] = useAtom(walletAtom);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Anchor Integration Status</h3>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">Program ID:</span>{' '}
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {program.programId.toString()}
          </code>
        </div>
        
        <div>
          <span className="font-medium">Wallet Connected:</span>{' '}
          <span className={`px-2 py-1 rounded text-sm ${
            isWalletConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isWalletConnected ? 'Yes' : 'No'}
          </span>
        </div>
        
        {walletPublicKey && (
          <div>
            <span className="font-medium">Wallet Address:</span>{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {walletPublicKey.toString()}
            </code>
          </div>
        )}
        
        <div>
          <span className="font-medium">Provider Type:</span>{' '}
          <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
            {wallet ? 'Connected Wallet' : 'Dummy Wallet (Read-only)'}
          </span>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          The program instance automatically updates when the wallet connects/disconnects.
          When disconnected, a dummy wallet is used for read-only operations.
        </p>
      </div>
    </div>
  );
}
