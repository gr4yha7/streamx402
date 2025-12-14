"use client";

import { useSolana } from "@/components/solana-provider";
import { useState } from "react";

export function WalletConnectButton() {
  const { isConnected, wallets, connect } = useSolana();
  const [showWallets, setShowWallets] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (wallet: any) => {
    try {
      setIsConnecting(true);
      await connect(wallet);
      setShowWallets(false);
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected) {
    return null; // Don't show connect button if already connected
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWallets(!showWallets)}
        className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors gap-2 shadow-lg shadow-primary/20"
      >
        <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
        <span>Connect Wallet</span>
      </button>

      {showWallets && wallets.length > 0 && (
        <div className="absolute top-full mt-2 right-0 w-64 rounded-lg bg-[#261933] border border-white/10 shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-sm font-medium text-white border-b border-white/10 mb-2">
              Select Wallet
            </div>
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet)}
                disabled={isConnecting}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-white text-sm transition-colors disabled:opacity-50"
              >
                {wallet.icon && (
                  <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />
                )}
                <span>{wallet.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showWallets && wallets.length === 0 && (
        <div className="absolute top-full mt-2 right-0 w-64 rounded-lg bg-[#261933] border border-white/10 shadow-xl z-50 p-4">
          <p className="text-sm text-[#ad92c9] text-center">
            No Solana wallets detected. Please install a wallet like Phantom or Solflare.
          </p>
        </div>
      )}
    </div>
  );
}
