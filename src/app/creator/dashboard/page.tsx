"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSolana } from "@/components/solana-provider";
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
  const { address, isConnected } = useSolana();
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

  const startStream = async () => {
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
          title: user.creatorProfile?.defaultStreamTitle || `${user.username}'s Stream`,
          category: user.creatorProfile?.category || undefined,
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
      <main className="flex-1 p-8 grid grid-cols-3 gap-6">
        {/* Central Column */}
        <div className="col-span-3 lg:col-span-2 flex flex-col gap-6">
          {/* PageHeading */}
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Dashboard</h1>
              <p className="text-gray-400 text-base font-normal leading-normal">
                Welcome back, {user?.username || "Creator"}! Your analytics are below.
              </p>
            </div>
          </div>
          {/* Stream Player Section */}
          <div className="w-full">
            {streamTokens && hasActiveStream ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Stream Player - Takes 2 columns on large screens */}
                <div className="lg:col-span-2 bg-card-dark rounded-xl border border-white/10 overflow-hidden">
                  <div className="w-full aspect-video">
                    <DashboardStreamPlayer
                      authToken={streamTokens.authToken}
                      roomToken={streamTokens.roomToken}
                      serverUrl={streamTokens.serverUrl}
                      showChat={false}
                      onEndStream={endStream}
                    />
                  </div>
                </div>

                {/* Chat Sidebar - Always visible */}
                <div className="lg:col-span-1 bg-card-dark rounded-xl border border-white/10 flex flex-col h-full min-h-[400px] lg:min-h-[600px]">
                  <div className="p-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg">Chat</h3>
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <span className="material-symbols-outlined text-base">group</span>
                        <span>Viewers</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TokenContext.Provider value={streamTokens.authToken}>
                      <LiveKitRoom serverUrl={streamTokens.serverUrl} token={streamTokens.roomToken}>
                        <div className="h-full w-full">
                          <Chat />
                        </div>
                      </LiveKitRoom>
                    </TokenContext.Provider>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Empty Stream Area */}
                <div className="lg:col-span-2 bg-card-dark rounded-xl border border-white/10 overflow-hidden">
                  <div className="relative flex items-center justify-center aspect-video bg-gradient-to-br from-purple-600/20 to-blue-600/20">
                    {streamLoading ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="size-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white">Loading stream...</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <button
                          onClick={startStream}
                          className="flex items-center justify-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors mb-4 mx-auto"
                        >
                          <span className="material-symbols-outlined text-2xl">live_tv</span>
                          <span className="text-lg">Go Live</span>
                        </button>
                        <p className="text-white/60 text-sm">Start streaming to your audience</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Empty Chat Area */}
                <div className="lg:col-span-1 bg-card-dark rounded-xl border border-white/10 flex flex-col h-full min-h-[400px] lg:min-h-[600px]">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-white font-bold text-lg">Chat</h3>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-white/40 text-sm">Chat will appear when you go live</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2 rounded-xl p-4 bg-card-dark border border-white/10">
              <p className="text-gray-300 text-sm font-medium leading-normal">Total Views</p>
              <p className="text-white tracking-light text-2xl font-bold leading-tight">
                {analytics?.totalViews.toLocaleString() || "0"}
              </p>
              <p className="text-green-400 text-sm font-medium leading-normal flex items-center gap-1">
                <span className="material-symbols-outlined text-base">visibility</span>
                All time
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-4 bg-card-dark border border-white/10">
              <p className="text-gray-300 text-sm font-medium leading-normal">Total Earnings</p>
              <p className="text-white tracking-light text-2xl font-bold leading-tight">
                ${earnings?.totalEarnings.toFixed(2) || "0.00"}
              </p>
              <p className="text-green-400 text-sm font-medium leading-normal flex items-center gap-1">
                <span className="material-symbols-outlined text-base">monetization_on</span>
                USDC
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-4 bg-card-dark border border-white/10">
              <p className="text-gray-300 text-sm font-medium leading-normal">Total Payments</p>
              <p className="text-white tracking-light text-2xl font-bold leading-tight">
                {earnings?.totalPayments.toLocaleString() || "0"}
              </p>
              <p className="text-gray-400 text-sm font-medium leading-normal flex items-center gap-1">
                <span className="material-symbols-outlined text-base">payments</span>
                Completed
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-4 bg-card-dark border border-white/10">
              <p className="text-gray-300 text-sm font-medium leading-normal">Streams</p>
              <p className="text-white tracking-light text-2xl font-bold leading-tight">
                {analytics?.streams.toLocaleString() || "0"}
              </p>
              <p className="text-gray-400 text-sm font-medium leading-normal flex items-center gap-1">
                <span className="material-symbols-outlined text-base">video_library</span>
                Created
              </p>
            </div>
          </div>

          {/* Empty State for Charts */}
          {(!earnings || earnings.chartData.length === 0) && (!analytics || analytics.streamsData.length === 0) && (
            <div className="rounded-xl p-12 bg-card-dark border border-white/10 text-center">
              <div className="mb-6 flex justify-center">
                <div className="size-20 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-white/40">bar_chart</span>
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">No Data Yet</h3>
              <p className="text-white/60 mb-6">
                Start streaming to see your analytics and earnings data here.
              </p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors"
              >
                Go Live
              </a>
            </div>
          )}

          {/* Earnings Chart */}
          {earnings.chartData.length > 0 && (
            <div className="rounded-xl p-6 bg-card-dark border border-white/10">
              <h2 className="text-white text-xl font-bold mb-4">Earnings Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={earnings.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff60"
                    tick={{ fill: "#ffffff60" }}
                  />
                  <YAxis
                    stroke="#ffffff60"
                    tick={{ fill: "#ffffff60" }}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #ffffff20",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#ffffff" }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Earnings"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#a855f7"
                    strokeWidth={2}
                    name="Earnings (USDC)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stream Performance Chart */}
          {analytics.streamsData.length > 0 && (
            <div className="rounded-xl p-6 bg-card-dark border border-white/10">
              <h2 className="text-white text-xl font-bold mb-4">Stream Performance</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.streamsData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="title"
                    stroke="#ffffff60"
                    tick={{ fill: "#ffffff60", fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    stroke="#ffffff60"
                    tick={{ fill: "#ffffff60" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #ffffff20",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#ffffff" }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="#8b5cf6" name="Views" />
                  <Bar dataKey="earnings" fill="#10b981" name="Earnings (USDC)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment History */}
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
        </div>
        {/* Right Column */}
        <div className="col-span-3 lg:col-span-1 flex flex-col gap-6">

          {/* Activity Feed - Only show if no active stream */}
          {!hasActiveStream && (
            <div className="bg-card-dark rounded-xl border border-white/10 flex flex-col h-[400px]">
              <h2 className="text-lg font-bold p-4 border-b border-white/10 text-white">Activity Feed</h2>
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="flex items-start gap-3">
                  <div className="text-primary mt-1"><span className="material-symbols-outlined">favorite</span></div>
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      <span className="font-bold">StreamFan_99</span> followed you!
                    </p>
                    <p className="text-xs text-gray-400">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-yellow-400 mt-1"><span className="material-symbols-outlined">star</span></div>
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      <span className="font-bold">GenerousGamer</span> subscribed (Tier 1)!
                    </p>
                    <p className="text-xs text-gray-400">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-red-500 mt-1"><span className="material-symbols-outlined">paid</span></div>
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      <span className="font-bold">BigSpender</span> donated $50!
                    </p>
                    <p className="text-xs text-gray-400">8 minutes ago</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

