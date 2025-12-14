// This file should only be imported on the server side
// Use x402-constants.ts for client-side imports

import { paymentProxy } from "@x402/next";
import { x402ResourceServer, HTTPFacilitatorClient, HTTPAdapter } from "@x402/core/server";
import { registerExactSvmScheme } from "@x402/svm/exact/server";

// Get facilitator URL from environment variable, fallback to default
const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const SVM_ADDRESS = process.env.SVM_ADDRESS || "";
// Initialize server-side components
const facilitatorClient = new HTTPFacilitatorClient({
  url: facilitatorUrl,
});

const server = new x402ResourceServer(facilitatorClient)
  .onBeforeVerify(async context => {
    console.log("Before verify hook", context);
    // Abort verification by returning { abort: true, reason: string }
  })
  .onAfterSettle(async context => {
    console.log("After settle hook", context);
    // TODO: add payment to database
  })
  .onSettleFailure(async context => {
    console.log("Settle failure hook", context);
    // Return a result with recovered=true to recover from the failure
    // return { recovered: true, result: { success: true, transaction: "0x123..." } };
  });

// Register schemes using the helper function
registerExactSvmScheme(server);

// Export proxy and config (these are used by Next.js middleware)
export const proxy = paymentProxy(
  {
    "/watch/:roomName": {
      accepts: [{
        scheme: "exact" as const,
        network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        payTo: ctx => {
          const creatorAddress = ctx.adapter.getQueryParam?.("creatorAddress")
          if (!creatorAddress) {
            return SVM_ADDRESS
          }
          return creatorAddress as string
        },
        price: ctx => {
          const amount = ctx.adapter.getQueryParam?.("price")
          if (!amount) {
            return "$1.00"
          }
          return `$${amount}`
        }
      }],
      description: "Access to live stream",
      mimeType: "text/html",
    },
  }, server);

export const config = {
  matcher: ["/watch/:roomName*"],
};