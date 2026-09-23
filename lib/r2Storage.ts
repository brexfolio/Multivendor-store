import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let s3ClientInstance: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

function getR2Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials are not fully configured.");
  }

  s3ClientInstance = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

/**
 * Uploads a file buffer directly to Cloudflare R2.
 * Includes permanent 1-year immutable cache headers for edge CDN.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ key: string; publicUrl: string }> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;

  const datePrefix = new Date().toISOString().slice(0, 7);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `media/${datePrefix}/${Date.now()}-${randomSuffix}-${cleanName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await client.send(command);

  const customDomain = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const publicUrl = customDomain
    ? `${customDomain}/${key}`
    : `https://${bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  return { key, publicUrl };
}
