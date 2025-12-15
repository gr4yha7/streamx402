"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSolana } from "@/components/solana-provider";
import { useAuth } from "@/contexts/auth-context";
import { HeaderAuth } from "@/components/header-auth";
import { BroadcastDialog } from "@/components/broadcast-dialog";

interface Stream {
  id: string;
  roomName: string;
  title: string;
  description?: string;
  category?: string;
  thumbnail?: string;
  price?: number;
  paymentRequired: boolean;
  viewerCount: number;
  isLive: boolean;
  creator: {
    id: string;
    username: string;
    avatar?: string;
    channelName: string;
  };
  createdAt: string;
  startedAt?: string;
}

const CATEGORIES = [
  "All",
  "Gaming",
  "Music",
  "Just Chatting",
  "Art",
  "Cooking",
  "Education",
  "Sports",
  "Tech",
  "Entertainment",
  "Other",
];

const SORT_OPTIONS = [
  { value: "viewerCount", label: "Viewers (High to Low)" },
  { value: "viewerCount-asc", label: "Viewers (Low to High)" },
  { value: "createdAt", label: "Newest First" },
  { value: "createdAt-asc", label: "Oldest First" },
  { value: "title", label: "Title (A-Z)" },
];

export default function HomePage() {
  const { address } = useSolana();
  const { user } = useAuth();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("viewerCount");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Real-time stream updates using Server-Sent Events
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      // Build query params for filtering
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedCategory && selectedCategory !== "All") params.set("category", selectedCategory);

      const [sortField, sortOrder] = sortBy.includes("-")
        ? sortBy.split("-")
        : [sortBy, "desc"];
      params.set("sortBy", sortField);
      params.set("sortOrder", sortOrder === "asc" ? "asc" : "desc");

      // If filters are active, use regular API instead of SSE
      if (debouncedSearch || (selectedCategory && selectedCategory !== "All")) {
        fetchStreams();
        return;
      }

      // Connect to SSE endpoint for real-time updates
      eventSource = new EventSource("/api/streams/live-updates");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "streams") {
            setStreams(data.data || []);
            setLoading(false);
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        eventSource?.close();
        // Fallback to regular fetch on error
        fetchStreams();
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, [debouncedSearch, selectedCategory, sortBy]);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (selectedCategory && selectedCategory !== "All") params.set("category", selectedCategory);

      const [sortField, sortOrder] = sortBy.includes("-")
        ? sortBy.split("-")
        : [sortBy, "desc"];
      params.set("sortBy", sortField);
      params.set("sortOrder", sortOrder === "asc" ? "asc" : "desc");

      const res = await fetch(`/api/streams/search?${params.toString()}`);
      const data = await res.json();
      setStreams(data.streams || []);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display">
      <div className="flex h-full grow">
        {/* SideNavBar */}
        <aside className="w-64 flex-shrink-0 bg-[#261933] p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 text-white pl-3">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
                </svg>
              </div>
              <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">StreamX402</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 px-3">
              <p className="text-[#ad92c9] text-sm font-normal leading-normal">FILTERS</p>

              {/* Category Filter */}
              <div>
                <label className="text-white text-xs font-medium mb-2 block">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#362348] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="text-white text-xs font-medium mb-2 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-[#362348] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <nav className="flex flex-col gap-2">
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/30" href="#">
                <span className="material-symbols-outlined text-white fill">favorite</span>
                <p className="text-white text-sm font-medium leading-normal">Following</p>
              </a>
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10" href="#">
                <span className="material-symbols-outlined text-white">explore</span>
                <p className="text-white text-sm font-medium leading-normal">Browse</p>
              </a>
            </nav>
            <div className="flex flex-col gap-2">
              <p className="text-[#ad92c9] text-sm font-normal leading-normal px-3">FOLLOWED CHANNELS</p>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="relative">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-gradient-to-br from-purple-500 to-blue-500"></div>
                  <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-red-500 border-2 border-[#261933] rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium leading-normal truncate">NinjaStreamz</p>
                  <p className="text-[#ad92c9] text-xs font-normal leading-normal truncate">Valorant</p>
                </div>
                <p className="text-white text-sm">15.3k</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="relative">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-gradient-to-br from-pink-500 to-red-500"></div>
                  <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-red-500 border-2 border-[#261933] rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium leading-normal truncate">AlishaRay</p>
                  <p className="text-[#ad92c9] text-xs font-normal leading-normal truncate">Art</p>
                </div>
                <p className="text-white text-sm">4.8k</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 opacity-60">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 bg-gradient-to-br from-green-500 to-teal-500"></div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium leading-normal truncate">xGamerPro</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {user?.isCreator && (
              <BroadcastDialog>
                <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] mb-2">
                  <span className="material-symbols-outlined text-lg mr-2">videocam</span>
                  <span className="truncate">Go Live</span>
                </button>
              </BroadcastDialog>
            )}
            <Link
              href="/creator/setup"
              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white/10 hover:bg-white/20 text-white text-sm font-medium leading-normal tracking-[0.015em] transition-colors"
            >
              <span className="truncate">{user?.isCreator ? "Setup" : "Become Creator"}</span>
            </Link>
          </div>
        </aside>
        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* TopNavBar */}
          <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#362348] px-10 py-3 bg-background-dark">
            <div className="flex-1 max-w-lg">
              <label className="flex flex-col w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-10 p-2 bg-[#362348]">
                  <div className="text-[#ad92c9] flex items-center justify-center pl-4">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </div>
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-[#ad92c9] px-4 pl-2 text-base font-normal leading-normal"
                    placeholder="Search channels, categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </label>
            </div>
            <div className="flex flex-1 justify-end items-center gap-4">
              {/* <div className="flex gap-2">
                <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#362348] text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-white/20">
                  <span className="material-symbols-outlined text-white text-[20px]">notifications</span>
                </button>
                <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-[#362348] text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-white/20">
                  <span className="material-symbols-outlined text-white text-[20px]">chat_bubble</span>
                </button>
              </div> */}
              <HeaderAuth />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-8">
            {/* Carousel - Featured Streams */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-white/60">Loading streams...</p>
              </div>
            ) : streams.length > 0 ? (
              <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-8 -mx-4">
                <div className="flex items-stretch px-4 gap-6">
                  {streams.slice(0, 3).map((stream) => (
                    <div key={stream.id} className="flex h-full flex-1 flex-col gap-4 rounded-lg bg-[#261933] shadow-[0_0_4px_rgba(0,0,0,0.1)] min-w-80">
                      <div
                        className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg flex flex-col bg-gradient-to-br from-purple-600 to-blue-600 relative"
                        style={stream.thumbnail ? { backgroundImage: `url(${stream.thumbnail})` } : {}}
                      >
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">LIVE</div>
                          <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">{stream.viewerCount} viewers</div>
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 justify-between p-4 pt-0 gap-4">
                        <div>
                          <p className="text-white text-base font-medium leading-normal">{stream.title}</p>
                          <p className="text-[#ad92c9] text-sm font-normal leading-normal">
                            {stream.description || `Join ${stream.creator.channelName} for an amazing stream.`}
                          </p>
                          {stream.paymentRequired && stream.price && (
                            <p className="text-primary text-xs font-medium mt-1">{stream.price} USDC to watch</p>
                          )}
                        </div>
                        <Link
                          href={`/watch/${stream.roomName}`}
                          className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]"
                        >
                          <span className="truncate">Watch Now</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-white/60">No live streams at the moment</p>
              </div>
            )}
            {/* SectionHeader */}
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
              {streams.length > 0 ? "Live Channels We Think You'll Like" : "All Streams"}
            </h2>
            {/* ImageGrid */}
            {loading ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 p-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex flex-col gap-3 animate-pulse">
                    <div className="w-full aspect-video bg-[#261933] rounded-lg"></div>
                    <div className="h-4 bg-[#261933] rounded w-3/4"></div>
                    <div className="h-3 bg-[#261933] rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : streams.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 p-4">
                {streams.map((stream) => {
                  const gradientClasses = [
                    "from-blue-600 to-purple-600",
                    "from-pink-600 to-red-600",
                    "from-yellow-600 to-orange-600",
                    "from-green-600 to-teal-600",
                    "from-indigo-600 to-purple-600",
                    "from-red-600 to-pink-600",
                  ];
                  const gradient = gradientClasses[streams.indexOf(stream) % gradientClasses.length];

                  return (
                    <Link key={stream.id} href={`/watch/${stream.roomName}`} className="flex flex-col gap-3 group">
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                        {stream.thumbnail ? (
                          <img
                            src={stream.thumbnail}
                            alt={stream.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${gradient}`}></div>
                        )}
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                          <div className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">LIVE</div>
                          <div className="bg-black/50 text-white text-xs px-2 py-0.5 rounded">{stream.viewerCount} viewers</div>
                        </div>
                        {stream.paymentRequired && (
                          <div className="absolute top-2 right-2 bg-primary/90 text-white text-xs font-bold px-2 py-0.5 rounded">
                            {stream.price} USDC
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white text-base font-medium leading-normal group-hover:text-primary transition-colors">
                          {stream.title}
                        </p>
                        <p className="text-[#ad92c9] text-sm font-normal leading-normal">
                          {stream.category || "Uncategorized"}
                        </p>
                        <p className="text-[#ad92c9] text-sm font-normal leading-normal">
                          {stream.creator.channelName} • {stream.viewerCount.toLocaleString()} viewers
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="text-center max-w-md">
                  <div className="mb-6 flex justify-center">
                    <div className="size-24 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-white/40">live_tv</span>
                    </div>
                  </div>
                  <h2 className="text-white text-2xl font-bold mb-2">No Live Streams Yet</h2>
                  <p className="text-white/60 text-base mb-6">
                    Be the first to go live! Start streaming and share your content with the community.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/auth"
                      className="flex items-center justify-center rounded-lg h-12 px-6 bg-primary hover:bg-primary/90 text-white text-base font-bold transition-colors"
                    >
                      Get Started
                    </Link>
                    {address && (
                      <Link
                        href="/creator/setup"
                        className="flex items-center justify-center rounded-lg h-12 px-6 bg-white/10 hover:bg-white/20 text-white text-base font-medium transition-colors"
                      >
                        Become a Creator
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
