import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  walletAddress: z.string().min(1),
  username: z.string().optional(),
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    // Find user by wallet address
    let user = await prisma.user.findUnique({
      where: { walletAddress: validated.walletAddress },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        email: true,
        avatar: true,
        isCreator: true,
        createdAt: true,
      },
    });

    // If user doesn't exist, create one (auto-signup)
    if (!user) {
      if (!validated.username) {
        return NextResponse.json(
          { error: "Username required for new accounts" },
          { status: 400 }
        );
      }

      user = await prisma.user.create({
        data: {
          walletAddress: validated.walletAddress,
          username: validated.username,
          email: validated.email,
          isCreator: false,
        },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          email: true,
          avatar: true,
          isCreator: true,
          createdAt: true,
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}

