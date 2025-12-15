import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomName: string }> }
) {
  try {
    const { roomName: roomNameParam } = await params;
    const roomName = decodeURIComponent(roomNameParam);

    const stream = await prisma.stream.findUnique({
      where: { roomName },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true,
            creatorProfile: {
              select: {
                channelName: true,
                paymentAddress: true,
              },
            },
            walletAddress: true,
          },
        },
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: stream.id,
      roomName: stream.roomName,
      title: stream.title,
      description: stream.description,
      category: stream.category,
      thumbnail: stream.thumbnail,
      price: stream.price ? Number(stream.price) : null,
      paymentRequired: stream.paymentRequired,
      isLive: stream.isLive,
      viewerCount: stream.viewerCount,
      creator: {
        id: stream.creator.id,
        username: stream.creator.username,
        avatar: stream.creator.avatar,
        channelName: stream.creator.creatorProfile?.channelName || stream.creator.username,
        paymentAddress: stream.creator.creatorProfile?.paymentAddress || stream.creator.walletAddress,
      },
      createdAt: stream.createdAt,
      startedAt: stream.startedAt,
    });
  } catch (error) {
    console.error("Error fetching stream by room name:", error);
    return NextResponse.json(
      { error: "Failed to fetch stream" },
      { status: 500 }
    );
  }
}

