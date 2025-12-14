import { Controller, getSessionFromReq } from "@/lib/controller";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const stopStreamSchema = z.object({
  roomName: z.string().optional(),
  creator_identity: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const controller = new Controller();

  try {
    const walletAddress = req.headers.get("X-Wallet-Address");
    const body = await req.json().catch(() => ({}));
    const validated = stopStreamSchema.parse(body);

    // Try to get session from auth header first (for backward compatibility)
    let session;
    try {
      session = getSessionFromReq(req);
    } catch {
      // If no auth header, use roomName and walletAddress from request
      if (!validated.roomName || !walletAddress) {
        return NextResponse.json(
          { error: "Room name and wallet address required" },
          { status: 400 }
        );
      }

      // Create a session object for the controller
      session = {
        room_name: validated.roomName,
        identity: walletAddress,
      };
    }

    // Update stream in database first (to get creator info for verification)
    const stream = await prisma.stream.findFirst({
      where: {
        roomName: session.room_name,
        isLive: true,
      },
      include: {
        creator: true,
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found or already ended" },
        { status: 404 }
      );
    }

    // Verify the creator matches
    if (stream.creator.walletAddress !== walletAddress && stream.creator.walletAddress !== validated.creator_identity) {
      return NextResponse.json(
        { error: "Unauthorized: Only the creator can end the stream" },
        { status: 403 }
      );
    }

    // Stop the stream in LiveKit
    try {
      await controller.stopStream(session);
    } catch (livekitError) {
      // If LiveKit room doesn't exist, still mark stream as ended in DB
      if (livekitError instanceof Error && livekitError.message.includes("does not exist")) {
        console.warn("LiveKit room not found, but marking stream as ended in database");
      } else {
        throw livekitError;
      }
    }

    // Mark stream as ended in database
    await prisma.stream.update({
      where: { id: stream.id },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Stream ended successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.issues },
        { status: 400 }
      );
    }

    if (err instanceof Error) {
      console.error("Stop stream error:", err);
      return NextResponse.json(
        { error: err.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to stop stream" },
      { status: 500 }
    );
  }
}
