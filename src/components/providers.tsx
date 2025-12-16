"use client";

import { SolanaProvider } from "@/components/solana-provider";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SolanaProvider>
      <SolanaWalletProvider>
        <AuthProvider>{children}</AuthProvider>
      </SolanaWalletProvider>
    </SolanaProvider>
  );
}
