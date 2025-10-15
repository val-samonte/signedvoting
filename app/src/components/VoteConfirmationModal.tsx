'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { userAtom } from '@/store';
import { FreehandSignature } from './FreehandSignature';
import { VoteButton } from './VoteButton';
import { 
  proposalSignatureAtomFamily,
  processSignature
} from '@/store/proposal';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useAnchor } from '@/hooks/useAnchor';

interface VoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chosenChoice: {
    index: number;
    text: string;
    label: string;
  } | null;
  proposalId: number;
  proposalPda?: string;
  payerPubkey?: string;
}

export function VoteConfirmationModal({ 
  isOpen, 
  onClose, 
  chosenChoice,
  proposalId,
  proposalPda,
  payerPubkey
}: VoteConfirmationModalProps) {
  const [signatureStrokes, setSignatureStrokes] = useAtom(proposalSignatureAtomFamily(proposalId));
  const [user] = useAtom(userAtom);
  const { program } = useAnchor();
  const hasSignature = signatureStrokes.length > 0;
  const [isVoteSubmitted, setIsVoteSubmitted] = useState(false);
  const [signaturePngBlob, setSignaturePngBlob] = useState<Blob | null>(null);

  if (!isOpen || !chosenChoice) return null;

  const handleClose = () => {
    onClose();
  };

  const handleSignatureChange = (strokes: number[][][]) => {
    setSignatureStrokes(strokes);
  };

  const clearSignature = () => {
    setSignatureStrokes([]);
  };

  const downloadSignature = () => {
    if (!signaturePngBlob) return;
    
    const url = URL.createObjectURL(signaturePngBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proposal_${proposalId}_signature_vote.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Clean up the PNG blob
    setSignaturePngBlob(null);
    
    // Close modal after download
    onClose();
  };

  const handleVoteClick = async () => {
    try {
      // Get actual user ID from auth context
      if (!user?.id) {
        throw new Error('User ID is required for signature processing');
      }
      const userId = user.id.toString();
      
      // 1. Get the keypair from PNG file using processSignature
      const results = await processSignature(signatureStrokes, proposalId, userId);
      
      if (!results.keypair) {
        throw new Error('Failed to generate keypair from signature');
      }
      
      // Store the PNG blob for later download
      setSignaturePngBlob(results.pngBlob);
      
      // 2. Get the index of the user choice
      const choiceIndex = chosenChoice.index;
      
      // 3. Get the 2nd level hash (sha256 of the sha256 used to generate the keypair)
      const signatureHash = results.finalSha256; // This is the 2nd level hash
      
      // 4. Get proposal PDA and payer from props
      if (!proposalPda) {
        throw new Error('Proposal PDA is required for voting');
      }
      if (!payerPubkey) {
        throw new Error('Payer public key is required for voting');
      }
      
      // 5. Create the vote transaction and partially sign it
      if (!program) {
        throw new Error('Program not available');
      }
      
      // Create the vote instruction
      const voteInstruction = await program.methods
        .vote(choiceIndex)
        .accounts({
          proposal: new PublicKey(proposalPda),
          voter: results.keypair.publicKey,
          payer: new PublicKey(payerPubkey), // Use the actual proposal payer
        })
        .instruction();
      
      // Create a new transaction and add the instruction
      const transaction = new Transaction().add(voteInstruction);
      
      // Set the recent blockhash and fee payer
      const { blockhash } = await program.provider.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(payerPubkey); // Use the actual proposal payer as fee payer
      
      // Partially sign the transaction with the voter keypair
      transaction.partialSign(results.keypair);
      
      // Serialize the partially signed transaction
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
      });
      
      // Console log the props to be sent as partial transaction
      console.log('=== VOTE TRANSACTION DATA ===');
      console.log('Proposal PDA:', proposalPda);
      console.log('Keypair Public Key:', results.keypair.publicKey.toString());
      console.log('Choice Index:', choiceIndex);
      console.log('2nd Level Hash (signature_hash):', signatureHash);
      console.log('Partially Signed Transaction (base64):', serializedTransaction.toString('base64'));
      console.log('=============================');

      // Send the vote to the backend
      try {
        const response = await fetch(`/api/vote/${proposalId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signatureHash,
            base64Tx: serializedTransaction.toString('base64'),
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log('Vote submitted successfully:', result);
          setIsVoteSubmitted(true);
        } else {
          console.error('Vote submission failed:', result);
          throw new Error(result.error || 'Failed to submit vote');
        }
      } catch (apiError) {
        console.error('Error submitting vote:', apiError);
        throw apiError;
      }
      
      /* COMMENTED OUT - PRESERVE FOR FUTURE USE
      try {
        // Get actual user ID from auth context
        if (!user?.id) {
          throw new Error('User ID is required for signature processing');
        }
        const userId = user.id.toString();
        
        // Process signature and get all results
        const results = await processSignature(signatureStrokes, proposalId, userId);
        
        console.log('Voting with choice:', chosenChoice);
        console.log('Signature SVG:', results.svgString);
        console.log('PNG blob generated:', {
          size: results.pngBlob.size,
          type: results.pngBlob.type
        });
        console.log('SHA256:', results.sha256);
        console.log('Keypair generated:', {
          publicKey: results.keypair?.publicKey.toString(),
          secretKey: results.keypair ? Array.from(results.keypair.secretKey) : null
        });
        console.log('Final SHA256:', results.finalSha256);
        
        // Automatically save a copy of the PNG when voting
        // This ensures the user can derive the same keypair from the saved PNG
        const url = URL.createObjectURL(results.pngBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `proposal_${proposalId}_signature_vote.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('PNG automatically saved for keypair derivation');
        
        // TODO: Implement actual vote submission with results
        
      } catch (error) {
        console.error('Error processing signature:', error);
      }
      */
      
    } catch (error) {
      console.error('Error processing signature:', error);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex flex-col gap-6">
          {!isVoteSubmitted ? (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">You have chosen</h2>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Display the chosen option as a button */}
              <div className="flex items-center space-x-3 p-4 bg-blue-600 text-white rounded-lg border border-blue-600 shadow-sm">
                <span className="flex-shrink-0 w-8 h-8 text-sm font-medium rounded-full flex items-center justify-center bg-white text-blue-600">
                  {chosenChoice.label}.
                </span>
                <span className="text-white">{chosenChoice.text}</span>
              </div>

              {/* FreehandSignature Component */}
              <FreehandSignature 
                width={300}
                height={200}
                value={signatureStrokes}
                onChange={handleSignatureChange}
              />

              {/* Clear Signature Button */}
              <button
                onClick={clearSignature}
                disabled={!hasSignature}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:hover:text-gray-400"
              >
                Clear Signature
              </button>

              {/* Vote Now Button */}
              <VoteButton 
                disabled={!hasSignature}
                onClick={handleVoteClick}
              />
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Vote Submitted</h2>
              </div>

              {/* Display the chosen option as a button */}
              <div className="flex items-center space-x-3 p-4 bg-green-600 text-white rounded-lg border border-green-600 shadow-sm">
                <span className="flex-shrink-0 w-8 h-8 text-sm font-medium rounded-full flex items-center justify-center bg-white text-green-600">
                  {chosenChoice.label}.
                </span>
                <span className="text-white">{chosenChoice.text}</span>
              </div>

              {/* Display the signature PNG */}
              {signaturePngBlob && (
                <div className="flex justify-center">
                  <img 
                    src={URL.createObjectURL(signaturePngBlob)} 
                    alt="Vote Signature" 
                    className="border border-gray-300 rounded-lg"
                    style={{ width: 300, height: 200 }}
                  />
                </div>
              )}

              {/* Download Signature Button */}
              <button
                onClick={downloadSignature}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Download Vote Signature
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
