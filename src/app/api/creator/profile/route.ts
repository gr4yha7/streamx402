import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createProfileSchema = z.object({
  channelName: z.string().min(1).max(50),
  defaultStreamTitle: z.string().max(100).optional(),
  category: z.string().optional(),
  bio: z.string().max(500).optional(),
  paymentAddress: z.string().min(1), // Solana address
  socialLinks: z
    .object({
      twitter: z.string().optional(),
      youtube: z.string().optional(),
      instagram: z.string().optional(),
      discord: z.string().optional(),
    })
    .optional(),
});

// POST - Create or update creator profile
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validated = createProfileSchema.parse(body);

    // Check if profile already exists
    const existingProfile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
    });

    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.creatorProfile.update({
        where: { userId: user.id },
        data: {
          channelName: validated.channelName,
          defaultStreamTitle: validated.defaultStreamTitle,
          category: validated.category,
          bio: validated.bio,
          paymentAddress: validated.paymentAddress,
          socialLinks: validated.socialLinks || null,
        },
      });
    } else {
      // Create new profile
      profile = await prisma.creatorProfile.create({
        data: {
          userId: user.id,
          channelName: validated.channelName,
          defaultStreamTitle: validated.defaultStreamTitle,
          category: validated.category,
          bio: validated.bio,
          paymentAddress: validated.paymentAddress,
          socialLinks: validated.socialLinks || null,
        },
      });

      // Update user to be a creator
      await prisma.user.update({
        where: { id: user.id },
        data: { isCreator: true },
      });
    }

    return NextResponse.json({
      id: profile.id,
      channelName: profile.channelName,
      defaultStreamTitle: profile.defaultStreamTitle,
      category: profile.category,
      bio: profile.bio,
      paymentAddress: profile.paymentAddress,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Profile creation error:", error);
    return NextResponse.json(
      { error: "Failed to create creator profile" },
      { status: 500 }
    );
  }
}

