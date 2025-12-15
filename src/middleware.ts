import { paymentMiddleware } from "x402-next";
import { NextResponse } from "next/server";

const facilitatorUrl = process.env.FACILITATOR_URL || "https://facilitator.payai.network";
const SVM_ADDRESS = process.env.SVM_ADDRESS || "9VNRWk79DJxYPmKLGZm6uHWMYMamqP8qMmuMeMxVewMN"; // Valid 32-byte base58 mock address

// Wrapper for dynamic configuration
export async function middleware(req: any) {
  const url = req.nextUrl;
  const priceParam = url.searchParams.get("price");
  const creatorAddress = url.searchParams.get("creatorAddress");

  const currentPrice = priceParam ? `$${priceParam}` : "$0.2";
  const currentReceiver = creatorAddress || SVM_ADDRESS;

  console.log("Middleware called for:", url.pathname);
  console.log("Dynamic Payment Config:", { price: currentPrice, receiver: currentReceiver });

  const dynamicFactory = paymentMiddleware(
    currentReceiver as any,
    {
      "/api/streams/*/payment-status": {
        price: currentPrice,
        // Remove hardcoded amount to let x402 calculate from price 
        // or we could calculate if needed: amount: (parseFloat(priceParam || "0.2") * 1000000).toString()
        network: "solana-devnet",
        config: {
          description: "Access to live stream"
        }
      }
    },
    {
      url: facilitatorUrl as any,
    }
  );

  try {
    const res = await dynamicFactory(req);
    console.log("Middleware result:", res?.status);
    return res;
  } catch (e) {
    console.error("Middleware error:", e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/streams/:path*"],
};

export default middleware;