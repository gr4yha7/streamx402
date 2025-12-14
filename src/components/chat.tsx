"use client";

import { RoomMetadata } from "@/lib/controller";
import {
  ReceivedChatMessage,
  useChat,
  useLocalParticipant,
  useRoomInfo,
} from "@livekit/components-react";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useMemo, useState } from "react";

function ChatMessage({ message }: { message: ReceivedChatMessage }) {
  const { localParticipant } = useLocalParticipant();
  const isOwnMessage = localParticipant.identity === message.from?.identity;

  return (
    <div className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
        {message.from?.identity?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${
            isOwnMessage ? 'text-primary' : 'text-white/60'
          }`}>
            {message.from?.identity ?? "Unknown"}
          </span>
        </div>
        <div className={`px-3 py-2 rounded-lg ${
          isOwnMessage 
            ? 'bg-primary/20 text-white' 
            : 'bg-white/5 text-white/90'
        } break-words max-w-[85%]`}>
          <p className="text-sm">{message.message}</p>
        </div>
      </div>
    </div>
  );
}

export function Chat() {
  const [draft, setDraft] = useState("");
  const { chatMessages, send } = useChat();
  const { metadata } = useRoomInfo();

  const { enable_chat: chatEnabled } = (
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

  const onSend = async () => {
    if (draft.trim().length && send) {
      setDraft("");
      await send(draft);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background-dark">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/40 text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage message={msg} key={msg.timestamp} />
          ))
        )}
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
