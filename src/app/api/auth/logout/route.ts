import { NextResponse } from "next/server";

export async function POST() {
  // In a stateless JWT system, logout is handled client-side
  // by clearing the token. For wallet-based auth, we just return success.
  return NextResponse.json({ success: true });
}

