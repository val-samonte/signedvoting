'use client';

import { useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { FreehandSignature } from './FreehandSignature';
import { VoteButton } from './VoteButton';
import { proposalSignatureAtomFamily } from '@/store/proposal';
import { getStroke } from 'perfect-freehand';

interface VoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chosenChoice: {
    index: number;
    text: string;
    label: string;
  } | null;
  proposalId: number;
}

export function VoteConfirmationModal({ 
  isOpen, 
  onClose, 
  chosenChoice,
  proposalId
}: VoteConfirmationModalProps) {
  const [signatureStrokes, setSignatureStrokes] = useAtom(proposalSignatureAtomFamily(proposalId));
  const hasSignature = signatureStrokes.length > 0;

  // Convert strokes to SVG string for voting
  const getSignatureSvg = useCallback((strokes: number[][][]) => {
    if (strokes.length === 0) return '';
    
    const getSvgPathFromStroke = (stroke: number[][]) => {
      if (stroke.length < 4) return '';
      
      const average = (a: number, b: number) => (a + b) / 2;
      let a = stroke[0];
      let b = stroke[1];
      const c = stroke[2];

      let pathData = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

      for (let i = 2, max = stroke.length - 1; i < max; i++) {
        a = stroke[i];
        b = stroke[i + 1];
        pathData += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
      }

      pathData += 'Z';
      return pathData;
    };

    const paths = strokes.map(strokePoints => {
      const stroke = getStroke(strokePoints, {
        size: 4,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
        last: true,
      });
      return getSvgPathFromStroke(stroke);
    }).filter(path => path !== '');
    
    if (paths.length === 0) return '';
    
    return `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      ${paths.map(path => `<path d="${path}" fill="black" stroke="black" stroke-width="1"/>`).join('')}
    </svg>`;
  }, []);

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

  const handleVoteClick = () => {
    const signatureSvg = getSignatureSvg(signatureStrokes);
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
        </div>
      </div>
    </div>
  );
}
