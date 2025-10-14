'use client';

import { MarkdownRenderer } from './MarkdownRenderer';

interface ProposalPreviewProps {
  name: string;
  description: string;
  choices: string[];
}

export function ProposalPreview({ name, description, choices }: ProposalPreviewProps) {
  const getChoiceLabel = (index: number) => {
    return String.fromCharCode(97 + index); // a, b, c, etc.
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>
      
      <div className="space-y-6">
        {/* Proposal Name */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {name || 'Untitled Proposal'}
          </h1>
        </div>

        {/* Description */}
        <div>
          {description ? (
            <MarkdownRenderer>{description}</MarkdownRenderer>
          ) : (
            <p className="text-gray-500 italic">No description provided</p>
          )}
        </div>

        {/* Choices */}
        <div>
          {choices.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {choices.map((choice, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border"
                >
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center justify-center">
                    {getChoiceLabel(index)}.
                  </span>
                  <span className="text-gray-900">{choice}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No choices provided</p>
          )}
        </div>

      </div>

      {/* Publish Button Placeholder */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          disabled
          className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
        >
          Publish Now
        </button>
      </div>
    </div>
  );
}
