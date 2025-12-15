"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import {
  useWallets,
  type UiWallet,
  type UiWalletAccount,
  getWalletFeature
} from "@wallet-standard/react";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { StandardConnect } from "@wallet-standard/core";

// Create RPC connection
const RPC_ENDPOINT = "https://api.devnet.solana.com";
const WS_ENDPOINT = "wss://api.devnet.solana.com";
const chain = "solana:devnet";
const rpc = createSolanaRpc(RPC_ENDPOINT);
const ws = createSolanaRpcSubscriptions(WS_ENDPOINT);

interface SolanaContextState {
  // RPC
  rpc: ReturnType<typeof createSolanaRpc>;
  ws: ReturnType<typeof createSolanaRpcSubscriptions>;
  chain: typeof chain;

  // Wallet State
  wallets: UiWallet[];
  selectedWallet: UiWallet | null;
  selectedAccount: UiWalletAccount | null;
  isConnected: boolean;
  address: string | null;

  // Wallet Actions
  setWalletAndAccount: (
    wallet: UiWallet | null,
    account: UiWalletAccount | null
  ) => void;
  connect: (wallet: UiWallet) => Promise<void>;
  disconnect: () => Promise<void>;
}

const SolanaContext = createContext<SolanaContextState | undefined>(undefined);

export function useSolana() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error("useSolana must be used within a SolanaProvider");
  }
  return context;
}

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const allWallets = useWallets();

  // Filter for Solana wallets only that support signAndSendTransaction
  const wallets = useMemo(() => {
    return allWallets.filter(
      (wallet) =>
        wallet.chains?.some((c) => c.startsWith("solana:")) &&
        wallet.features.includes(StandardConnect) &&
        wallet.features.includes("solana:signAndSendTransaction")
    );
  }, [allWallets]);

  // State management
  const [selectedWallet, setSelectedWallet] = useState<UiWallet | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<UiWalletAccount | null>(null);

  // Check if connected (account must exist in the wallet's accounts)
  const isConnected = useMemo(() => {
    if (!selectedAccount || !selectedWallet) return false;

    // Find the wallet and check if it still has this account
    const currentWallet = wallets.find((w) => w.name === selectedWallet.name);
    return !!(
      currentWallet &&
      currentWallet.accounts.some(
        (acc) => acc.address === selectedAccount.address
      )
    );
  }, [selectedAccount, selectedWallet, wallets]);

  const setWalletAndAccount = (
    wallet: UiWallet | null,
    account: UiWalletAccount | null
  ) => {
    setSelectedWallet(wallet);
    setSelectedAccount(account);
  };

  // Connect to a wallet
  const connect = async (wallet: UiWallet) => {
    try {
      // Check if wallet has accounts (already authorized)
      if (wallet.accounts && wallet.accounts.length > 0) {
        // Wallet is already connected, just select it
        setWalletAndAccount(wallet, wallet.accounts[0]);
        return;
      }

      // Wallet has no accounts - need to request authorization
      // Try to use the standard:connect feature if available


      const connectFeature = getWalletFeature(wallet, StandardConnect);

      // @ts-ignore
      if (connectFeature && typeof connectFeature.connect === 'function') {
        // Request connection/authorization from the wallet
        // @ts-ignore
        const result = await connectFeature.connect();

        // After connection, the wallet should have accounts
        if (result && 'accounts' in result && result.accounts.length > 0) {
          setWalletAndAccount(wallet, result.accounts[0] as UiWalletAccount);
        } else if (wallet.accounts && wallet.accounts.length > 0) {
          // Fallback: check wallet.accounts directly
          setWalletAndAccount(wallet, wallet.accounts[0]);
        } else {
          throw new Error("Wallet connection succeeded but no accounts were returned");
        }
      } else {
        // Wallet doesn't support standard:connect
        // Guide user to connect via their wallet extension
        throw new Error(
          `Please open your ${wallet.name} wallet extension and connect to this site, then try again.`
        );
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      // Do not throw, as this crashes the UI. Just log it.
      // throw error;
    }
  };

  // Disconnect from current wallet
  const disconnect = async () => {
    if (!selectedWallet) return;

    try {
      // For Wallet Standard, "disconnect" just means we stop using this wallet
      // The wallet extension itself remains connected to the site
      // We just clear our selection
      setSelectedWallet(null);
      setSelectedAccount(null);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      // Still clear the state even if there's an error
      setSelectedWallet(null);
      setSelectedAccount(null);
    }
  };

  // Get current address
  const address = selectedAccount?.address || null;

  // Create context value
  const contextValue = useMemo<SolanaContextState>(
    () => ({
      // Static RPC values
      rpc,
      ws,
      chain,

      // Dynamic wallet values
      wallets,
      selectedWallet,
      selectedAccount,
      isConnected,
      address,
      setWalletAndAccount,
      connect,
      disconnect
    }),
    [wallets, selectedWallet, selectedAccount, isConnected, address]
  );

  return (
    <SolanaContext.Provider value={contextValue}>
      {children}
    </SolanaContext.Provider>
  );
}