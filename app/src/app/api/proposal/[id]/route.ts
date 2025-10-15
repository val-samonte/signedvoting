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
      },
      include: {
        author: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Parse the payer keypair to get the public key
    // The payer is stored as base64 encoded keypair
    let payerPubkeyBase58: string;
    try {
      const payerKeypair = Keypair.fromSecretKey(Buffer.from(proposal.payer, 'base64'));
      payerPubkeyBase58 = payerKeypair.publicKey.toBase58();
    } catch (error) {
      // Fallback: return a placeholder or handle the error
      payerPubkeyBase58 = 'Invalid keypair';
    }

    return NextResponse.json({
      id: proposal.id,
      name: proposal.name,
      description: proposal.description,
      choices: JSON.parse(proposal.choices),
      hash: proposal.hash,
      payerPubkey: payerPubkeyBase58,
      pda: proposal.pda,
      author: {
        id: proposal.author.id,
        username: proposal.author.username,
        wallet_address: proposal.author.wallet_address,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
