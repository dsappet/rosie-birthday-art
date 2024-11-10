// components/ImageGallery.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import type { Image, StreamResponse } from "../../types";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageCard } from "./ImageCard";

export function ImageGallery() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const continuationTokenRef = useRef<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "400px",
  });

  const loadImages = useCallback(async () => {
    if (loading || !hasNextPage) return;

    try {
      setLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      const url = new URL("/api/images", window.location.origin);
      if (continuationTokenRef.current) {
        url.searchParams.set("continuationToken", continuationTokenRef.current);
      }

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data: StreamResponse = JSON.parse(line);

            switch (data.status) {
              case "processing":
                if (data.progress) {
                  setProgress(data.progress);
                }
                break;

              case "complete":
                if (data.images) {
                  setImages((prev) => [...prev, ...(data.images as Image[])]);
                  setHasNextPage(data.hasMore || false);
                  continuationTokenRef.current = data.continuationToken;
                }
                break;

              case "error":
                throw new Error(data.error || "Unknown error occurred");
            }
          } catch (e) {
            console.error("Error parsing stream data:", e);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(
          err.name === "AbortError" ? "Request was cancelled" : err.message
        );
      }
    } finally {
      setLoading(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  }, [loading, hasNextPage]);

  useEffect(() => {
    if (inView) {
      loadImages();
    }
  }, [inView, loadImages]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {progress && (
        <div className="space-y-2 mb-4">
          <div className="text-sm text-neutral-600">
            Processing images: {progress.processed} / {progress.total}
          </div>
          <Progress value={(progress.processed / progress.total) * 100} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <ImageCard key={image.id} image={image} />
        ))}
      </div>

      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {loading && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
        )}
      </div>
    </div>
  );
}
