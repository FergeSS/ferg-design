import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");

const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".zip",
  ".gz",
  ".tar",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
]);

const blockedFilePatterns = [
  {
    rule: "Do not commit .env files (use .env.example)",
    regex: /(^|\/)\.env($|\.(?!example$)[^/]+$)/,
  },
  {
    rule: "Do not commit private keys/certs",
    regex: /(^|\/)(id_rsa|.*\.(pem|key|p12|pfx))$/i,
  },
];

const secretPatterns = [
  {
    name: "Private key block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    name: "AWS access key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: "GitHub token",
    regex: /\b(ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  },
  {
    name: "Slack token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  },
  {
    name: "Stripe live key",
    regex: /\bsk_live_[0-9a-zA-Z]{20,}\b/,
  },
  {
    name: "Suspicious secret assignment",
    regex:
      /\b(api[_-]?key|secret|token|password|passwd|private[_-]?key)\b\s*[:=]\s*["']?([A-Za-z0-9_\-+=/]{24,})["']?/i,
    check(match) {
      const value = String(match?.[2] || "");
      if (!value) {
        return false;
      }

      const looksPlaceholder = /(example|sample|placeholder|changeme|change-me|dummy|your_|test|dev-insecure)/i.test(
        value,
      );

      const hasLetter = /[A-Za-z]/.test(value);
      const hasDigit = /\d/.test(value);

      return !looksPlaceholder && hasLetter && hasDigit;
    },
  },
];

function getCommandOutput(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString("utf8");
  } catch {
    return "";
  }
}

function getFiles() {
  const cmd = stagedOnly
    ? "git diff --cached --name-only --diff-filter=ACMR"
    : "git ls-files";

  const output = getCommandOutput(cmd);
  return output
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function shouldSkipFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (binaryExtensions.has(ext)) {
    return true;
  }

  if (filePath.includes("node_modules/")) {
    return true;
  }

  return false;
}

function scanFile(filePath) {
  const issues = [];

  const blocked = blockedFilePatterns.find((item) => item.regex.test(filePath));
  if (blocked) {
    issues.push(`${filePath}: ${blocked.rule}`);
    return issues;
  }

  if (shouldSkipFile(filePath)) {
    return issues;
  }

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return issues;
  }

  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
      return;
    }

    secretPatterns.forEach((pattern) => {
      const match = trimmed.match(pattern.regex);
      if (!match) {
        return;
      }

      if (typeof pattern.check === "function" && !pattern.check(match, trimmed)) {
        return;
      }

      issues.push(`${filePath}:${index + 1} -> ${pattern.name}`);
    });
  });

  return issues;
}

function main() {
  const files = getFiles();
  if (!files.length) {
    console.log("[secret-scan] no files to scan");
    return;
  }

  const issues = files.flatMap((filePath) => scanFile(filePath));

  if (!issues.length) {
    console.log(`[secret-scan] ok (${files.length} files scanned)`);
    return;
  }

  console.error("[secret-scan] potential secrets detected:");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

main();
