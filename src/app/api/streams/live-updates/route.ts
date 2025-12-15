import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoomServiceClient } from "livekit-server-sdk";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      // Send initial stream data
      const sendStreams = async () => {
        // Don't send if controller is closed
        if (isClosed) {
          return;
        }

        try {
          // Create RoomServiceClient directly
          const roomService = new RoomServiceClient(
            process.env.LIVEKIT_WS_URL!,
            process.env.LIVEKIT_API_KEY!,
            process.env.LIVEKIT_API_SECRET!
          );

          const rooms = await roomService.listRooms();
          const liveRooms = rooms.filter(room => room.numParticipants > 0);

          const streams = await prisma.stream.findMany({
            where: {
              roomName: { in: liveRooms.map(r => r.name) },
              isLive: true,
            },
            include: {
              creator: {
                include: {
                  creatorProfile: true,
                },
              },
            },
            orderBy: {
              viewerCount: "desc",
            },
          });

          const enrichedStreams = streams.map(stream => {
            const room = liveRooms.find(r => r.name === stream.roomName);
            return {
              ...stream,
              currentViewers: room?.numParticipants || 0,
            };
          });

          // Check again before enqueuing
          if (!isClosed) {
            const message = `data: ${JSON.stringify({ type: "streams", data: enrichedStreams })}\n\n`;
            controller.enqueue(encoder.encode(message));
          }
        } catch (error) {
          console.error("Error fetching streams:", error);
        }
      };

      // Send initial data
      await sendStreams();

      // Set up interval to send updates every 5 seconds
      const interval = setInterval(sendStreams, 5000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch (e) {
          // Controller might already be closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

