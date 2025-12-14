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

    // Get all streams created by this user
    const streams = await prisma.stream.findMany({
      where: {
        creatorId: user.id,
      },
      include: {
        payments: {
          where: {
            status: "completed",
          },
        },
        analyticsEvents: true,
        _count: {
          select: {
            payments: true,
            analyticsEvents: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Enrich stream data
    const enrichedStreams = streams.map((stream) => {
      const views = stream.analyticsEvents.filter(
        (e) => e.eventType === "view"
      ).length;
      const earnings = stream.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      return {
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
        views,
        earnings,
        paymentCount: stream.payments.length,
        createdAt: stream.createdAt,
        startedAt: stream.startedAt,
        endedAt: stream.endedAt,
      };
    });

    return NextResponse.json({ streams: enrichedStreams });
  } catch (error) {
    console.error("Streams error:", error);
    return NextResponse.json(
      { error: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}

