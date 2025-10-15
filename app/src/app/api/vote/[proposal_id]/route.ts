import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { Transaction, Keypair } from '@solana/web3.js';
import { connection } from '@/lib/anchor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposal_id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = await getServerSession(cookieHeader || undefined);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const proposalId = parseInt(resolvedParams.proposal_id);
    if (isNaN(proposalId)) {
      return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
    }

    const { signatureHash, base64Tx } = await request.json();

    // Validate required fields
    if (!signatureHash || !base64Tx) {
      return NextResponse.json({ 
        error: 'Missing required fields: signatureHash and base64Tx' 
      }, { status: 400 });
    }

    // Get the proposal from database
    const proposal = await prisma.proposal.findFirst({
      where: {
        id: proposalId,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    let transactionSignature: string | null = null;
    let isExistingVote = false;

    try {
      // Complete the vote transaction
      const txBuffer = Buffer.from(base64Tx, 'base64');
      const transaction = Transaction.from(txBuffer);

      // Retrieve payer keypair from proposal record
      const payerKeypair = Keypair.fromSecretKey(Buffer.from(proposal.payer, 'base64'));

      // Ensure the fee payer is set correctly
      transaction.feePayer = payerKeypair.publicKey;
      
      // Add the payer's signature to the partially signed transaction
      transaction.partialSign(payerKeypair);
      
      // Send the transaction to the network
      transactionSignature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(transactionSignature);

    } catch (txError) {
      console.error('Transaction error:', txError);
      
      // Check if it's a "Vote account already exists" error - this is actually success
      if (txError instanceof Error && 
          (txError.message.includes('already in use') || 
           txError.message.includes('Account already exists'))) {
        isExistingVote = true;
      } else {
        return NextResponse.json({ 
          error: 'Failed to submit vote transaction',
          details: txError instanceof Error ? txError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Create vote entry in database after transaction success or existing vote account
    await prisma.vote.create({
      data: {
        user_id: session.user.id,
        proposal_id: proposalId,
        signature_hash: signatureHash,
      },
    });

    return NextResponse.json({
      success: true,
      transactionSignature,
      message: isExistingVote ? 'Vote account already exists - vote resumed successfully' : 'Vote submitted successfully',
    });

  } catch (error) {
    console.error('Internal server error in vote route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}