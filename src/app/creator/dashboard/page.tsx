"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DashboardStreamPlayer } from "@/components/dashboard-stream-player";
import { Chat } from "@/components/chat";
import { LiveKitRoom } from "@livekit/components-react";
import { TokenContext } from "@/components/token-context";
import { GoLiveDialog } from "@/components/go-live-dialog";
import { useWallet } from "@solana/wallet-adapter-react";

interface AnalyticsData {
  totalViews: number;
  totalEarnings: number;
  totalPayments: number;
  streams: number;
  streamsData: Array<{
    id: string;
    title: string;
    views: number;
    earnings: number;
    payments: number;
  }>;
}

interface EarningsData {
  totalEarnings: number;
  totalPayments: number;
  payments: Array<{
    id: string;
    amount: number;
    createdAt: string;
    stream: {
      title: string;
    };
    payer: {
      username: string;
    };
  }>;
  chartData: Array<{
    date: string;
    amount: number;
  }>;
}

export default function CreatorDashboard() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { publicKey, connected: isConnected } = useWallet();
  const address = publicKey?.toBase58();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalEarnings: 0,
    totalPayments: 0,
    streams: 0,
    streamsData: [],
  });
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    totalPayments: 0,
    payments: [],
    chartData: [],
  });
  const [loading, setLoading] = useState(true);
  const [streamTokens, setStreamTokens] = useState<{
    authToken: string;
    roomToken: string;
    serverUrl: string;
    roomName?: string;
  } | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [hasActiveStream, setHasActiveStream] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      if (!user.isCreator) {
        setLoading(false);
        return;
      }

      // User is authenticated and is a creator, fetch data
      fetchDashboardData();
    }
  }, [isConnected, address, user, authLoading]);

  // Also refresh user data when component mounts to ensure we have latest data
  // This handles the case where profile was just created but context hasn't updated
  useEffect(() => {
    if (isConnected && address && user && !user.isCreator && !authLoading) {
      // User exists but isn't marked as creator - might have just created profile
      // Refresh user data to check if they're now a creator
      refreshUser();
    }
  }, [isConnected, address, user?.isCreator, authLoading, refreshUser]);

  // Check for active stream and get tokens
  useEffect(() => {
    if (isConnected && address && user?.isCreator && !authLoading) {
      checkActiveStream();
    }
  }, [isConnected, address, user?.isCreator, authLoading]);

  const checkActiveStream = async () => {
    if (!address) return;

    try {
      setStreamLoading(true);
      const response = await fetch("/api/creator/stream/tokens", {
        headers: {
          "X-Wallet-Address": address,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStreamTokens({
          authToken: data.authToken,
          roomToken: data.roomToken,
          serverUrl: data.serverUrl,
          roomName: data.stream?.roomName,
        });
        setHasActiveStream(true);
      } else {
        setHasActiveStream(false);
        setStreamTokens(null);
      }
    } catch (error) {
      console.error("Failed to check active stream:", error);
      setHasActiveStream(false);
      setStreamTokens(null);
    } finally {
      setStreamLoading(false);
    }
  };

  const startStream = async (streamData: {
    title: string;
    description?: string;
    category?: string;
    price?: number;
  }) => {
    if (!address || !user) return;

    try {
      setStreamLoading(true);
      const response = await fetch("/api/create_stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {
            creator_identity: address,
            enable_chat: true,
            enable_reactions: true,
            enable_raise_hand: true,
          },
          title: streamData.title,
          description: streamData.description,
          category: streamData.category,
          price: streamData.price,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Get tokens for the new stream
        await checkActiveStream();
      } else {
        const error = await response.json();
        console.error("Failed to create stream:", error);
        alert(error.error || "Failed to start stream");
      }
    } catch (error) {
      console.error("Error starting stream:", error);
      alert("Failed to start stream");
    } finally {
      setStreamLoading(false);
    }
  };

  const endStream = async () => {
    if (!address || !streamTokens?.roomName) {
      alert("Stream information is missing. Please refresh the page.");
      return;
    }

    if (!confirm("Are you sure you want to end the stream? This action cannot be undone.")) {
      return;
    }

    try {
      setStreamLoading(true);
      const response = await fetch("/api/stop_stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wallet-Address": address,
        },
        body: JSON.stringify({
          roomName: streamTokens.roomName,
          creator_identity: address,
        }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        // Clear stream state
        setHasActiveStream(false);
        setStreamTokens(null);
        // Refresh dashboard data
        await fetchDashboardData();
      } else {
        // Try to parse error response
        let errorMessage = "Failed to end stream";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, try to get text
          const text = await response.text().catch(() => "");
          errorMessage = text || errorMessage;
        }
        console.error("Failed to end stream:", { status: response.status, message: errorMessage });
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error ending stream:", error);
      alert(error instanceof Error ? error.message : "Failed to end stream");
    } finally {
      setStreamLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [analyticsRes, earningsRes] = await Promise.all([
        fetch("/api/creator/analytics", {
          headers: {
            "X-Wallet-Address": address,
          },
        }),
        fetch("/api/creator/earnings", {
          headers: {
            "X-Wallet-Address": address,
          },
        }),
      ]);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      } else {
        console.error("Analytics API error:", analyticsRes.status, await analyticsRes.text());
      }

      if (earningsRes.ok) {
        const earningsData = await earningsRes.json();
        setEarnings(earningsData);
      } else {
        console.error("Earnings API error:", earningsRes.status, await earningsRes.text());
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="text-white text-center max-w-md">
          <p className="text-xl mb-4">Wallet Not Connected</p>
          <p className="text-white/60 mb-6">Please connect your wallet to view your dashboard.</p>
          <a href="/auth" className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors">
            Connect Wallet
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="text-white text-center max-w-md">
          <p className="text-xl mb-4">Not Authenticated</p>
          <p className="text-white/60 mb-6">Please sign in to access your dashboard.</p>
          <a href="/auth" className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (!user.isCreator) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="text-white text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="size-24 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-white/40">person_add</span>
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Become a Creator</h2>
          <p className="text-white/60 mb-6">
            Set up your creator profile to start streaming and earning from your content.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/creator/setup"
              className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors"
            >
              Set Up Creator Profile
            </a>
            <button
              onClick={async () => {
                await refreshUser();
              }}
              className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="text-center">
          <div className="inline-block size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
      {/* SideNavBar */}
      <aside className="w-64 flex-shrink-0 bg-white/5 dark:bg-background-dark border-r border-white/10 dark:border-white/10 p-4 flex flex-col justify-between">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-purple-500 to-pink-500">
              {user?.avatar && (
                <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-base font-medium leading-normal">
                {user?.username || "Creator"}
              </h1>
              <p className="text-green-400 text-sm font-normal leading-normal flex items-center gap-1.5">
                <span className="size-2 bg-green-400 rounded-full"></span>
                {user?.isCreator ? "Creator" : "Viewer"}
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary text-white" href="#">
              <span className="material-symbols-outlined fill">dashboard</span>
              <p className="text-sm font-medium leading-normal">Dashboard</p>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg" href="#">
              <span className="material-symbols-outlined">bar_chart_4_bars</span>
              <p className="text-sm font-medium leading-normal">Analytics</p>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg" href="#">
              <span className="material-symbols-outlined">group</span>
              <p className="text-sm font-medium leading-normal">Community</p>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg" href="#">
              <span className="material-symbols-outlined">settings_input_component</span>
              <p className="text-sm font-medium leading-normal">Stream Manager</p>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg" href="#">
              <span className="material-symbols-outlined">settings</span>
              <p className="text-sm font-medium leading-normal">Settings</p>
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-1">
          <a className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg" href="#">
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Logout</p>
          </a>
        </div>
      </aside>
      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-zinc-950 scroll-smooth p-6 flex flex-col">
        <header className="mb-4 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user?.username || "Creator"}! Your analytics are below.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {/* Stream Player Section - Fixed 65% viewport height */}
          <div className="h-[65vh] shrink-0 bg-black rounded-xl border border-white/10 overflow-hidden shadow-xl relative group">
            {streamTokens && hasActiveStream ? (
              <DashboardStreamPlayer
                authToken={streamTokens.authToken}
                roomToken={streamTokens.roomToken}
                serverUrl={streamTokens.serverUrl}
                showChat={true}
                onEndStream={endStream}
              />
            ) : (
              <div className="w-full h-full">
                <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
                  {streamLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-white">Loading stream...</p>
                    </div>
                  ) : (
                    <div className="text-center z-10">
                      <p className="text-gray-500 text-sm mb-6">Start your camera to begin streaming</p>

                      <div className="flex justify-center gap-4 mb-8">
                        <div className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-3xl">videocam_off</span>
                          <span className="text-xs">Camera</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-3xl">mic_off</span>
                          <span className="text-xs">Mic</span>
                        </div>
                      </div>

                      <GoLiveDialog
                        onGoLive={startStream}
                        loading={streamLoading}
                        defaultTitle={user.creatorProfile?.defaultStreamTitle || `${user.username}'s Stream`}
                        defaultCategory={user.creatorProfile?.category || ""}
                      >
                        <button className="px-6 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20">
                          Go Live
                        </button>
                      </GoLiveDialog>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats - Fixed height bottom row */}
          {/* <div className="grid grid-cols-4 gap-4 h-24 shrink-0">
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4 flex flex-col justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold dark:text-white">{analytics?.totalViews.toLocaleString() || "0"}</span>
                <div className="flex items-center text-xs text-gray-400 gap-1">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  All time
                </div>
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4 flex flex-col justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earnings</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold dark:text-white">${earnings?.totalEarnings.toFixed(2) || "0.00"}</span>
                <div className="flex items-center text-xs text-gray-400 gap-1">
                  <span className="material-symbols-outlined text-sm">monetization_on</span>
                  USDC
                </div>
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4 flex flex-col justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold dark:text-white">00:48</span>
                <div className="flex items-center text-xs text-green-400 gap-1">
                  <span className="material-symbols-outlined text-sm">access_alarm</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4 flex flex-col justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Stream Status</span>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-green-400">Excellent</span>
                <div className="flex items-center text-xs text-gray-400 gap-1">
                  <span className="material-symbols-outlined text-sm">wifi</span>
                  6000 kbps
                </div>
              </div>
            </div>
          </div> */}
        </div>
        {/* Closing main tag removed from original, will be closed by existing code or next replacement */}
        {/* Charts Section */}
        {/*
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 flex flex-col overflow-hidden">
            <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-4">Earnings Over Time</h2>
            <div className="h-[300px] w-full min-w-0 overflow-hidden">
              {earnings.chartData.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                  <LineChart data={earnings.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#888"
                      tick={{ fill: "#888", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888"
                      tick={{ fill: "#888", fontSize: 12 }}
                      tickFormatter={(value: any) => `$${value}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#fff" }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#9146FF"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "#9146FF" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">show_chart</span>
                  <p>No earnings data yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 flex flex-col overflow-hidden">
            <h2 className="text-gray-900 dark:text-white text-lg font-bold mb-4">Stream Performance</h2>
            <div className="h-[300px] w-full min-w-0 overflow-hidden">
              {analytics.streamsData.length > 0 ? (
                <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                  <BarChart data={analytics.streamsData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                      dataKey="title"
                      stroke="#888"
                      tick={{ fill: "#888", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="#888"
                      tick={{ fill: "#888", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#ffffff10' }}
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#fff" }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Bar dataKey="views" fill="#9146FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">bar_chart</span>
                  <p>No stream data yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
        */}

        {/* Payment History */}
        {/*
        {earnings.payments.length > 0 ? (
          <div className="rounded-xl p-6 bg-card-dark border border-white/10">
            <h2 className="text-white text-xl font-bold mb-4">Recent Payments</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {earnings.payments.slice(0, 10).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-background-dark rounded-lg border border-white/10"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{payment.stream.title}</p>
                    <p className="text-gray-400 text-sm">
                      From {payment.payer.username || "Anonymous"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(payment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">
                      ${payment.amount.toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-xs">USDC</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-12 bg-card-dark border border-white/10 text-center">
            <div className="mb-6 flex justify-center">
              <div className="size-20 rounded-full bg-gradient-to-br from-green-600/20 to-teal-600/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-white/40">payments</span>
              </div>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">No Payments Yet</h3>
            <p className="text-white/60">
              Payments from viewers will appear here once you start receiving them.
            </p>
          </div>
        )}
        */}
      </main>
    </div>
  );
}

