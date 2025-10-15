'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAtom } from 'jotai';
import { userAtom } from '@/store';
import { ProposalCard } from '@/components/ProposalCard';
import { MasonryGrid } from '@/components/MasonryGrid';

interface Proposal {
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
}

export default function Home() {
  const [user] = useAtom(userAtom);
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMyProposals = filter && parseInt(filter) === user?.id;
  const pageTitle = isMyProposals ? 'My Proposals' : 'Recent Proposals';

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = filter ? `/api/proposal?filter=${filter}` : '/api/proposal';
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch proposals');
        }
        
        const data = await response.json();
        setProposals(data.proposals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [filter]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading proposals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-800">
            <h3 className="font-medium">Error loading proposals</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{pageTitle}</h2>
        <p className="text-gray-600">
          {isMyProposals 
            ? 'Manage and track your proposals' 
            : 'Discover and participate in community proposals'
          }
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isMyProposals ? 'No proposals yet' : 'No proposals available'}
            </h3>
            <p className="text-gray-500 mb-6">
              {isMyProposals 
                ? 'Create your first proposal to get started!'
                : 'Be the first to create a proposal for the community.'
              }
            </p>
            <a
              href="/proposal/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Proposal
            </a>
          </div>
        </div>
      ) : (
        <MasonryGrid columns={3} gap={24}>
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </MasonryGrid>
      )}
    </div>
  );
}
