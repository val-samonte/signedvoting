'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { userAtom } from '@/store';
import { getSha256FromBlob, getKeypairFromUserAndBlob, getFinalSha256 } from '@/store/proposal';

export default function VerifySignaturePage() {
  const [user] = useAtom(userAtom);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verificationResults, setVerificationResults] = useState<{
    sha256: string;
    keypair: any;
    finalSha256: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setError(null);
    setVerificationResults(null);
    setIsProcessing(true);

    try {
      // Get actual user ID from auth context (same as VoteConfirmationModal)
      if (!user?.id) {
        throw new Error('User ID is required for signature verification');
      }
      const userId = user.id.toString();
      
      // Process the uploaded PNG file
      const sha256 = await getSha256FromBlob(file);
      const keypair = await getKeypairFromUserAndBlob(userId, file);
      const finalSha256 = await getFinalSha256(sha256);

      setVerificationResults({
        sha256,
        keypair,
        finalSha256
      });

      console.log('Verification Results:', {
        sha256,
        keypair: {
          publicKey: keypair?.publicKey.toString(),
          secretKey: keypair ? Array.from(keypair.secretKey) : null
        },
        finalSha256
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
      console.error('Verification error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Verify Signature PNG
          </h1>
          
          <p className="text-gray-600 mb-6">
            Upload the PNG file you downloaded when voting to verify it generates the same keypair.
          </p>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Signature PNG
            </label>
            <input
              type="file"
              accept=".png,image/png"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-700">Processing PNG file...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Verification Results */}
          {verificationResults && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Generated Public Key</h2>
              
              {/* Public Key */}
              {verificationResults.keypair && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-mono text-gray-800 break-all">
                    {verificationResults.keypair.publicKey.toString()}
                  </p>
                </div>
              )}

              {/* Success Message */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-green-700 font-medium">
                    PNG processed successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">How to verify:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to a proposal and create a signature</li>
              <li>Click "Vote Now" to download the PNG file</li>
              <li>Upload that same PNG file here</li>
              <li>Compare the generated public key with the one from your vote</li>
              <li>They should be identical, proving the PNG contains the same signature data</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
