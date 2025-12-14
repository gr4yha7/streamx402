import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const sortBy = searchParams.get("sortBy") || "viewerCount";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {
      isLive: true,
    };

    // Search by title, description, or creator username
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { creator: { username: { contains: query, mode: "insensitive" } } },
        { creator: { creatorProfile: { channelName: { contains: query, mode: "insensitive" } } } },
      ];
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === "viewerCount") {
      orderBy.viewerCount = sortOrder;
    } else if (sortBy === "createdAt") {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === "title") {
      orderBy.title = sortOrder;
    } else {
      orderBy.viewerCount = "desc";
    }

    // Fetch streams
    const [streams, total] = await Promise.all([
      prisma.stream.findMany({
        where,
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
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.stream.count({ where }),
    ]);

    // Enrich stream data
    const enrichedStreams = streams.map((stream) => ({
      id: stream.id,
      roomName: stream.roomName,
      title: stream.title,
      description: stream.description,
      category: stream.category,
      thumbnail: stream.thumbnail,
      price: stream.price ? Number(stream.price) : null,
      paymentRequired: stream.paymentRequired,
      viewerCount: stream.viewerCount,
      isLive: stream.isLive,
      creator: {
        id: stream.creator.id,
        username: stream.creator.username,
        avatar: stream.creator.avatar,
        channelName: stream.creator.creatorProfile?.channelName || stream.creator.username,
      },
      createdAt: stream.createdAt,
      startedAt: stream.startedAt,
    }));

    return NextResponse.json({
      streams: enrichedStreams,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search streams" },
      { status: 500 }
    );
  }
}

