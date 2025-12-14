"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSolana } from "@/components/solana-provider";
import { HeaderAuth } from "@/components/header-auth";
import Link from "next/link";

const CATEGORIES = [
  "Gaming",
  "Music",
  "Just Chatting",
  "Art & Creative",
  "Cooking",
  "Education",
  "Sports",
  "Science & Technology",
  "Entertainment",
  "Other",
];

export default function CreatorChannelSetup() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { address, isConnected } = useSolana();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [channelName, setChannelName] = useState("");
  const [defaultStreamTitle, setDefaultStreamTitle] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState({
    twitter: "",
    youtube: "",
    instagram: "",
    discord: "",
  });

  // Redirect if not authenticated or already a creator
  useEffect(() => {
    if (!authLoading && user?.isCreator) {
      router.push("/creator/dashboard");
    }
  }, [user, authLoading, router]);

  // Redirect if wallet not connected
  useEffect(() => {
    if (!authLoading && !isConnected) {
      router.push("/auth?redirect=/creator/setup");
    }
  }, [isConnected, authLoading, router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!channelName.trim()) {
        setError("Channel name is required");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!address) {
      setError("Wallet address not found");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/creator/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wallet-Address": address,
        },
        body: JSON.stringify({
          channelName: channelName.trim(),
          defaultStreamTitle: defaultStreamTitle.trim() || undefined,
          category: category || undefined,
          bio: bio.trim() || undefined,
          paymentAddress: address, // Use connected wallet address
          socialLinks: Object.values(socialLinks).some((v) => v.trim())
            ? socialLinks
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create creator profile");
      }

      // Refresh user data to get updated isCreator status
      await refreshUser();

      // Wait a bit for the context to update, then redirect
      setTimeout(() => {
        router.push("/creator/dashboard");
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isConnected || !user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark font-display overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1 px-4 md:px-10 lg:px-20">
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-white/10 px-4 sm:px-10 py-3">
              <Link href="/" className="flex items-center gap-4 text-white">
                <div className="text-primary size-8">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
                  </svg>
                </div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">StreamX402</h2>
              </Link>
              <HeaderAuth />
            </header>

            <main className="flex-1 py-12">
              <div className="flex flex-col gap-10">
                {/* Page Header */}
                <div className="flex flex-wrap justify-between gap-4 px-4">
                  <div className="flex flex-col gap-3">
                    <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                      Set Up Your Creator Channel
                    </h1>
                    <p className="text-white/60 text-base font-normal leading-normal">
                      Let's get your space ready for your first stream. You can always change these details later.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="flex min-w-[84px] cursor-default items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white/10 text-white text-sm font-bold leading-normal tracking-[0.015em]">
                      Step {step} of 3
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-4">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mx-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Step Content */}
                <div className="flex flex-col gap-8">
                  {/* Step 1: Basic Info */}
                  {step === 1 && (
                    <div className="flex p-6 @container border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
                      <div className="flex w-full flex-col gap-6 items-center @[480px]:flex-row @[480px]:items-start @[480px]:gap-8">
                        {/* Avatar Upload */}
                        <div className="flex flex-col gap-4 items-center flex-shrink-0">
                          <div className="relative">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
                              {avatar && (
                                <img
                                  src={avatar}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-full">
                              <span className="material-symbols-outlined text-white text-2xl">camera_alt</span>
                            </div>
                          </div>
                          <label className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white/10 hover:bg-white/20 text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            <span className="truncate">Upload Photo</span>
                          </label>
                        </div>

                        {/* Form Fields */}
                        <div className="flex flex-col gap-6 flex-grow w-full">
                          <label className="flex flex-col w-full">
                            <p className="text-white text-base font-medium leading-normal pb-2">
                              Channel Name <span className="text-red-400">*</span>
                            </p>
                            <input
                              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-14 placeholder:text-white/40 p-[15px] text-base font-normal leading-normal"
                              placeholder="YourAwesomeChannel"
                              value={channelName}
                              onChange={(e) => setChannelName(e.target.value)}
                              required
                              maxLength={50}
                            />
                            <p className="text-white/40 text-xs mt-1">{channelName.length}/50 characters</p>
                          </label>

                          <label className="flex flex-col w-full">
                            <p className="text-white text-base font-medium leading-normal pb-2">
                              Default Stream Title
                            </p>
                            <input
                              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-14 placeholder:text-white/40 p-[15px] text-base font-normal leading-normal"
                              placeholder="My First Stream!"
                              value={defaultStreamTitle}
                              onChange={(e) => setDefaultStreamTitle(e.target.value)}
                              maxLength={100}
                            />
                            <p className="text-white/40 text-xs mt-1">{defaultStreamTitle.length}/100 characters</p>
                          </label>

                          <label className="flex flex-col w-full">
                            <p className="text-white text-base font-medium leading-normal pb-2">
                              Stream Category
                            </p>
                            <div className="relative w-full">
                              <select
                                className="form-select appearance-none w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-14 p-[15px] text-base font-normal leading-normal"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                              >
                                <option value="">Choose a category</option>
                                {CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat.toLowerCase().replace(/\s+/g, "_")}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/60">
                                <span className="material-symbols-outlined">expand_more</span>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Bio & Social Links */}
                  {step === 2 && (
                    <div className="flex flex-col gap-6 p-6 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
                      <label className="flex flex-col w-full">
                        <p className="text-white text-base font-medium leading-normal pb-2">Bio</p>
                        <textarea
                          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-32 placeholder:text-white/40 p-[15px] text-base font-normal leading-normal"
                          placeholder="Tell your audience about yourself and what they can expect from your streams..."
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          maxLength={500}
                        />
                        <p className="text-white/40 text-xs mt-1">{bio.length}/500 characters</p>
                      </label>

                      <div className="flex flex-col gap-4">
                        <p className="text-white text-base font-medium leading-normal">Social Links (Optional)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex flex-col">
                            <p className="text-white/80 text-sm font-normal pb-2">Twitter/X</p>
                            <input
                              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-12 placeholder:text-white/40 p-3 text-sm font-normal leading-normal"
                              placeholder="@yourhandle"
                              value={socialLinks.twitter}
                              onChange={(e) =>
                                setSocialLinks({ ...socialLinks, twitter: e.target.value })
                              }
                            />
                          </label>
                          <label className="flex flex-col">
                            <p className="text-white/80 text-sm font-normal pb-2">YouTube</p>
                            <input
                              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-12 placeholder:text-white/40 p-3 text-sm font-normal leading-normal"
                              placeholder="youtube.com/@yourchannel"
                              value={socialLinks.youtube}
                              onChange={(e) =>
                                setSocialLinks({ ...socialLinks, youtube: e.target.value })
                              }
                            />
                          </label>
                          <label className="flex flex-col">
                            <p className="text-white/80 text-sm font-normal pb-2">Instagram</p>
                            <input
                              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-12 placeholder:text-white/40 p-3 text-sm font-normal leading-normal"
                              placeholder="@yourhandle"
                              value={socialLinks.instagram}
                              onChange={(e) =>
                                setSocialLinks({ ...socialLinks, instagram: e.target.value })
                              }
                            />
                          </label>
                          <label className="flex flex-col">
                            <p className="text-white/80 text-sm font-normal pb-2">Discord</p>
                            <input
                              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-white/5 h-12 placeholder:text-white/40 p-3 text-sm font-normal leading-normal"
                              placeholder="discord.gg/yourserver"
                              value={socialLinks.discord}
                              onChange={(e) =>
                                setSocialLinks({ ...socialLinks, discord: e.target.value })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Payment Setup */}
                  {step === 3 && (
                    <div className="flex flex-col gap-6 p-6 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
                          </div>
                          <div>
                            <h3 className="text-white text-xl font-bold">Payment Address</h3>
                            <p className="text-white/60 text-sm">
                              Your connected wallet will be used to receive payments from viewers
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-white/60 text-xs mb-2">Solana Wallet Address</p>
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                            <p className="text-white font-mono text-sm break-all">{address}</p>
                          </div>
                        </div>

                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-green-400 text-xl">check_circle</span>
                            <div className="flex-1">
                              <p className="text-green-400 font-medium mb-1">Ready to Receive Payments</p>
                              <p className="text-green-400/80 text-sm">
                                Viewers will be able to pay you in USDC on Solana devnet. All payments will be sent directly to this wallet address.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-blue-400 text-xl">info</span>
                            <div className="flex-1">
                              <p className="text-blue-400 font-medium mb-1">Payment Information</p>
                              <p className="text-blue-400/80 text-sm">
                                You can set individual prices for each stream when you go live. Free streams are also supported.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
                  <div>
                    {step > 1 && (
                      <button
                        onClick={handleBack}
                        disabled={loading}
                        className="flex w-full sm:w-auto min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-transparent text-white/70 hover:text-white text-base font-bold leading-normal transition-colors"
                      >
                        <span className="material-symbols-outlined mr-2">arrow_back</span>
                        <span className="truncate">Back</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-4">
                    {step < 3 && (
                      <button
                        onClick={() => router.push("/")}
                        className="flex w-full sm:w-auto min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-transparent text-white/70 hover:text-white text-base font-bold leading-normal transition-colors"
                      >
                        <span className="truncate">Skip for Now</span>
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      disabled={loading || (step === 1 && !channelName.trim())}
                      className="flex w-full sm:w-auto min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-base font-bold leading-normal transition-colors gap-2 shadow-lg shadow-primary/20"
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">sync</span>
                          <span className="truncate">Creating...</span>
                        </>
                      ) : step === 3 ? (
                        <>
                          <span className="truncate">Complete Setup</span>
                          <span className="material-symbols-outlined">check</span>
                        </>
                      ) : (
                        <>
                          <span className="truncate">Continue</span>
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
