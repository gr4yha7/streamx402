"use client";

import { useAuth } from "@/contexts/auth-context";
import { WalletConnectButton } from "./wallet-connect-button";
import { WalletAccountButton } from "./wallet-account-button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

export function HeaderAuth() {
  const { user, isLoading: authLoading } = useAuth();
  const { publicKey, connected: isConnected } = useWallet();
  const address = publicKey?.toBase58();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-10 bg-[#362348] rounded-full animate-pulse"></div>
      </div>
    );
  }

  // If wallet is connected but user is not authenticated
  if (isConnected && address && !user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/auth"
          className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors"
        >
          Complete Sign Up
        </Link>
        <WalletAccountButton />
      </div>
    );
  }

  // If user is authenticated
  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.isCreator && (
          <Link
            href="/creator/dashboard"
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
        )}
        <div className="flex items-center gap-3">
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-purple-500 to-pink-500">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <></>
              // TODO: import lucide react user icon
              // <UserIcon />
            )}
          </div>
          <div className="flex flex-col text-right">
            <p className="text-white text-sm font-medium">{user.username}</p>
            {/* <p className="text-gray-400 text-xs">{user.isCreator ? "Creator" : "Viewer"}</p> */}
          </div>
        </div>
        <WalletAccountButton />
      </div>
    );
  }

  // Not connected - show connect wallet and sign up buttons
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/auth"
        className="flex items-center justify-center rounded-lg h-10 px-4 bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
      >
        Become a Creator
      </Link>
      <WalletConnectButton />
    </div>
  );
}

