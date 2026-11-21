export const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** True when the database is configured. */
export const isConfigured = Boolean(DATABASE_URL);

/** Neon Object Storage (S3-compatible). Optional: without it, admins paste image URLs. */
export const STORAGE = {
  endpoint: process.env.AWS_ENDPOINT_URL_S3 ?? "",
  region: process.env.AWS_REGION ?? "us-east-2",
  bucket: process.env.NEON_STORAGE_BUCKET ?? "media",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
};
export const isStorageConfigured = Boolean(STORAGE.endpoint && STORAGE.accessKeyId && STORAGE.secretAccessKey);
