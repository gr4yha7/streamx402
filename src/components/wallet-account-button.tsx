"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useRef, useEffect } from "react";

export function WalletAccountButton() {
  const { publicKey, connected: isConnected, disconnect } = useWallet();
  const address = publicKey?.toBase58();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  if (!isConnected || !address) {
    return null;
  }

  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 rounded-lg h-10 px-3 bg-[#362348] hover:bg-[#362348]/80 text-white text-sm font-medium transition-colors"
      >
        <div className="size-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
        <span className="hidden sm:inline">{shortAddress}</span>
        <span className="material-symbols-outlined text-lg">expand_more</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[#261933] border border-white/10 shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-xs text-[#ad92c9] border-b border-white/10 mb-1">
              <div className="font-medium text-white mb-1">Connected Wallet</div>
              <div className="font-mono text-xs break-all">{address}</div>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white text-sm transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

