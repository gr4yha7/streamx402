import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateStreamSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  thumbnail: z.string().url().optional(),
  price: z.number().min(0).optional(),
});

// GET - Get stream details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
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
      creator: stream.creator,
      createdAt: stream.createdAt,
      startedAt: stream.startedAt,
      endedAt: stream.endedAt,
    });
  } catch (error) {
    console.error("Error fetching stream:", error);
    return NextResponse.json(
      { error: "Failed to fetch stream" },
      { status: 500 }
    );
  }
}

// PATCH - Update stream metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
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

    // Get stream
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    // Verify user is the creator
    if (stream.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: Only the creator can update this stream" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validated = updateStreamSchema.parse(body);

    // Calculate paymentRequired based on price
    const price = validated.price !== undefined ? validated.price : stream.price ? Number(stream.price) : null;
    const paymentRequired = price !== null && price > 0;

    // Update stream
    const updatedStream = await prisma.stream.update({
      where: { id: streamId },
      data: {
        ...(validated.title && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.category !== undefined && { category: validated.category }),
        ...(validated.thumbnail !== undefined && { thumbnail: validated.thumbnail }),
        ...(validated.price !== undefined && { 
          price: validated.price > 0 ? validated.price : null,
          paymentRequired,
        }),
      },
    });

    return NextResponse.json({
      id: updatedStream.id,
      title: updatedStream.title,
      description: updatedStream.description,
      category: updatedStream.category,
      thumbnail: updatedStream.thumbnail,
      price: updatedStream.price ? Number(updatedStream.price) : null,
      paymentRequired: updatedStream.paymentRequired,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating stream:", error);
    return NextResponse.json(
      { error: "Failed to update stream" },
      { status: 500 }
    );
  }
}

