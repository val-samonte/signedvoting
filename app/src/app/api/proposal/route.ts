import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { Keypair } from '@solana/web3.js';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('Proposal creation request received');
    
    const cookieHeader = request.headers.get('cookie');
    const session = await getServerSession(cookieHeader || undefined);
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session user:', session.user);

    const { name, description, choices } = await request.json();
    console.log('Request data:', { name, description, choices });

    // Validate input
    if (!name || !choices || choices.length < 2) {
      console.log('Invalid proposal data');
      return NextResponse.json({ error: 'Invalid proposal data' }, { status: 400 });
    }

    // Generate hash: sha256(concat name + description + JSON.stringify(choices))
    const hashInput = name + (description || '') + JSON.stringify(choices);
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    console.log('Generated hash:', hash);

    // Generate a new keypair for the payer
    const payerKeypair = Keypair.generate();
    const payerBase64 = Buffer.from(payerKeypair.secretKey).toString('base64'); // Store as base64
    console.log('Generated payer keypair');

    // Create the proposal in the database
    console.log('Creating proposal in database...');
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
    console.log('Proposal created successfully:', proposal.id);

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
    console.error('Error creating proposal:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
