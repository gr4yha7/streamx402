"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSolana } from "@/components/solana-provider";

interface User {
  id: string;
  walletAddress: string;
  username: string;
  email?: string;
  avatar?: string;
  isCreator: boolean;
  creatorProfile?: {
    id: string;
    channelName: string;
    paymentAddress: string;
    defaultStreamTitle?: string;
    category?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  signIn: (username: string, email?: string) => Promise<void>;
  signUp: (username: string, email?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, disconnect } = useSolana();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      fetchUser();
    } else {
      setUser(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const fetchUser = async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/me", {
        headers: {
          "X-Wallet-Address": address,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (username: string, email?: string) => {
    if (!address) throw new Error("Wallet not connected");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, username, email }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (username: string, email?: string) => {
    if (!address) throw new Error("Wallet not connected");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, username, email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Sign up failed");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      disconnect();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConnected,
        walletAddress: address || null,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

