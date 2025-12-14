"use client";

import { SolanaProvider } from "@/components/solana-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SolanaProvider>
      <AuthProvider>{children}</AuthProvider>
    </SolanaProvider>
  );
}
