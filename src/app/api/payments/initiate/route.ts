import { NextRequest, NextResponse } from "next/server";
import { createStreamPaymentRequirements } from "@/lib/x402-constants";
import { z } from "zod";

const initiatePaymentSchema = z.object({
  streamId: z.string().uuid(),
  amount: z.number().min(0),
  creatorAddress: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const streamId = searchParams.get("streamId");
    const amount = parseFloat(searchParams.get("amount") || "0");
    const creatorAddress = searchParams.get("creatorAddress");

    if (!streamId || !creatorAddress) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Create payment requirements
    const requirements = createStreamPaymentRequirements(amount, creatorAddress);

    // Return payment requirements for client to process
    return NextResponse.json({
      requirements,
      streamId,
      amount,
      creatorAddress,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}

