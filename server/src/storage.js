import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config.js";

function assertStorageConfig() {
  if (!config.s3.bucket) {
    throw new Error("Missing required environment variable: S3_BUCKET");
  }
  if (!config.s3.accessKeyId) {
    throw new Error("Missing required environment variable: S3_ACCESS_KEY_ID");
  }
  if (!config.s3.secretAccessKey) {
    throw new Error("Missing required environment variable: S3_SECRET_ACCESS_KEY");
  }
}

assertStorageConfig();

const client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

function encodeObjectKey(key) {
  return String(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function getPublicMediaUrl(objectKey) {
  const base = config.s3.publicMediaBaseUrl.replace(/\/+$/, "");
  return `${base}/${encodeObjectKey(objectKey)}`;
}

export async function uploadBuffer({ key, buffer, mimeType }) {
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    publicUrl: getPublicMediaUrl(key),
  };
}

export async function uploadStream({ key, stream, mimeType, contentLength }) {
  const input = {
    Bucket: config.s3.bucket,
    Key: key,
    Body: stream,
    ContentType: mimeType || "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
  };

  if (Number.isFinite(contentLength) && contentLength > 0) {
    input.ContentLength = contentLength;
  }

  const uploader = new Upload({
    client,
    params: input,
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });

  await uploader.done();

  return {
    key,
    publicUrl: getPublicMediaUrl(key),
  };
}

export async function deleteObjectByKey(key) {
  if (!key) {
    return;
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }),
  );
}

export async function deleteManyByKeys(keys) {
  const uniqueKeys = Array.from(new Set((keys || []).filter(Boolean)));
  await Promise.all(
    uniqueKeys.map(async (key) => {
      try {
        await deleteObjectByKey(key);
      } catch {
        // best effort cleanup
      }
    }),
  );
}

export async function getSignedReadUrl(objectKey, expiresInSec = config.privateUrlTtlSec) {
  if (!objectKey) {
    return null;
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: objectKey,
    }),
    { expiresIn: expiresInSec },
  );
}
