"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { useWallet } from "@solana/wallet-adapter-react";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signUp, signIn, isLoading } = useAuth();
  const { publicKey, connected: isConnected } = useWallet();
  const address = publicKey?.toBase58();
  const [isSignUp, setIsSignUp] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      const redirectTo = searchParams.get("redirect") || "/";
      router.push(redirectTo);
    }
  }, [user, isLoading, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (isSignUp && !username.trim()) {
      setError("Username is required");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(username, email || undefined);
      } else {
        await signIn(username || '', email || undefined);
      }
      // Redirect will happen via useEffect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark font-display text-white">
      <div className="absolute top-8 flex items-center gap-3">
        <div className="size-6 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
          </svg>
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">StreamX402</span>
      </div>
      <div className="flex w-full max-w-md flex-col items-stretch rounded-xl bg-[#2a2a2e]/50 p-6 md:p-8">
        {/* Page Heading */}
        <div className="flex flex-col gap-2 text-center">
          <p className="text-3xl font-bold leading-tight tracking-tighter text-white">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </p>
          <p className="text-base font-normal leading-normal text-gray-400">
            {isSignUp
              ? "Join our community of streamers and crypto enthusiasts."
              : "Sign in to continue to your account."}
          </p>
        </div>
        {/* Segmented Buttons */}
        <div className="my-6">
          <div className="flex h-11 items-center justify-center rounded-lg bg-[#191022] p-1">
            <label className="flex h-full grow cursor-pointer items-center justify-center rounded-md px-2 text-sm font-medium leading-normal text-gray-400 has-[:checked]:bg-primary has-[:checked]:text-white">
              <span className="truncate">Sign Up</span>
              <input
                checked={isSignUp}
                onChange={() => setIsSignUp(true)}
                className="invisible w-0"
                name="auth-toggle"
                type="radio"
                value="Sign Up"
              />
            </label>
            <label className="flex h-full grow cursor-pointer items-center justify-center rounded-md px-2 text-sm font-medium leading-normal text-gray-400 has-[:checked]:bg-primary has-[:checked]:text-white">
              <span className="truncate">Log In</span>
              <input
                checked={!isSignUp}
                onChange={() => setIsSignUp(false)}
                className="invisible w-0"
                name="auth-toggle"
                type="radio"
                value="Log In"
              />
            </label>
          </div>
        </div>
        {/* Wallet Connection Status */}
        {!isConnected ? (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3 text-center">
              Connect your Solana wallet to continue
            </p>
            <div className="flex justify-center">
              <WalletConnectButton />
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400 text-center">
              ✓ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <label className="flex flex-col">
              <p className="pb-2 text-sm font-medium leading-normal text-gray-200">Username <span className="text-red-400">*</span></p>
              <input
                className="form-input h-12 w-full flex-1 resize-none overflow-hidden rounded-lg border-none bg-[#191022] p-3 text-base font-normal leading-normal text-white placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={isSignUp}
                minLength={3}
                maxLength={30}
              />
            </label>
          )}
          <label className="flex flex-col">
            <p className="pb-2 text-sm font-medium leading-normal text-gray-200">Email (Optional)</p>
            <input
              className="form-input h-12 w-full flex-1 resize-none overflow-hidden rounded-lg border-none bg-[#191022] p-3 text-base font-normal leading-normal text-white placeholder:text-gray-500 focus:outline-0 focus:ring-2 focus:ring-primary/50"
              placeholder="Enter your email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {/* CTA Button */}
          <button
            type="submit"
            disabled={loading || !isConnected || (isSignUp && !username.trim())}
            className="mt-2 flex h-12 items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-white transition-colors hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>
        {/* Divider */}
        {/* <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative bg-[#2a2a2e] px-2 text-sm text-gray-400">OR</div>
        </div> */}
        {/* Helper Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By {isSignUp ? "signing up" : "signing in"}, you agree to our{" "}
            <a className="font-medium text-primary/80 hover:underline" href="#">Terms of Service</a> and{" "}
            <a className="font-medium text-primary/80 hover:underline" href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

