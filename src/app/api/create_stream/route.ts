import { Controller, CreateStreamParams } from "@/lib/controller";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createStreamSchema = z.object({
  room_name: z.string().optional(),
  metadata: z.object({
    creator_identity: z.string(),
    enable_chat: z.boolean().optional(),
    enable_reactions: z.boolean().optional(),
    enable_raise_hand: z.boolean().optional(),
  }),
  // Stream metadata
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  thumbnail: z.string().url().optional(),
  price: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const controller = new Controller();

  try {
    const reqBody = await req.json();
    const validated = createStreamSchema.parse(reqBody);

    // Get creator user from wallet address or identity
    const creator = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: validated.metadata.creator_identity },
          { username: validated.metadata.creator_identity },
        ],
      },
    });

    if (!creator) {
      return new Response("Creator not found. Please sign up first.", { status: 404 });
    }

    // Create LiveKit stream
    const response = await controller.createStream({
      room_name: validated.room_name,
      metadata: validated.metadata,
    } as CreateStreamParams);

    // Extract room name from response or generate one
    let roomName = validated.room_name;
    if (!roomName) {
      // Try to extract from response if available
      // Otherwise, generate a unique room name
      roomName = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Calculate payment required
    const price = validated.price || 0;
    const paymentRequired = price > 0;

    // Save stream to database
    const stream = await prisma.stream.create({
      data: {
        roomName,
        creatorId: creator.id,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        thumbnail: validated.thumbnail,
        price: price > 0 ? price : null,
        paymentRequired,
        isLive: true,
        viewerCount: 0,
        startedAt: new Date(),
        metadata: validated.metadata as any,
      },
    });

    return Response.json({
      ...response,
      stream: {
        id: stream.id,
        roomName: stream.roomName,
        title: stream.title,
        price: stream.price,
        paymentRequired: stream.paymentRequired,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid input", details: err.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (err instanceof Error) {
      return new Response(err.message, { status: 500 });
    }

    return new Response(null, { status: 500 });
  }
}
