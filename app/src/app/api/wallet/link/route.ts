import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { signature, message, walletAddress } = await request.json();

    if (!signature || !message || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: signature, message, walletAddress' },
        { status: 400 }
      );
    }

    // Verify the signature
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = new Uint8Array(signature);

    // Verify the signature using nacl
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Verify the message contains the correct user information
    const expectedMessage = `Sign this to prove that you own ${session.id} ${session.username}`;
    if (message !== expectedMessage) {
      return NextResponse.json(
        { error: 'Invalid message content' },
        { status: 400 }
      );
    }

    // Update the user's wallet address in the database
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: { wallet_address: walletAddress },
      select: {
        id: true,
        username: true,
        wallet_address: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
