"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletConnectButton() {
  const {connected} = useWallet();

  if (connected) {
    return null; // Don't show connect button if already connected
  }

  return (
    <div className="relative">
      <WalletMultiButton style={{backgroundColor: "#362348", borderRadius: "8px", padding: "8px 16px", fontSize: "14px", fontWeight: "600", lineHeight: "20px", letterSpacing: "0.015em"}}>
        <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
        <span>Connect Wallet</span>
      </WalletMultiButton>
    </div>
  );
}
