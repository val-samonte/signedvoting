'use client';

import { useState, useRef } from 'react';
import { useAtom } from 'jotai';
import { userAtom } from '@/store';
import { getSha256FromBlob, getKeypairFromUserAndBlob, getFinalSha256 } from '@/store/proposal';
import { useAtomValue } from 'jotai';
import { programAtom, connectionAtom } from '@/lib/anchor';
import { PublicKey } from '@solana/web3.js';
import { trimAddress } from '@/lib/utils';

interface VoteAccount {
  address: string;
  proposalId: string;
  choice: number;
}

interface ProposalInfo {
  id: number;
  name: string;
  choices: string[];
}

export default function VerifyVotePage() {
  const [user] = useAtom(userAtom);
  const program = useAtomValue(programAtom);
  const connection = useAtomValue(connectionAtom);
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteAccount, setVoteAccount] = useState<VoteAccount | null>(null);
  const [proposalInfo, setProposalInfo] = useState<ProposalInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploadedFile(file);
    setError(null);
    setVoteAccount(null);
    setProposalInfo(null);
    setIsProcessing(true);

    try {
      // Get actual user ID from auth context
      if (!user?.id) {
        throw new Error('User ID is required for vote verification');
      }
      const userId = user.id.toString();
      
      // Process the uploaded PNG file to get keypair
      const sha256 = await getSha256FromBlob(file);
      const keypair = await getKeypairFromUserAndBlob(userId, file);
      const finalSha256 = await getFinalSha256(sha256);

      if (!keypair) {
        throw new Error('Failed to generate keypair from PNG file');
      }

      console.log('Generated keypair:', {
        publicKey: keypair.publicKey.toString(),
        finalSha256
      });

      // Query blockchain for vote accounts using the public key
      const voteAccounts = await connection.getProgramAccounts(program.programId, {
        filters: [
          {
            memcmp: {
              offset: 8 + 1, // Skip discriminator(8) + bump(1) to get to voter field
              bytes: keypair.publicKey.toBase58()
            }
          }
        ]
      });

      if (voteAccounts.length === 0) {
        throw new Error('No vote found for this keypair');
      }

      // Decode the vote account data using Anchor's coder
      const voteAccountData = voteAccounts[0];
      const voteAccount = program.coder.accounts.decode('vote', voteAccountData.account.data);
      
      // Get the proposal ID from the vote account
      const proposalIdPubkey = voteAccount.proposalId.toBase58();

      setVoteAccount({
        address: voteAccountData.pubkey.toBase58(),
        proposalId: proposalIdPubkey,
        choice: voteAccount.choice
      });

      // Query the database for the proposal using the PDA
      const response = await fetch('/api/proposal');
      if (!response.ok) {
        throw new Error('Failed to fetch proposals');
      }
      
      const data = await response.json();
      const proposal = data.proposals.find((p: any) => p.pda === proposalIdPubkey);
      
      if (!proposal) {
        throw new Error('Proposal not found in database');
      }

      setProposalInfo({
        id: proposal.id,
        name: proposal.name,
        choices: proposal.choices
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      console.error('Verification error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="md:bg-white md:shadow-md md:p-6 rounded-none md:rounded-lg">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Verify My Vote
            </h1>
            
            <p className="text-gray-600 mb-6">
              Upload the signature that you downloaded when voting to verify your vote on the blockchain.
            </p>

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Vote Signature
            </label>
            
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleClick}
            >
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragOver ? 'Drop your PNG file here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-gray-500">PNG files only</p>
                </div>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,image/png"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-3"></div>
                <span className="text-blue-700">Processing PNG file and querying blockchain...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Vote Verification Results */}
          {voteAccount && proposalInfo && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Vote Verification Results</h2>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-green-700 font-medium">Vote verified successfully!</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column - Details */}
                  <div className="flex-auto space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Proposal:</span>
                      <a 
                        href={`/proposal/${proposalInfo.id}`}
                        className="ml-2 text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {proposalInfo.name}
                      </a>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Vote Account:</span>
                      <a 
                        href={`https://solscan.io/account/${voteAccount.address}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 font-mono text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {trimAddress(voteAccount.address)}
                      </a>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Voted for:</span>
                      <span className="ml-2 text-gray-900">
                        {proposalInfo.choices[voteAccount.choice] || `Choice ${voteAccount.choice}`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Right Column - Uploaded PNG */}
                  <div className="flex-none">
                    {uploadedFile && (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white">
                        <img
                          src={URL.createObjectURL(uploadedFile)}
                          alt="Uploaded signature"
                          className="w-full md:w-32 h-auto md:h-20 object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
