import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = await getServerSession(cookieHeader || undefined);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const proposalId = parseInt(resolvedParams.id);
    if (isNaN(proposalId)) {
      return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
    }

    // Check if the user has voted for this proposal
    const vote = await prisma.vote.findUnique({
      where: {
        user_id_proposal_id: {
          user_id: session.user.id,
          proposal_id: proposalId,
        },
      },
    });

    return NextResponse.json({
      hasVoted: !!vote,
      vote: vote ? {
        signature_hash: vote.signature_hash,
        created_at: vote.created_at,
      } : null,
    });
  } catch (error) {
    console.error('Error checking vote status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
