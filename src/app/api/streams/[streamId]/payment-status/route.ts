import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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
      select: {
        id: true,
        price: true,
        paymentRequired: true,
        creatorId: true,
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    // Creator doesn't need to pay
    if (stream.creatorId === user.id) {
      return NextResponse.json({
        hasAccess: true,
        reason: "creator",
        paymentRequired: false,
      });
    }

    // Free stream
    if (!stream.paymentRequired) {
      return NextResponse.json({
        hasAccess: true,
        reason: "free",
        paymentRequired: false,
      });
    }

    // Check if user has already paid
    const payment = await prisma.payment.findFirst({
      where: {
        streamId: stream.id,
        payerId: user.id,
        status: "completed",
      },
    });

    if (payment) {
      return NextResponse.json({
        hasAccess: true,
        reason: "paid",
        paymentRequired: true,
        paymentId: payment.id,
      });
    }

    // Payment required
    return NextResponse.json({
      hasAccess: false,
      reason: "payment_required",
      paymentRequired: true,
      price: stream.price ? Number(stream.price) : 0,
    });
  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}

