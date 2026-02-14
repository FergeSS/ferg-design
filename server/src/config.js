import dotenv from "dotenv";

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function listEnv(name, fallback = []) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: numberEnv("PORT", 8787),
  databaseUrl: required("DATABASE_URL"),
  adminApiKey: process.env.ADMIN_API_KEY || "dev-insecure-change-me",
  corsOrigins: listEnv("CORS_ORIGIN", ["*"]),
  maxUploadMb: numberEnv("MAX_UPLOAD_MB", 250),
  maxPhotoFiles: numberEnv("MAX_PHOTO_FILES", 20),
  privateUrlTtlSec: numberEnv("PRIVATE_URL_TTL_SEC", 900),
  s3: {
    endpoint: process.env.S3_ENDPOINT || "https://storage.yandexcloud.net",
    region: process.env.S3_REGION || "ru-central1",
    bucket: process.env.S3_BUCKET || "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    forcePathStyle: boolEnv("S3_FORCE_PATH_STYLE", false),
    publicMediaBaseUrl:
      process.env.PUBLIC_MEDIA_BASE_URL ||
      `https://storage.yandexcloud.net/${process.env.S3_BUCKET || "bucket"}`,
  },
};
