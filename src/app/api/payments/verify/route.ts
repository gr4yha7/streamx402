import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SOLANA_DEVNET_NETWORK, USDC_DEVNET_MINT } from "@/lib/x402-constants";

const verifyPaymentSchema = z.object({
  streamId: z.string().uuid(),
  transactionHash: z.string(),
  amount: z.number().min(0),
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
        payment: existingPayment,
        message: "Payment already verified",
      });
    }

    // Verify transaction on Solana (in production, you'd verify on-chain)
    // For now, we'll trust the transaction hash and create the payment record
    // TODO: Add actual Solana transaction verification

    const amountAtomic = Math.floor(validated.amount * 1_000_000); // USDC has 6 decimals

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        streamId: stream.id,
        payerId: user.id,
        creatorId: stream.creatorId,
        amount: validated.amount,
        amountAtomic: BigInt(amountAtomic),
        transactionHash: validated.transactionHash,
        network: SOLANA_DEVNET_NETWORK,
        asset: "USDC",
        assetMint: USDC_DEVNET_MINT,
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
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}

