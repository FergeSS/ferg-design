import { randomUUID } from "node:crypto";

export function safeFilename(filename = "file") {
  return filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "file";
}

export function buildObjectKey(prefix, originalFilename) {
  const stamp = Date.now();
  return `${prefix}/${stamp}-${randomUUID()}-${safeFilename(originalFilename)}`;
}

export function toHexColor(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return null;
}

export function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
