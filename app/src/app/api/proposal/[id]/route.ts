import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { Keypair } from '@solana/web3.js';

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

    // Get the proposal from database
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
        author_id: session.user.id,
      },
      include: {
        author: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Parse the payer keypair to get the public key
    // The payer is stored as base58 encoded keypair (secretKey.toString())
    const payerKeypair = Keypair.fromSecretKey(Buffer.from(proposal.payer, 'base64'));
    const payerPubkeyBase58 = payerKeypair.publicKey.toBase58();

    return NextResponse.json({
      id: proposal.id,
      name: proposal.name,
      description: proposal.description,
      choices: JSON.parse(proposal.choices),
      hash: proposal.hash,
      payerPubkey: Buffer.from(payerPubkey).toString('base64'), // Convert to base64 for easier handling
      pda: proposal.pda,
      author: {
        id: proposal.author.id,
        username: proposal.author.username,
        wallet_address: proposal.author.wallet_address,
      },
    });
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
