import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SOLANA_DEVNET_NETWORK, USDC_DEVNET_MINT } from "@/lib/x402-constants";

const verifyPaymentSchema = z.object({
  streamId: z.string().uuid(),
  transactionHash: z.string(),
  amount: z.number().min(0),
  asset: z.string().optional().default("USDC"),
  network: z.string().optional().default(SOLANA_DEVNET_NETWORK),
});

export async function POST(req: NextRequest) {
  try {
    const walletAddress = req.headers.get("X-Wallet-Address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = verifyPaymentSchema.parse(body);

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
      where: { id: validated.streamId },
      include: {
        creator: true,
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionHash: validated.transactionHash },
    });

    if (existingPayment) {
      return NextResponse.json({
        success: true,
        payment: {
          ...existingPayment,
          amountAtomic: existingPayment.amountAtomic.toString(),
        },
        message: "Payment already verified",
      });
    }

    // Determine decimals based on asset
    let amountAtomic: number;
    if (validated.asset === "USDC") {
      amountAtomic = Math.floor(validated.amount * 1_000_000);
    } else if (validated.asset === "SOL") {
      amountAtomic = Math.floor(validated.amount * 1_000_000_000);
    } else {
      // fallback default
      amountAtomic = Math.floor(validated.amount * 1_000_000);
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        streamId: stream.id,
        payerId: user.id,
        creatorId: stream.creatorId,
        amount: validated.amount,
        amountAtomic: BigInt(amountAtomic),
        transactionHash: validated.transactionHash,
        network: validated.network,
        asset: validated.asset,
        assetMint: validated.asset === "USDC" ? USDC_DEVNET_MINT : "So11111111111111111111111111111111111111112",
        status: "completed",
      },
    });

    // Update stream viewer count (optional - could be done separately)
    await prisma.stream.update({
      where: { id: stream.id },
      data: {
        viewerCount: {
          increment: 1,
        },
      },
    });

    // Track analytics event
    await prisma.analyticsEvent.create({
      data: {
        streamId: stream.id,
        userId: user.id,
        eventType: "payment",
        metadata: {
          amount: validated.amount,
          transactionHash: validated.transactionHash,
        },
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        status: payment.status,
        transactionHash: payment.transactionHash,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Payment verification validation error:", error.issues);
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Payment verification failed:", error);
    // Log helpful details if available
    if ((error as any).code) console.error("Error code:", (error as any).code);
    if ((error as any).meta) console.error("Error meta:", (error as any).meta);

    return NextResponse.json(
      { error: "Failed to verify payment", details: (error as any).message },
      { status: 500 }
    );
  }
}

