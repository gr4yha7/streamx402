import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  walletAddress: z.string().min(1),
  username: z.string().min(3).max(30),
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: validated.walletAddress },
          { username: validated.username },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this wallet or username" },
        { status: 400 }
      );
    }

    // Create new user
    const user = await prisma.user.create({
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

