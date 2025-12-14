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

function StreamContent({ onEndStream }: { onEndStream?: () => void }) {
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
    <div className="relative w-full h-full bg-black">
      {/* Connection State Overlay */}
      {connectionState !== ConnectionState.Connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center text-white">
            <div className="size-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
            <p>Connecting to room...</p>
          </div>
        </div>
      )}

      {/* Creator's Video (only show local participant's video) */}
      <div className="w-full h-full">
        {localCameraTracks.length > 0 ? (
          <div className="w-full h-full relative">
            {localCameraTracks.map((track) => (
              <VideoTrack
                key={track.participant.identity}
                trackRef={track}
                className="w-full h-full object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20">
            <div className="text-center text-white/60">
              <div className="size-24 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
                <span className="material-symbols-outlined text-6xl text-white/40">videocam_off</span>
              </div>
              <p className="text-lg mb-2 font-medium">Camera Off</p>
              <p className="text-sm">Start your camera to begin streaming</p>
            </div>
          </div>
        )}
      </div>

      {/* Audio Tracks */}
      {microphoneTracks.map((track) => (
        <AudioTrack key={track.participant.identity} trackRef={track} />
      ))}

      {/* Room Audio Renderer */}
      <RoomAudioRenderer />

      {/* Stream Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Connection Quality */}
            {localParticipant && (
              <ParticipantContextIfNeeded participant={localParticipant}>
                <div className="flex items-center gap-2">
                  <ConnectionQualityIndicator className="text-white" />
                </div>
              </ParticipantContextIfNeeded>
            )}
            
            {/* Live Status */}
            {connectionState === ConnectionState.Connected && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/90 rounded-full">
                <div className="size-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-bold">LIVE</span>
              </div>
            )}

            {/* Viewer Count */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-lg">
              <span className="material-symbols-outlined text-white text-lg">visibility</span>
              <span className="text-white text-sm font-medium">{viewerCount > 0 ? viewerCount.toLocaleString() : '0'}</span>
            </div>
          </div>

          {/* Media Controls */}
          <div className="flex items-center gap-2">
            {/* Video Toggle */}
            <TrackToggle 
              source={Track.Source.Camera} 
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-3 transition-colors"
              aria-label="Toggle camera"
            >
              <span className="material-symbols-outlined">videocam</span>
            </TrackToggle>
            
            {/* Audio Toggle */}
            <TrackToggle 
              source={Track.Source.Microphone} 
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-3 transition-colors"
              aria-label="Toggle microphone"
            >
              <span className="material-symbols-outlined">mic</span>
            </TrackToggle>

            {/* End Stream Button */}
            {onEndStream && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEndStream();
                }}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-3 transition-colors flex items-center gap-2 font-medium"
                aria-label="End stream"
              >
                <span className="material-symbols-outlined text-lg">stop</span>
                <span className="hidden sm:inline">End Stream</span>
              </button>
            )}
          </div>
        </div>
      </div>

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
  showChat = false,
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
      >
        <div className="w-full h-full flex flex-col bg-black">
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <StreamContent onEndStream={onEndStream} />
          </div>
          <ReactionBar />
        </div>
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}
