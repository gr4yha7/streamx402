import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCreatorAnalytics } from "@/lib/analytics";

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

    if (!user.isCreator) {
      return NextResponse.json(
        { error: "User is not a creator" },
        { status: 403 }
      );
    }

    // Get date range from query params (optional)
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const dateRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    // Get analytics
    const analytics = await getCreatorAnalytics(user.id, dateRange);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

