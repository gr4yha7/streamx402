import { Controller, JoinStreamParams } from "@/lib/controller";
import { prisma } from "@/lib/prisma";
import { trackJoin, trackView } from "@/lib/analytics";
import { z } from "zod";

const joinStreamSchema = z.object({
  room_name: z.string(),
  identity: z.string(),
});

export async function POST(req: Request) {
  const controller = new Controller();

  try {
    const reqBody = await req.json();
    const validated = joinStreamSchema.parse(reqBody);

    // Get stream from database
    const stream = await prisma.stream.findUnique({
      where: { roomName: validated.room_name },
    });

    // Get user if wallet address is provided
    const walletAddress = req.headers.get("X-Wallet-Address");
    let user = null;
    if (walletAddress) {
      user = await prisma.user.findUnique({
        where: { walletAddress },
      });
    }

    // Join the stream
    const response = await controller.joinStream({
      room_name: validated.room_name,
      identity: validated.identity,
    });

    // Track analytics events
    if (stream) {
      await Promise.all([
        trackJoin(stream.id, user?.id),
        trackView(stream.id, user?.id),
      ]);

      // Update viewer count
      await prisma.stream.update({
        where: { id: stream.id },
        data: {
          viewerCount: {
            increment: 1,
          },
        },
      });
    }

    return Response.json(response);
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
