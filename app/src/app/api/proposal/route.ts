import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { Keypair } from '@solana/web3.js';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = await getServerSession(cookieHeader || undefined);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const userId = filter ? parseInt(filter) : null;

    // Build where clause based on filter
    let whereClause: any = {};
    
    if (userId && userId === session.user.id) {
      // My proposals: show all proposals for the user regardless of PDA status
      whereClause.author_id = userId;
    } else {
      // Recent proposals: only show proposals with PDA (finalized proposals)
      whereClause.pda = { not: null };
    }

    const proposals = await prisma.proposal.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            wallet_address: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Transform the data to include vote count and parse choices
    const transformedProposals = proposals.map(proposal => ({
      id: proposal.id,
      name: proposal.name,
      description: proposal.description,
      choices: JSON.parse(proposal.choices),
      hash: proposal.hash,
      pda: proposal.pda,
      created_at: proposal.created_at,
      author: proposal.author,
      vote_count: proposal._count.votes,
    }));

    return NextResponse.json({
      success: true,
      proposals: transformedProposals,
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    
    const cookieHeader = request.headers.get('cookie');
    const session = await getServerSession(cookieHeader || undefined);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, choices } = await request.json();

    // Validate input
    if (!name || !choices || choices.length < 2) {
      return NextResponse.json({ error: 'Invalid proposal data' }, { status: 400 });
    }

    // Generate hash: sha256(concat name + description + JSON.stringify(choices))
    const hashInput = name + (description || '') + JSON.stringify(choices);
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // Generate a new keypair for the payer
    const payerKeypair = Keypair.generate();
    const payerBase64 = Buffer.from(payerKeypair.secretKey).toString('base64'); // Store as base64

    // Create the proposal in the database
    const proposal = await prisma.proposal.create({
      data: {
        author_id: session.user.id,
        payer: payerBase64,
        name,
        description: description || '',
        choices: JSON.stringify(choices),
        hash,
        pda: null, // Will be set after onchain creation
      },
      include: {
        author: true,
      },
    });

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        name: proposal.name,
        description: proposal.description,
        choices: JSON.parse(proposal.choices),
        hash: proposal.hash,
        payerPubkey: payerKeypair.publicKey.toBase58(), // Only expose the pubkey
        author: {
          id: proposal.author.id,
          username: proposal.author.username,
          wallet_address: proposal.author.wallet_address,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
