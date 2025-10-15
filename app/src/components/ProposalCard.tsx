'use client';

import Link from 'next/link';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useRef, useEffect, useState, useMemo } from 'react';

interface ProposalCardProps {
  proposal: {
    id: number;
    name: string;
    description: string;
    choices: string[];
    hash: string;
    pda: string | null;
    created_at: string;
    author: {
      id: number;
      username: string;
      wallet_address: string | null;
    };
    vote_count: number;
  };
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const isDraft = !proposal.pda;
  const contentRef = useRef<HTMLDivElement>(null);

  const [displayText, isTruncated] = useMemo(() => {
    const words = proposal.description.split(" ");
    const isTruncated = words.length > 30;
    const displayText = words.slice(0, 30).join(" ") + (isTruncated ? " ..." : "");
    return [displayText, isTruncated];
  }, [proposal.description])

  return (
    <Link href={`/proposal/${proposal.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:scale-105">
        {/* Header with name and draft status */}
        <div className='mb-2'>
          <h3 className="text-lg font-semibold text-gray-500 mb-2 line-clamp-2">
            {proposal.name}
          </h3>
          {isDraft && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Draft
            </span>
          )}
        </div>

        {/* Description with markdown rendering and conditional gradient mask */}
        <div className="relative max-h-[300px] overflow-hidden">
          <div ref={contentRef} className="prose prose-sm max-w-none text-xs">
            <MarkdownRenderer>{displayText}</MarkdownRenderer>
          </div>
          {/* Gradient mask only shown when content exceeds 300px */}
          {isTruncated && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          )}
        </div>
      </div>
    </Link>
  );
}
