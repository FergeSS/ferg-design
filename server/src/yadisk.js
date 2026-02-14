import { createHttpError } from "./utils.js";

export async function resolveYandexDiskDirectUrl(publicLink) {
  const source = String(publicLink || "").trim();
  if (!source) {
    throw createHttpError(400, "Yandex Disk link is required");
  }

  const endpoint = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(source)}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw createHttpError(
      400,
      "Failed to resolve Yandex Disk link. Ensure the link is public and points to a file.",
    );
  }

  const payload = await response.json();
  if (!payload?.href || typeof payload.href !== "string") {
    throw createHttpError(400, "Yandex Disk did not return a direct download URL");
  }

  return payload.href;
}
