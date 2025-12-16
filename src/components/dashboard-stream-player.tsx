"use client";

import { Chat } from "@/components/chat";
import { ReactionBar } from "@/components/reaction-bar";
import { TokenContext } from "@/components/token-context";
import { LiveKitRoom } from "@livekit/components-react";
import {
  RoomAudioRenderer,
  ConnectionQualityIndicator,
  useConnectionState,
  useParticipants,
  useLocalParticipant,
  StartAudio,
  TrackToggle,
  VideoTrack,
  AudioTrack,
  useTracks,
  useStartVideo,
  ParticipantContextIfNeeded,
} from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";

interface DashboardStreamPlayerProps {
  authToken: string;
  roomToken: string;
  serverUrl: string;
  showChat?: boolean;
  onEndStream?: () => void;
}

function StartVideoButton() {
  const startVideoProps = useStartVideo({ props: { className: "" } });
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  if (cameraTracks.length > 0 || connectionState !== ConnectionState.Connected) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
      <div className="text-center text-white">
        <button
          {...startVideoProps.mergedProps}
          className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-3 font-bold flex items-center gap-2 mx-auto"
        >
          <span className="material-symbols-outlined">videocam</span>
          Start Camera
        </button>
      </div>
    </div>
  );
}

function StreamContent({ onEndStream, showChat }: { onEndStream?: () => void; showChat?: boolean }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  // Only get local participant's camera track (creator's video)
  const localCameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  }).filter((track) => track.participant.identity === localParticipant?.identity);

  const microphoneTracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: false,
  });

  // Count viewers (excluding the creator)
  const viewerCount = participants.length - 1;

  return (
    <div className="relative w-full h-full bg-black group">
      {/* Connection State Overlay */}
      {connectionState !== ConnectionState.Connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center text-white">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="font-medium text-gray-400">Connecting to room...</p>
          </div>
        </div>
      )}

      {/* Creator's Video (only show local participant's video) */}
      <div className="w-full h-full">
        {localCameraTracks.length > 0 && (
          <div className="w-full h-full relative">
            {localCameraTracks.map((track) => (
              <VideoTrack
                key={track.participant.identity}
                trackRef={track}
                className="w-full h-full object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {/* Audio Tracks */}
      {microphoneTracks.map((track) => (
        <AudioTrack key={track.participant.identity} trackRef={track} />
      ))}

      {/* Room Audio Renderer */}
      <RoomAudioRenderer />

      {/* Live Badge & Viewer Count (Top Left) */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        {connectionState === ConnectionState.Connected && (
          <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-mono text-gray-300 flex items-center gap-2 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            LIVE
          </div>
        )}
        <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-mono text-gray-300 flex items-center gap-2 border border-white/10">
          <span className="material-symbols-outlined text-sm">visibility</span>
          {viewerCount > 0 ? viewerCount.toLocaleString() : '0'}
        </div>
        {localParticipant?.identity && (
          <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-mono text-purple-300 border border-purple-500/30">
            {localParticipant.identity}
          </div>
        )}
      </div>

      {/* Stream Controls Overlay (Bottom) */}
      {/* Hide controls when hovering specifically over the chat area to prevent intersection, or just keep them z-30 */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 opacity-100 transition-opacity duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {localParticipant && (
              <ParticipantContextIfNeeded participant={localParticipant}>
                <div className="flex items-center gap-2">
                  <ConnectionQualityIndicator className="text-white" />
                </div>
              </ParticipantContextIfNeeded>
            )}
          </div>

          {/* Media Controls */}
          <div className="flex items-center gap-2">
            <TrackToggle
              source={Track.Source.Camera}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-3 transition-colors"
            />

            <TrackToggle
              source={Track.Source.Microphone}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-3 transition-colors"
            />

            {onEndStream && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEndStream();
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-3 transition-colors flex items-center gap-2 font-medium"
              >
                <span className="material-symbols-outlined text-lg">stop_circle</span>
                <span className="hidden sm:inline">End Stream</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="absolute top-0 bottom-0 right-0 w-80 z-20 pointer-events-none flex flex-col">
          {/* Gradient background for readability */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent pointer-events-none" />
          <div className="flex-1 relative z-10 pointer-events-auto pb-16"> {/* pb-16 to avoid overlapping controls */}
            <Chat variant="overlay" />
          </div>
        </div>
      )}

      {/* Start Media Buttons (shown when not started) */}
      <StartVideoButton />

      <StartAudio
        label="Click to allow audio playback"
        className="absolute inset-0 flex items-center justify-center bg-black/80 z-30"
      />
    </div>
  );
}

export function DashboardStreamPlayer({
  authToken,
  roomToken,
  serverUrl,
  showChat = true,
  onEndStream,
}: DashboardStreamPlayerProps) {
  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={roomToken}
        video={true}
        audio={true}
        connect={true}
        className="size-full"
      >
        <div className="w-full h-full flex flex-col bg-black">
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <StreamContent onEndStream={onEndStream} showChat={showChat} />
          </div>
          <ReactionBar />
        </div>
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}
