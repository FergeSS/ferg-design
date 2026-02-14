import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "../sql/schema.sql");

async function run() {
  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);
  // eslint-disable-next-line no-console
  console.log("Database schema initialized successfully.");
}

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize schema:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
