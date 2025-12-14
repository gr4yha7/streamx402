"use client";

import { useState, useEffect } from "react";
import { useSolana } from "@/components/solana-provider";

interface StreamMetadataFormProps {
  streamId?: string;
  roomName?: string;
  initialData?: {
    title?: string;
    description?: string;
    category?: string;
    thumbnail?: string;
    price?: number;
  };
  onSubmit: (data: {
    title: string;
    description?: string;
    category?: string;
    thumbnail?: string;
    price?: number;
  }) => Promise<void>;
  onCancel?: () => void;
}

const CATEGORIES = [
  "Gaming",
  "Music",
  "Just Chatting",
  "Art",
  "Cooking",
  "Education",
  "Sports",
  "Tech",
  "Entertainment",
  "Other",
];

export function StreamMetadataForm({
  streamId,
  roomName,
  initialData,
  onSubmit,
  onCancel,
}: StreamMetadataFormProps) {
  const { address } = useSolana();
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        title,
        description: description || undefined,
        category: category || undefined,
        thumbnail: thumbnail || undefined,
        price: parseFloat(price) > 0 ? parseFloat(price) : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save stream metadata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Stream Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={100}
          className="w-full px-4 py-2 bg-background-dark border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-primary focus:border-primary"
          placeholder="Enter stream title..."
        />
        <p className="text-gray-400 text-xs mt-1">{title.length}/100 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full px-4 py-2 bg-background-dark border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-primary focus:border-primary resize-none"
          placeholder="Describe your stream..."
        />
        <p className="text-gray-400 text-xs mt-1">{description.length}/500 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2 bg-background-dark border border-white/20 rounded-lg text-white focus:ring-primary focus:border-primary"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Thumbnail URL
        </label>
        <input
          type="url"
          value={thumbnail}
          onChange={(e) => setThumbnail(e.target.value)}
          className="w-full px-4 py-2 bg-background-dark border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-primary focus:border-primary"
          placeholder="https://example.com/thumbnail.jpg"
        />
        {thumbnail && (
          <img
            src={thumbnail}
            alt="Thumbnail preview"
            className="mt-2 w-full max-w-xs h-32 object-cover rounded-lg border border-white/20"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Price (USDC)
        </label>
        <div className="relative">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="0.01"
            className="w-full px-4 py-2 bg-background-dark border border-white/20 rounded-lg text-white placeholder-gray-500 focus:ring-primary focus:border-primary"
            placeholder="0.00"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            USDC
          </span>
        </div>
        <p className="text-gray-400 text-xs mt-1">
          Set to 0 for free streams. Minimum: 0.01 USDC for paid streams.
        </p>
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {loading ? "Saving..." : streamId ? "Update Stream" : "Create Stream"}
        </button>
      </div>
    </form>
  );
}

