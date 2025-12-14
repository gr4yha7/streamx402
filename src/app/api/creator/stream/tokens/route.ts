import { Controller } from "@/lib/controller";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.headers.get("X-Wallet-Address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.isCreator) {
      return NextResponse.json(
        { error: "User is not a creator" },
        { status: 403 }
      );
    }

    // Get active stream for this creator
    const activeStream = await prisma.stream.findFirst({
      where: {
        creatorId: user.id,
        isLive: true,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    if (!activeStream) {
      return NextResponse.json(
        { error: "No active stream found" },
        { status: 404 }
      );
    }

    const controller = new Controller();
    
    // Generate tokens for the host
    const identity = user.walletAddress;
    const roomName = activeStream.roomName;
    
    // Create auth token (for API calls)
    const authToken = controller.createAuthToken(roomName, identity);
    
    // Create room token (for LiveKit connection)
    const { AccessToken } = await import("livekit-server-sdk");
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity,
      }
    );

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const roomToken = at.toJwt();
    const serverUrl = process.env.LIVEKIT_WS_URL!.replace("wss://", "https://").replace("ws://", "http://");

    return NextResponse.json({
      authToken,
      roomToken,
      serverUrl,
      stream: {
        id: activeStream.id,
        roomName: activeStream.roomName,
        title: activeStream.title,
        isLive: activeStream.isLive,
      },
    });
  } catch (error) {
    console.error("Error getting stream tokens:", error);
    return NextResponse.json(
      { error: "Failed to get stream tokens" },
      { status: 500 }
    );
  }
}

