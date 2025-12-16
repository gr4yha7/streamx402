"use client";

import { useState, useEffect, useMemo } from "react";
import { WalletConnectButton } from "./wallet-connect-button";
import { useWallet } from "@solana/wallet-adapter-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  price: number;
  streamTitle: string;
  streamId: string;
  creatorAddress: string;
  onPaymentSuccess?: (transactionHash: string) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  price,
  streamTitle,
  streamId,
  creatorAddress,
  onPaymentSuccess
}: PaymentModalProps) {
  const { publicKey, connected: isConnected } = useWallet();
  const address = publicKey?.toBase58();  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address && step === 1) {
      setStep(2);
    }
  }, [isConnected, address, step]);

  const handlePayment = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setProcessing(true);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="flex w-full max-w-[560px] flex-col rounded-xl border border-white/10 bg-[#12101a] shadow-2xl shadow-primary/20">
        {/* PageHeading */}
        <div className="flex flex-wrap items-start justify-between gap-3 p-6 border-b border-white/10">
          <div className="flex min-w-72 flex-col gap-2">
            <p className="text-2xl font-bold leading-tight tracking-tight text-white">Unlock Premium Content</p>
            <p className="text-sm font-normal leading-normal text-white/60">
              Connect your wallet to pay with USDC and access the stream.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        {/* Main Content */}
        <div className="flex flex-col">
          {/* ProgressBar */}
          <div className="flex flex-col gap-2 p-6">
            <div className="flex items-center justify-between gap-6">
              <p className="text-sm font-medium leading-normal text-white">
                Step {step} of 2: {step === 1 ? "Connect Wallet" : "Confirm Payment"}
              </p>
              <p className="text-sm font-normal text-white/60">
                {step === 1 ? "Next: Confirm Payment" : "Complete"}
              </p>
            </div>
            <div className="w-full rounded-full bg-primary/20">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${step * 50}%` }}></div>
            </div>
          </div>
          {/* SectionHeader */}
          <div className="px-6 pb-2 pt-2">
            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] text-white">
              {step === 1 ? "Select your wallet" : "Confirm Payment"}
            </h3>
          </div>
          {/* Wallet Selection or Payment Confirmation */}
          {step === 1 ? (
            <div className="p-6">
              <div className="mb-4">
                <p className="text-white/60 text-sm mb-4">
                  Connect your Solana wallet to proceed with payment
                </p>
                <div className="flex justify-center">
                  <WalletConnectButton />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-white/60 mb-2">Stream</p>
                <p className="text-white font-medium">{streamTitle}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-white/60 mb-2">Amount</p>
                <p className="text-white font-bold text-xl">${price.toFixed(2)}</p>
              </div>
              {address && (
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-white/60 mb-1">Paying from</p>
                  <p className="text-white text-sm font-mono break-all">{address}</p>
                </div>
              )}
              <button
                onClick={handlePayment}
                disabled={!isConnected || processing}
                className="w-full flex items-center justify-center rounded-lg h-12 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-base font-bold transition-colors"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Processing Payment...
                  </span>
                ) : (
                  "Confirm Payment"
                )}
              </button>
            </div>
          )}
          {/* MetaText */}
          <div className="p-6 pt-0">
            <p className="text-center text-xs font-normal leading-normal text-white/50">
              By connecting, you agree to our Terms of Service. We never store your private keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

