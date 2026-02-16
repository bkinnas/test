import { Router } from "express";
import type { ApiResponse } from "../../shared/types.js";

export const settingsRouter = Router();

/**
 * GET /api/settings/email
 * Check if email IMAP is configured.
 */
settingsRouter.get("/email", async (_req, res) => {
  const configured = !!(process.env.EMAIL_IMAP_HOST && process.env.EMAIL_IMAP_USER);
  res.json({
    success: true,
    data: {
      configured,
      host: process.env.EMAIL_IMAP_HOST || "",
      user: process.env.EMAIL_IMAP_USER || "",
      port: Number(process.env.EMAIL_IMAP_PORT) || 993,
      tls: process.env.EMAIL_IMAP_TLS !== "false",
    },
  } satisfies ApiResponse);
});

/**
 * GET /api/settings/scraper
 * Check scraper configuration.
 */
settingsRouter.get("/scraper", async (_req, res) => {
  res.json({
    success: true,
    data: {
      headless: process.env.PUPPETEER_HEADLESS !== "false",
      dataDir: process.env.DATA_DIR || "./data",
    },
  } satisfies ApiResponse);
});

/**
 * GET /api/settings/health
 * Health check endpoint.
 */
settingsRouter.get("/health", async (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  } satisfies ApiResponse);
});
