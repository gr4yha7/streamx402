import { Controller } from "@/lib/controller";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const controller = new Controller();
    
    // Get all active LiveKit rooms
    const rooms = await controller.roomService.listRooms();
    
    // Filter only live rooms (rooms with participants)
    const liveRooms = rooms.filter(room => room.numParticipants > 0);
    
    if (liveRooms.length === 0) {
      return NextResponse.json({ streams: [] });
    }
    
    // Fetch stream metadata from database
    const streams = await prisma.stream.findMany({
      where: {
        roomName: { in: liveRooms.map(r => r.name) },
        isLive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            creatorProfile: {
              select: {
                channelName: true,
              },
            },
          },
        },
      },
      orderBy: {
        viewerCount: 'desc',
      },
    });
    
    // Merge LiveKit data with database data
    const enrichedStreams = streams.map(stream => {
      const room = liveRooms.find(r => r.name === stream.roomName);
      return {
        id: stream.id,
        roomName: stream.roomName,
        title: stream.title,
        description: stream.description,
        category: stream.category,
        thumbnail: stream.thumbnail,
        price: stream.price ? Number(stream.price) : null,
        paymentRequired: stream.paymentRequired,
        viewerCount: room?.numParticipants || stream.viewerCount,
        isLive: true,
        creator: {
          id: stream.creator.id,
          username: stream.creator.username,
          avatar: stream.creator.avatar,
          channelName: stream.creator.creatorProfile?.channelName || stream.creator.username,
        },
        createdAt: stream.createdAt,
        startedAt: stream.startedAt,
      };
    });
    
    return NextResponse.json({ streams: enrichedStreams });
  } catch (error) {
    console.error("Error fetching live streams:", error);
    return NextResponse.json(
      { error: "Failed to fetch live streams" },
      { status: 500 }
    );
  }
}

