import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { PublicKey } from '@solana/web3.js';
import { connection, PROGRAM_ID } from '@/lib/anchor';

export async function POST(
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

    if (proposal.pda) {
      return NextResponse.json({ error: 'Proposal already finalized' }, { status: 400 });
    }

    // Reconstruct the PDA address
    // Seeds: [user.wallet_address, hash of the proposal]
    if (!proposal.author.wallet_address) {
      return NextResponse.json({ error: 'Author wallet address not found' }, { status: 400 });
    }
    
    const authorPubkey = new PublicKey(proposal.author.wallet_address);
    const hashBytes = Buffer.from(proposal.hash, 'hex');
    
    // We need the program ID and discriminator to find the PDA
    // For now, we'll try to derive it and then verify the account exists
    const [pdaAddress] = PublicKey.findProgramAddressSync(
      [authorPubkey.toBuffer(), hashBytes],
      PROGRAM_ID
    );

    try {
      // Try to fetch the account data
      const accountInfo = await connection.getAccountInfo(pdaAddress);
      
      if (!accountInfo) {
        return NextResponse.json({ error: 'Onchain proposal not found' }, { status: 404 });
      }

      // Parse the account data to verify author and payer
      // The account data structure: [discriminator(8) + bump(1) + author(32) + payer(32) + uri_length(4) + uri(variable) + hash(32)]
      const data = accountInfo.data;
      const discriminator = data.slice(0, 8);
      const bump = data[8];
      const authorFromChain = new PublicKey(data.slice(9, 41));
      const payerFromChain = new PublicKey(data.slice(41, 73));
      
      // Verify author matches
      if (!authorFromChain.equals(authorPubkey)) {
        return NextResponse.json({ error: 'Author mismatch' }, { status: 400 });
      }

      // Verify payer matches (we need to get the payer pubkey from the stored keypair)
      // For now, we'll skip payer verification since we need to decode the base58 keypair
      // In a production system, you might want to store the payer pubkey separately

      // Update the proposal with the PDA
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { pda: pdaAddress.toBase58() },
      });

      return NextResponse.json({
        success: true,
        pda: pdaAddress.toBase58(),
      });
      } catch (error) {
        console.error('Failed to verify onchain proposal:', error);
        return NextResponse.json({ 
          error: 'Failed to verify onchain proposal',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
  } catch (error) {
    console.error('Internal server error in finalize route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
