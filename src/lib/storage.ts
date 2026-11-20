import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { STORAGE, isStorageConfigured } from "@/lib/env";

/**
 * Neon Object Storage (S3-compatible). Images go into a `public_read` bucket,
 * so the stored URL can be used directly on the storefront.
 */
let client: S3Client | null = null;

function s3() {
  if (!isStorageConfigured) throw new Error("Image storage isn't configured (see README → Neon Object Storage). You can paste an image URL instead.");
  client ??= new S3Client({
    region: STORAGE.region,
    endpoint: STORAGE.endpoint,
    credentials: { accessKeyId: STORAGE.accessKeyId, secretAccessKey: STORAGE.secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

export function publicUrl(key: string) {
  return `${STORAGE.endpoint.replace(/\/$/, "")}/${STORAGE.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3().send(new PutObjectCommand({
    Bucket: STORAGE.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable",
  }));
  return publicUrl(key);
}
