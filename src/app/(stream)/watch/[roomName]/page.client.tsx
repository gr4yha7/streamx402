"use client";

import { Chat } from "@/components/chat";
import { ReactionBar } from "@/components/reaction-bar";
import { Spinner } from "@/components/spinner";
import { StreamPlayer } from "@/components/stream-player";
import { TokenContext } from "@/components/token-context";
import { PaymentModal } from "@/components/payment-modal";
import { JoinStreamResponse } from "@/lib/controller";
import { cn } from "@/lib/utils";
import { LiveKitRoom } from "@livekit/components-react";
import { ArrowRightIcon, PersonIcon } from "@radix-ui/react-icons";
import {
  Avatar,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useWallet } from "@solana/wallet-adapter-react";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
// import { ExactSvmScheme } from "@x402/svm/exact/client"; // Removed
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { UiWalletAccount } from "@wallet-standard/react";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

interface StreamInfo {
  id: string;
  title: string;
  price: number | null;
  paymentRequired: boolean;
  creator: {
    paymentAddress: string;
  };
}

export default function WatchPage({
  roomName,
  serverUrl,
}: {
  roomName: string;
  serverUrl: string;
}) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { publicKey, connected: isConnected } = useWallet();
  const address = publicKey?.toBase58();
  const [name, setName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasAccess: boolean;
    paymentRequired: boolean;
    price?: number;
  } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch stream info and check payment status
  useEffect(() => {
    const fetchStreamAndCheckPayment = async () => {
      try {
        // 64-byte base58 secret key (private + public)
        const signer = await createKeyPairSignerFromBytes(
          base58.decode(process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY!)
        );
        const svmSigner = signer as any;
        // Fetch stream info
        const streamRes = await fetch(`/api/streams/by-room/${encodeURIComponent(roomName)}`);
        let streamData: StreamInfo | null = null;

        if (streamRes.ok) {
          streamData = await streamRes.json();
          setStreamInfo(streamData);
        } else {
          // If stream doesn't exist, still allow access (backward compatibility)
          setPaymentStatus({ hasAccess: true, paymentRequired: false });
          setCheckingPayment(false);
          return;
        }

        if (streamData && isConnected && address) {
          try {
            // console.log("x402-fetch exports:", x402Fetch);
            // fallback to direct passing for now while debugging
            const fetchWithPayment = wrapFetchWithPayment(fetch, svmSigner as any, BigInt(100_000_000));

            // Construct URL with price and creator address parameters for dynamic payment requirements
            const queryParams = new URLSearchParams({
              price: (streamData.price || 0).toString(),
              creatorAddress: streamData.creator.paymentAddress
            });

            // Note: wrapFetchWithPayment handles the 402/payment flow internally via the interceptor
            // We just need to handle the success or final failure
            const response = await fetchWithPayment(`/api/streams/${streamData.id}/payment-status?${queryParams.toString()}`, {
              method: "GET",
              headers: {
                "X-Wallet-Address": address
              }
            });

            console.log("X402: Response:", response);

            if (response.ok) {
              const paymentData = await response.json();
              setPaymentStatus(paymentData);

              const xPaymentResponseHeader = response.headers.get("x-payment-response");
              if (xPaymentResponseHeader) {
                try {
                  const paymentResponse = decodeXPaymentResponse(xPaymentResponseHeader);
                  console.log("X402: Payment settled:", paymentResponse);
                } catch (e) {
                  console.error("X402: Error decoding payment response", e);
                }
              }

            } else if (response.status === 402) {
              console.log("X402: Payment required - modal trigger (if manual handling needed)");
              // The library should have handled the payment prompt. 
              // If it returns 402 here, it means the user cancelled or it failed.
              setPaymentStatus({
                hasAccess: false,
                paymentRequired: true,
                price: streamData.price || 0
              });
              setShowPaymentModal(true);
            }

          } catch (error: any) {
            console.error("X402 flow error:", error);
            if (error.cause) {
              console.error("X402 flow error cause:", error.cause);
            }
            if (error.logs) {
              console.error("X402 flow error logs:", error.logs);
            }
            // Fallback to "need payment" if something crashes
            setPaymentStatus({ hasAccess: false, paymentRequired: true, price: streamData.price || 0 });
          }
        } else if (streamData && streamData.paymentRequired) {
          // No wallet connected or not fully auth'd
          setPaymentStatus({ hasAccess: false, paymentRequired: true, price: streamData.price || 0 });
          setShowPaymentModal(true);
        } else {
          // Free stream or fallback
          setPaymentStatus({ hasAccess: true, paymentRequired: false });
        }

      } catch (error) {
        console.error("Error checking payment status:", error);
        setPaymentStatus({ hasAccess: true, paymentRequired: false });
      } finally {
        setCheckingPayment(false);
      }
    };

    fetchStreamAndCheckPayment();
  }, [roomName, isConnected, address]);
  useEffect(() => {
    if (streamInfo && streamInfo.paymentRequired && !isConnected && !checkingPayment) {
      router.push(`/auth?redirect=${encodeURIComponent(`/watch/${roomName}`)}`);
    }
  }, [streamInfo, isConnected, checkingPayment, router, roomName]);

  const onJoin = async () => {
    // Check payment status again before joining
    if (streamInfo && streamInfo.paymentRequired && (!paymentStatus?.hasAccess)) {
      setShowPaymentModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/join_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          identity: name || user?.username || address || "Viewer",
        }),
      });
      const {
        auth_token,
        connection_details: { token },
      } = (await res.json()) as JoinStreamResponse;

      setAuthToken(auth_token);
      setRoomToken(token);
    } catch (error) {
      console.error("Failed to join stream:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (transactionHash: string) => {
    if (!streamInfo) return;

    try {
      // Verify payment
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Wallet-Address": address || "",
        },
        body: JSON.stringify({
          streamId: streamInfo.id,
          transactionHash,
          amount: streamInfo.price || 0,
        }),
      });

      if (verifyRes.ok) {
        setShowPaymentModal(false);
        setPaymentStatus({ hasAccess: true, paymentRequired: true });
        // Auto-join after payment
        onJoin();
      }
    } catch (error) {
      console.error("Failed to verify payment:", error);
    }
  };

  // Redirect imminent if:
  const shouldRedirect = streamInfo && streamInfo.paymentRequired && !isConnected && !checkingPayment;

  if (checkingPayment || authLoading || shouldRedirect) {
    return (
      <Flex align="center" justify="center" className="min-h-screen">
        <Spinner />
      </Flex>
    );
  }

  if (showPaymentModal && streamInfo && streamInfo.paymentRequired && !paymentStatus?.hasAccess) {
    return (
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          if (!paymentStatus?.hasAccess) {
            // Redirect to homepage if payment is required
            router.push("/");
          } else {
            setShowPaymentModal(false);
          }
        }}
        price={streamInfo.price || 0}
        streamTitle={streamInfo.title}
        streamId={streamInfo.id}
        creatorAddress={streamInfo.creator.paymentAddress}
        onPaymentSuccess={handlePaymentSuccess}
      />
    );
  }

  if (!authToken || !roomToken) {
    return (
      <Flex align="center" justify="center" className="min-h-screen">
        <Card className="p-3 w-[380px]">
          <Heading size="4" className="mb-4">
            Entering {decodeURI(roomName)}
          </Heading>
          {streamInfo && streamInfo.paymentRequired && paymentStatus?.hasAccess && (
            <Text size="2" color="green" className="mb-2">
              ✓ Payment verified
            </Text>
          )}
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Your name
            </Text>
            <TextField.Root>
              <TextField.Slot>
                <Avatar
                  size="1"
                  radius="full"
                  fallback={name ? name[0] : <PersonIcon />}
                />
              </TextField.Slot>
              <TextField.Input
                placeholder={user?.username || address || "Your name"}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </TextField.Root>
          </label>
          <Flex gap="3" mt="6" justify="end">
            <Button disabled={loading} onClick={onJoin}>
              {loading ? (
                <Flex gap="2" align="center">
                  <Spinner />
                  <Text>Joining...</Text>
                </Flex>
              ) : (
                <>
                  Join as viewer{" "}
                  <ArrowRightIcon className={cn((name || user || address) && "animate-wiggle")} />
                </>
              )}
            </Button>
          </Flex>
        </Card>
      </Flex>
    );
  }

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom serverUrl={serverUrl} token={roomToken}>
        <Flex className="w-full h-screen">
          <Flex direction="column" className="flex-1">
            <Box className="flex-1 bg-gray-1">
              <StreamPlayer />
            </Box>
            <ReactionBar />
          </Flex>
          <Box className="bg-accent-2 min-w-[280px] border-l border-accent-5">
            <Chat />
          </Box>
        </Flex>
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}
