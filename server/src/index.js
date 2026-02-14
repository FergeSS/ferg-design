import { buildApp } from "./app.js";
import { closeDb } from "./db.js";
import { config } from "./config.js";

const app = buildApp();
const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ferg Design API is running on http://localhost:${config.port}`);
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down...`);

  await new Promise((resolve) => {
    server.close(() => resolve());
  });

  await closeDb();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
