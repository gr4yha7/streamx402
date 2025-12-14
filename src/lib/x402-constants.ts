/**
 * x402 constants and utilities that can be used on both client and server
 */

// USDC on Solana Devnet mint address
export const USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// Solana Devnet network identifier
export const SOLANA_DEVNET_NETWORK = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as `${string}:${string}`;

/**
 * Creates payment requirements for a stream
 * This function can be used on both client and server
 * @param priceInUSDC - Price in USDC (e.g., 0.10 for $0.10)
 * @param creatorAddress - Solana address to receive payment
 * @returns Payment acceptance configuration
 */
export function createStreamPaymentRequirements(
  priceInUSDC: number,
  creatorAddress: string = ''
) {
  // USDC has 6 decimals, so convert to atomic units
  const amountInAtomicUnits = Math.floor(priceInUSDC * 1_000_000);

  return [
    {
      scheme: "exact" as const,
      price: `$${priceInUSDC.toFixed(2)}`,
      network: SOLANA_DEVNET_NETWORK,
      payTo: creatorAddress,
      amount: amountInAtomicUnits.toString(),
    },
  ];
}

