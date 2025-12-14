import "@/styles/globals.css";

import { Theme } from "@radix-ui/themes";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Spline_Sans } from "next/font/google";
import { FontLoader } from "@/components/font-loader";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });
const splineSans = Spline_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StreamX402 - Live Streaming Platform",
  description: "A live streaming platform built with LiveKit, Solana, and x402 payments",
  other: {
    "preconnect": "https://fonts.googleapis.com https://fonts.gstatic.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${splineSans.variable}`}>
        <FontLoader />
        <Providers>
          <Theme
            appearance="dark"
            accentColor="purple"
            grayColor="mauve"
            radius="none"
          >
            {children}
          </Theme>
        </Providers>
      </body>
    </html>
  );
}
