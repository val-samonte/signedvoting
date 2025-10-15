'use client';

import { useState } from 'react';
import { FreehandSignature } from './FreehandSignature';
import { VoteButton } from './VoteButton';

interface VoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chosenChoice: {
    index: number;
    text: string;
    label: string;
  } | null;
}

export function VoteConfirmationModal({ 
  isOpen, 
  onClose, 
  chosenChoice 
}: VoteConfirmationModalProps) {
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureSvg, setSignatureSvg] = useState<string>('');

  if (!isOpen || !chosenChoice) return null;

  const handleClose = () => {
    onClose();
  };

  const handleSignatureChange = (hasSig: boolean) => {
    setHasSignature(hasSig);
  };

  const handleSignatureSvgChange = (svgString: string) => {
    setSignatureSvg(svgString);
  };

  const handleVoteClick = () => {
    // TODO: Implement vote submission with signatureSvg
    console.log('Voting with choice:', chosenChoice);
    console.log('Signature SVG:', signatureSvg);
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex flex-col gap-6">
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
            onSignatureChange={handleSignatureChange}
            onChange={handleSignatureSvgChange}
          />

          {/* Vote Now Button */}
          <VoteButton 
            disabled={!hasSignature}
            onClick={handleVoteClick}
          />
        </div>
      </div>
    </div>
  );
}
