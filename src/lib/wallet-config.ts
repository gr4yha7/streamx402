"use client";


import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana, solanaTestnet, solanaDevnet, type AppKitNetwork } from "@reown/appkit/networks";
// import { QueryClient } from '@tanstack/react-query';

export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

if (!projectId && typeof window !== 'undefined') {
  console.warn('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set. Wallet connection will not work.');
}



// Create a QueryClient for React Query
// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//     },
//   },
// });

export const networks = [solana, solanaTestnet, solanaDevnet] as [AppKitNetwork, ...AppKitNetwork[]]

// Set up Solana Adapter
export const solanaWeb3JsAdapter = new SolanaAdapter()

