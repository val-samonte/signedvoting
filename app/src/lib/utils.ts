import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Trims a base58 address to show first 6 and last 4 characters with ellipsis
 * @param address - The base58 address to trim
 * @returns The trimmed address string
 */
export function trimAddress(address: string): string {
  if (!address || address.length <= 10) {
    return address;
  }
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Computes the proposal hash using the same algorithm as the backend
 * @param name - The proposal name
 * @param description - The proposal description (can be empty)
 * @param choices - Array of proposal choices
 * @returns Promise that resolves to the SHA256 hash as a hex string
 */
export async function computeProposalHash(name: string, description: string, choices: string[]): Promise<string> {
  const hashInput = name + (description || '') + JSON.stringify(choices);
  
  // Use Web Crypto API for SHA256 hashing (available in browsers)
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes the size of a Vote account in bytes
 * Based on the Vote struct in the Rust program:
 * - Account discriminator: 8 bytes (Anchor requirement)
 * - bump: 1 byte (u8)
 * - voter: 32 bytes (Pubkey)
 * - proposal_id: 32 bytes (Pubkey)
 * - choice: 1 byte (u8)
 * @returns The total size in bytes
 */
export function computeVoteAccountSize(): number {
  return 8 + 1 + 32 + 32 + 1; // 74 bytes
}

/**
 * Calculates the rent-exempt minimum for a given account size using Solana's current rent parameters
 * @param connection - Solana connection instance
 * @param accountSize - Size of the account in bytes
 * @returns Promise that resolves to the rent-exempt minimum in SOL
 */
export async function calculateRentExemptMinimum(connection: Connection, accountSize: number): Promise<number> {
  try {
    const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(accountSize);
    // Convert lamports to SOL
    return rentExemptBalance / 1e9;
  } catch (error) {
    console.error('Failed to calculate rent-exempt minimum:', error);
    throw new Error('Failed to calculate rent-exempt minimum');
  }
}

/**
 * Calculates the rent-exempt minimum for a Vote account
 * @param connection - Solana connection instance
 * @returns Promise that resolves to the rent-exempt minimum in SOL
 */
export async function calculateVoteAccountRentExemptMinimum(connection: Connection): Promise<number> {
  const voteAccountSize = computeVoteAccountSize();
  return calculateRentExemptMinimum(connection, voteAccountSize);
}

/**
 * Calculates the transaction fee for a given transaction
 * @param connection - Solana connection instance
 * @param transaction - The transaction to calculate fees for
 * @returns Promise that resolves to the transaction fee in SOL
 */
export async function calculateTransactionFee(connection: Connection, transaction: { compileMessage(): any }): Promise<number> {
  try {
    // Get the fee for the transaction message
    const fee = await connection.getFeeForMessage(transaction.compileMessage());
    // Convert lamports to SOL, handle null case
    return (fee.value || 5000) / 1e9;
  } catch (error) {
    console.error('Failed to calculate transaction fee:', error);
    // Fallback to a reasonable default fee (5000 lamports = 0.000005 SOL)
    return 0.000005;
  }
}

/**
 * Calculates the transaction fee for a simple SOL transfer
 * @param connection - Solana connection instance
 * @param fromPubkey - The sender's public key
 * @param toPubkey - The recipient's public key
 * @param lamports - The amount to transfer in lamports
 * @returns Promise that resolves to the transaction fee in SOL
 */
export async function calculateTransferFee(
  connection: Connection, 
  fromPubkey: PublicKey, 
  toPubkey: PublicKey, 
  lamports: number
): Promise<number> {
  try {
    // Create a temporary transaction to calculate the fee
    const { Transaction, SystemProgram } = await import('@solana/web3.js');
    const tempTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );
    
    return calculateTransactionFee(connection, tempTransaction);
  } catch (error) {
    console.error('Failed to calculate transfer fee:', error);
    // Fallback to a reasonable default fee
    return 0.000005;
  }
}

/**
 * Calculates the total cost of voting (rent-exempt minimum + transaction fee)
 * @param connection - Solana connection instance
 * @param program - The Anchor program instance
 * @param proposalPubkey - The proposal's public key
 * @param voterPubkey - The voter's public key
 * @param payerPubkey - The payer's public key
 * @param choice - The vote choice (0-255)
 * @returns Promise that resolves to the total cost in SOL
 */
export async function calculateVoteCost(
  connection: Connection,
  program: { methods: { vote: (choice: number) => { accounts: (accounts: any) => { transaction: () => Promise<any> } } } },
  proposalPubkey: PublicKey,
  voterPubkey: PublicKey,
  payerPubkey: PublicKey,
  choice: number
): Promise<{ rentExemptMinimum: number; transactionFee: number; totalCost: number }> {
  try {
    // Calculate rent-exempt minimum for vote account (74 bytes)
    const rentExemptMinimum = await calculateVoteAccountRentExemptMinimum(connection);
    
    // Create a temporary vote transaction to calculate the fee
    const tempTransaction = await program.methods
      .vote(choice)
      .accounts({
        proposal: proposalPubkey,
        voter: voterPubkey,
        payer: payerPubkey,
      })
      .transaction();
    
    const transactionFee = await calculateTransactionFee(connection, tempTransaction);
    
    return {
      rentExemptMinimum,
      transactionFee,
      totalCost: rentExemptMinimum + transactionFee
    };
  } catch (error) {
    console.error('Failed to calculate vote cost:', error);
    // Fallback values
    const fallbackRent = 0.00089; // Approximate rent for 74 bytes
    const fallbackFee = 0.000005; // Approximate transaction fee
    return {
      rentExemptMinimum: fallbackRent,
      transactionFee: fallbackFee,
      totalCost: fallbackRent + fallbackFee
    };
  }
}
