"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  Flex,
  Text,
  TextField,
  Select,
  TextArea,
} from "@radix-ui/themes";

interface GoLiveDialogProps {
  children: React.ReactNode;
  onGoLive: (streamData: StreamData) => Promise<void>;
  loading?: boolean;
  defaultTitle?: string;
  defaultCategory?: string;
}

export interface StreamData {
  title: string;
  description?: string;
  category?: string;
  price?: number;
}

const CATEGORIES = [
  "Gaming",
  "Music",
  "Just Chatting",
  "Art & Creative",
  "Cooking",
  "Education",
  "Sports",
  "Science & Technology",
  "Entertainment",
  "Other",
];

export function GoLiveDialog({
  children,
  onGoLive,
  loading = false,
  defaultTitle = "",
  defaultCategory = "",
}: GoLiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [price, setPrice] = useState<string>("");
  const [isFree, setIsFree] = useState(true);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Please enter a stream title");
      return;
    }

    const streamData: StreamData = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      price: isFree ? 0 : parseFloat(price) || 0,
    };

    try {
      await onGoLive(streamData);
      setOpen(false);
      // Reset form
      setTitle(defaultTitle);
      setDescription("");
      setCategory(defaultCategory);
      setPrice("");
      setIsFree(true);
    } catch (error) {
      console.error("Failed to go live:", error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Go Live</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Set up your stream details before going live
        </Dialog.Description>

        <Flex direction="column" gap="4">
          {/* Stream Title */}
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Stream Title <span className="text-red-400">*</span>
            </Text>
            <TextField.Input
              placeholder="What are you streaming today?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <Text as="div" size="1" color="gray" mt="1">
              {title.length}/100 characters
            </Text>
          </label>

          {/* Description */}
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Description (Optional)
            </Text>
            <TextArea
              placeholder="Tell viewers what to expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <Text as="div" size="1" color="gray" mt="1">
              {description.length}/500 characters
            </Text>
          </label>

          {/* Category */}
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Category (Optional)
            </Text>
            <Select.Root value={category} onValueChange={setCategory}>
              <Select.Trigger placeholder="Choose a category" />
              <Select.Content>
                {CATEGORIES.map((cat) => (
                  <Select.Item key={cat} value={cat.toLowerCase().replace(/\s+/g, "_")}>
                    {cat}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </label>

          {/* Pricing */}
          <Flex direction="column" gap="2">
            <Text as="div" size="2" weight="bold">
              Stream Access
            </Text>
            <Flex gap="4">
              <Text as="label" size="2">
                <Flex gap="2" align="center">
                  <input
                    type="radio"
                    name="pricing"
                    checked={isFree}
                    onChange={() => setIsFree(true)}
                    className="cursor-pointer"
                  />
                  Free
                </Flex>
              </Text>
              <Text as="label" size="2">
                <Flex gap="2" align="center">
                  <input
                    type="radio"
                    name="pricing"
                    checked={!isFree}
                    onChange={() => setIsFree(false)}
                    className="cursor-pointer"
                  />
                  Paid (USDC)
                </Flex>
              </Text>
            </Flex>

            {!isFree && (
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Price (USDC)
                </Text>
                <TextField.Root>
                  <TextField.Slot>$</TextField.Slot>
                  <TextField.Input
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </TextField.Root>
                <Text as="div" size="1" color="gray" mt="1">
                  Viewers will pay in USDC on Solana devnet
                </Text>
              </label>
            )}
          </Flex>
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
          >
            {loading ? "Starting..." : "Go Live"}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
