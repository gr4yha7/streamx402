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

    // Get date range from query params (optional)
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    // Get all payments received by this creator
    const payments = await prisma.payment.findMany({
      where: {
        creatorId: user.id,
        status: "completed",
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
      },
      include: {
        stream: {
          select: {
            id: true,
            title: true,
            roomName: true,
          },
        },
        payer: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate totals
    const totalEarnings = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    // Group by date for chart data
    const earningsByDate = payments.reduce((acc, payment) => {
      const date = new Date(payment.createdAt).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += Number(payment.amount);
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for charts
    const earningsChartData = Object.entries(earningsByDate)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalEarnings,
      totalPayments: payments.length,
      payments,
      chartData: earningsChartData,
    });
  } catch (error) {
    console.error("Earnings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}

