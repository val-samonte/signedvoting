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
