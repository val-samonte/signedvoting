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
