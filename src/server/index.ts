import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Import all providers so they self-register
import "./providers/google-ads.js";
import "./providers/meta-ads.js";
import "./providers/criteo.js";
import "./providers/amazon-ads.js";
import "./providers/applovin.js";
import "./providers/custom-provider.js";

import { uploadRouter } from "./routes/upload.js";
import { invoicesRouter } from "./routes/invoices.js";
import { providersRouter } from "./routes/providers.js";
import { settingsRouter } from "./routes/settings.js";
import { configStore } from "./services/config-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/upload", uploadRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/providers", providersRouter);
app.use("/api/settings", settingsRouter);

// Serve static frontend in production
if (process.env.NODE_ENV === "production") {
  const clientDir = path.join(__dirname, "../client");
  app.use(express.static(clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

// Start
async function start() {
  // Load provider configs from disk
  await configStore.load();

  app.listen(PORT, () => {
    console.log(`
  ┌─────────────────────────────────────────────┐
  │       Invoice Aggregator Server              │
  │       Running on http://localhost:${PORT}       │
  │                                             │
  │  API:    http://localhost:${PORT}/api          │
  │  Health: http://localhost:${PORT}/api/settings/health │
  └─────────────────────────────────────────────┘
    `);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
