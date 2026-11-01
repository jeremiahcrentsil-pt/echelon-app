import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type StoredObject = {
  /** Stable storage key, e.g. progress-photos/userId/id.jpg */
  key: string;
  /**
   * URL clients can load. Either a public S3/R2 base URL or an authenticated
   * app proxy path for private/local storage.
   */
  url: string;
  bytes: number;
  contentType: string;
};

function s3Configured() {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

function localRoot() {
  // Keys already include the "progress-photos/" prefix, so the root is ./storage
  return path.resolve(
    process.env.PROGRESS_PHOTOS_STORAGE_DIR ||
      path.join(process.cwd(), "storage"),
  );
}

function getS3Client() {
  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  return new S3Client({
    region,
    endpoint,
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === "true" ||
      Boolean(endpoint && /localhost|127\.0\.0\.1|minio/i.test(endpoint)),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export function objectStorageMode(): "s3" | "filesystem" {
  return s3Configured() ? "s3" : "filesystem";
}

export function buildProgressPhotoKey(userId: string, photoId: string) {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePhoto = photoId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `progress-photos/${safeUser}/${safePhoto}.jpg`;
}

function publicUrlForKey(key: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base && s3Configured()) return `${base}/${key}`;
  // Private bucket / local filesystem — serve through authenticated API
  return `/api/progress-photos/object?key=${encodeURIComponent(key)}`;
}

export function parseDataUrl(dataUrl: string): {
  buffer: Buffer;
  contentType: string;
} {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Expected a base64 data URL image payload");
  }
  return {
    contentType: match[1] || "image/jpeg",
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<StoredObject> {
  if (s3Configured()) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: "private, max-age=31536000",
      }),
    );
    return {
      key: params.key,
      url: publicUrlForKey(params.key),
      bytes: params.body.byteLength,
      contentType: params.contentType,
    };
  }

  const absolute = path.join(localRoot(), params.key);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, params.body);
  return {
    key: params.key,
    url: publicUrlForKey(params.key),
    bytes: params.body.byteLength,
    contentType: params.contentType,
  };
}

export async function deleteObject(key: string): Promise<void> {
  if (!key) return;
  if (s3Configured()) {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
    );
    return;
  }
  const absolute = path.join(localRoot(), key);
  try {
    await unlink(absolute);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

async function streamToBuffer(
  body: AsyncIterable<Uint8Array> | ReadableStream | Blob | undefined,
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof (body as Blob).arrayBuffer === "function") {
    return Buffer.from(await (body as Blob).arrayBuffer());
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function readObject(key: string): Promise<{
  buffer: Buffer;
  contentType: string;
} | null> {
  if (!isSafeObjectKey(key)) return null;

  if (s3Configured()) {
    try {
      const client = getS3Client();
      const result = await client.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
        }),
      );
      const buffer = await streamToBuffer(
        result.Body as AsyncIterable<Uint8Array> | undefined,
      );
      return {
        buffer,
        contentType: result.ContentType || "image/jpeg",
      };
    } catch {
      return null;
    }
  }

  const absolute = path.join(localRoot(), key);
  try {
    const buffer = await readFile(absolute);
    return { buffer, contentType: "image/jpeg" };
  } catch {
    return null;
  }
}

/** Prevent path traversal outside the storage root / bucket prefix. */
export function isSafeObjectKey(key: string) {
  if (!key || key.includes("\0")) return false;
  if (key.startsWith("/") || key.includes("..")) return false;
  if (!key.startsWith("progress-photos/")) return false;
  return true;
}
