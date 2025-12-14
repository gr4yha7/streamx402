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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSolana } from "@/components/solana-provider";
// import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
// import { type Provider } from "@reown/appkit-adapter-solana/react";
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
// import { base58 } from "@scure/base";

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
  const { address, isConnected, chain, selectedAccount } = useSolana();
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

  // const { walletProvider } = useAppKitProvider<Provider>('solana')
  // 64-byte base58 secret key (private + public)
  // const svmSigner = await createKeyPairSignerFromBytes(
  //   base58.decode(walletProvider.publicKey)
  // );


  useEffect(() => {
    const checkPayment = async () => {
      if (selectedAccount) {
        const svmSigner = useWalletAccountTransactionSendingSigner(selectedAccount!, chain);

        const client = new x402Client()
          .register("solana:*", new ExactSvmScheme(svmSigner))
          .onBeforePaymentCreation(async context => {
            console.log("Creating payment for:", context.selectedRequirements);
            // Abort payment by returning: { abort: true, reason: "Not allowed" }
          })
          .onAfterPaymentCreation(async context => {
            console.log("Payment created:", context.paymentPayload.x402Version);
            // Send to analytics, database, etc.
          })
          .onPaymentCreationFailure(async context => {
            console.error("Payment failed:", context.error);
            // Recover by returning: { recovered: true, payload: alternativePayload }
          });
        const fetchWithPayment = wrapFetchWithPayment(fetch, client);
        const response = await fetchWithPayment(`/api/streams/payment-status`, {
          method: "GET",
        });

        const body = await response.json();
        console.log("Response:", body);

        // Get payment receipt from response headers
        if (response.ok) {
          const httpClient = new x402HTTPClient(client);
          const paymentResponse = httpClient.getPaymentSettleResponse(
            (name) => response.headers.get(name)
          );
          console.log("Payment settled:", paymentResponse);
        }
      }
    }
    checkPayment();
  }, [selectedAccount])


  // Fetch stream info and check payment status
  useEffect(() => {
    const fetchStreamAndCheckPayment = async () => {
      try {
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

        // Check payment status if wallet is connected
        if (isConnected && address && streamData) {
          const paymentRes = await fetch(`/api/streams/${streamData.id}/payment-status`, {
            headers: {
              "X-Wallet-Address": address,
            },
          });

          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            setPaymentStatus(paymentData);

            // Show payment modal if payment is required
            if (!paymentData.hasAccess && paymentData.paymentRequired) {
              setShowPaymentModal(true);
            }
          }
        } else if (streamData) {
          // No wallet connected - show payment modal if payment required
          if (streamData.paymentRequired) {
            setShowPaymentModal(true);
            setPaymentStatus({ hasAccess: false, paymentRequired: true, price: streamData.price || 0 });
          } else {
            setPaymentStatus({ hasAccess: true, paymentRequired: false });
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        // Allow access on error (fail open)
        setPaymentStatus({ hasAccess: true, paymentRequired: false });
      } finally {
        setCheckingPayment(false);
      }
    };

    fetchStreamAndCheckPayment();
  }, [roomName, isConnected, address]);

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

  if (checkingPayment || authLoading) {
    return (
      <Flex align="center" justify="center" className="min-h-screen">
        <Spinner />
      </Flex>
    );
  }

  // Redirect to auth if wallet not connected and payment required
  if (streamInfo && streamInfo.paymentRequired && !isConnected && !checkingPayment) {
    router.push(`/auth?redirect=${encodeURIComponent(`/watch/${roomName}`)}`);
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
