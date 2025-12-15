"use client";

import { RoomMetadata } from "@/lib/controller";
import {
  ReceivedChatMessage,
  useChat,
  useLocalParticipant,
  useRoomInfo,
} from "@livekit/components-react";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useMemo, useState, useEffect, useRef } from "react";
import classNames from "classnames";

export interface ChatProps {
  variant?: "default" | "overlay";
  className?: string;
}

function ChatMessage({ message, variant = "default" }: { message: ReceivedChatMessage; variant?: "default" | "overlay" }) {
  const { localParticipant } = useLocalParticipant();
  const isOwnMessage = localParticipant.identity === message.from?.identity;

  // Colors for usernames in overlay mode to distinguish them
  const colors = [
    "text-blue-400", "text-green-400", "text-pink-400", "text-orange-400",
    "text-purple-400", "text-teal-400", "text-red-400", "text-yellow-400"
  ];
  const colorIndex = useMemo(() => {
    return Array.from(message.from?.identity || "").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  }, [message.from?.identity]);

  if (variant === "overlay") {
    return (
      <div className="py-1 px-2 rounded hover:bg-white/5 transition-colors group">
        <span className={`font-bold text-xs ${colors[colorIndex]} mr-1`}>
          {message.from?.identity ?? "Unknown"}
        </span>
        <span className="text-xs text-gray-200">
          {message.message}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
        {message.from?.identity?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${isOwnMessage ? 'text-primary' : 'text-white/60'
            }`}>
            {message.from?.identity ?? "Unknown"}
          </span>
        </div>
        <div className={`px-3 py-2 rounded-lg ${isOwnMessage
          ? 'bg-primary/20 text-white'
          : 'bg-white/5 text-white/90'
          } break-words max-w-[85%]`}>
          <p className="text-sm">{message.message}</p>
        </div>
      </div>
    </div>
  );
}

export function Chat({ variant = "default", className }: ChatProps) {
  const [draft, setDraft] = useState("");
  const { chatMessages, send } = useChat();
  const { metadata } = useRoomInfo();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { enable_chat: chatEnabled = true } = (
    metadata ? JSON.parse(metadata) : {}
  ) as RoomMetadata;

  // HACK: why do we get duplicate messages?
  const messages = useMemo(() => {
    const timestamps = chatMessages.map((msg) => msg.timestamp);
    const filtered = chatMessages.filter(
      (msg, i) => !timestamps.includes(msg.timestamp, i + 1)
    );

    return filtered;
  }, [chatMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const onSend = async () => {
    if (draft.trim().length && send) {
      setDraft("");
      await send(draft);
    }
  };

  if (variant === "overlay") {
    return (
      <div className={classNames("flex flex-col h-full pointer-events-auto", className)}>
        {/* Chat Messages Area with Mask */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-end space-y-1 mb-2 px-2"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black 15%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%)"
          }}
        >
          {messages.length === 0 ? (
            <div className="py-1 px-2 text-white/40 text-xs italic">Welcome to the chat!</div>
          ) : (
            messages.map((msg) => (
              <ChatMessage message={msg} key={msg.timestamp} variant="overlay" />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-2 shadow-lg mx-2 mb-2">
          <div className="relative">
            <input
              className="w-full bg-zinc-800/80 border-none rounded-md py-2.5 pl-3 pr-10 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-primary transition-all outline-none"
              placeholder={chatEnabled ? "Send me a message..." : "Chat disabled"}
              type="text"
              disabled={!chatEnabled}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={onSend}
                disabled={!draft.trim() || !chatEnabled}
                className="p-1 text-gray-400 hover:text-white transition-colors rounded disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classNames("flex flex-col h-full bg-background-dark", className)}>
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/40 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage message={msg} key={msg.timestamp} variant="default" />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-white/10 bg-background-dark">
        <div className="flex gap-2">
          <input
            type="text"
            disabled={!chatEnabled}
            placeholder={chatEnabled ? "Type a message..." : "Chat is disabled"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={onSend}
            disabled={!draft.trim().length || !chatEnabled}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
