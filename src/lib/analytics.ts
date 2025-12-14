import { prisma } from "./prisma";

export type AnalyticsEventType = "view" | "payment" | "join" | "leave";

/**
 * Track an analytics event
 */
export async function trackEvent(
  streamId: string,
  eventType: AnalyticsEventType,
  userId?: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        streamId,
        userId: userId || null,
        eventType,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to track analytics event:", error);
    // Don't throw - analytics failures shouldn't break the app
  }
}

/**
 * Track a stream view
 */
export async function trackView(streamId: string, userId?: string) {
  return trackEvent(streamId, "view", userId);
}

/**
 * Track a stream join
 */
export async function trackJoin(streamId: string, userId?: string) {
  return trackEvent(streamId, "join", userId);
}

/**
 * Track a stream leave
 */
export async function trackLeave(streamId: string, userId?: string) {
  return trackEvent(streamId, "leave", userId);
}

/**
 * Track a payment (usually called from payment verification)
 */
export async function trackPayment(
  streamId: string,
  userId: string,
  amount: number,
  transactionHash: string
) {
  return trackEvent(streamId, "payment", userId, {
    amount,
    transactionHash,
  });
}

/**
 * Get analytics summary for a stream
 */
export async function getStreamAnalytics(streamId: string) {
  const events = await prisma.analyticsEvent.findMany({
    where: { streamId },
    orderBy: { timestamp: "desc" },
  });

  const views = events.filter((e) => e.eventType === "view").length;
  const joins = events.filter((e) => e.eventType === "join").length;
  const payments = events.filter((e) => e.eventType === "payment").length;

  return {
    totalViews: views,
    totalJoins: joins,
    totalPayments: payments,
    events,
  };
}

/**
 * Get analytics summary for a creator
 */
export async function getCreatorAnalytics(creatorId: string, dateRange?: {
  start: Date;
  end: Date;
}) {
  const streams = await prisma.stream.findMany({
    where: {
      creatorId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    },
    include: {
      analyticsEvents: true,
      payments: {
        where: {
          status: "completed",
        },
      },
    },
  });

  const totalViews = streams.reduce(
    (sum, stream) =>
      sum +
      stream.analyticsEvents.filter((e) => e.eventType === "view").length,
    0
  );

  const totalEarnings = streams.reduce(
    (sum, stream) =>
      sum +
      stream.payments.reduce(
        (paymentSum, payment) => paymentSum + Number(payment.amount),
        0
      ),
    0
  );

  const totalPayments = streams.reduce(
    (sum, stream) => sum + stream.payments.length,
    0
  );

  return {
    totalViews,
    totalEarnings,
    totalPayments,
    streams: streams.length,
    streamsData: streams.map((stream) => ({
      id: stream.id,
      title: stream.title,
      views: stream.analyticsEvents.filter((e) => e.eventType === "view")
        .length,
      earnings: stream.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      ),
      payments: stream.payments.length,
    })),
  };
}

