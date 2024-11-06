// app/api/images/route.ts
import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: `https://s3.${process.env.B2_REGION}.backblazeb2.com`,
  region: process.env.B2_REGION!,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const continuationToken = searchParams.get("continuationToken");

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const writeJSON = async (data: any) => {
    await writer.write(encoder.encode(JSON.stringify(data) + "\n"));
  };

  const processImages = async () => {
    try {
      await writeJSON({ status: "processing" });

      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.B2_BUCKET_NAME!,
        MaxKeys: 20,
        ContinuationToken: continuationToken || undefined,
      });

      const { Contents, IsTruncated, NextContinuationToken } =
        await s3Client.send(listCommand);

      if (!Contents) {
        await writeJSON({ status: "complete", images: [], hasMore: false });
        return;
      }
      let processedImages: any[] = [];
      // Process in batches of 5
      const batchSize = 5;
      const batches = Array.from(
        { length: Math.ceil(Contents.length / batchSize) },
        (_, i) => Contents.slice(i * batchSize, (i + 1) * batchSize)
      );

      for (const batch of batches) {
        const processedBatch = await Promise.all(
          batch.map(async (file) => {
            if (!file.Key) return null;

            const getCommand = new GetObjectCommand({
              Bucket: process.env.B2_BUCKET_NAME!,
              Key: file.Key,
            });

            const url = await getSignedUrl(s3Client, getCommand, {
              expiresIn: 3600,
            });

            return {
              id: file.ETag?.replace(/"/g, "") || file.Key,
              fileName: file.Key,
              url,
            };
          })
        );

        const validBatch = processedBatch.filter(Boolean);
        processedImages = [...processedImages, ...validBatch];

        await writeJSON({
          status: "processing",
          progress: {
            processed: processedBatch.filter(Boolean).length,
            total: Contents.length,
          },
        });
      }

      await writeJSON({
        status: "complete",
        images: processedImages,
        hasMore: IsTruncated,
        continuationToken: NextContinuationToken,
      });
    } catch (error) {
      console.error("Error processing images:", error);
      await writeJSON({
        status: "error",
        error: "Failed to process images",
      });
    } finally {
      await writer.close();
    }
  };

  processImages();

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
