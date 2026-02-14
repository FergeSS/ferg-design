import { config } from "./config.js";

function readAdminKey(req) {
  const headerKey = req.header("x-admin-key");
  if (headerKey) {
    return headerKey;
  }

  const bearer = req.header("authorization") || "";
  if (bearer.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim();
  }

  return "";
}

export function isAdminRequest(req) {
  const key = readAdminKey(req);
  return Boolean(key) && key === config.adminApiKey;
}

export function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Admin access required" });
    return;
  }

  next();
}
