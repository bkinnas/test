/**
 * setup.js — Cross-platform setup script.
 * Creates the .env file from .env.example if it doesn't exist,
 * creates required data directories, and validates Node.js version.
 *
 * Run with:  node scripts/setup.js
 *   or:      npm run setup
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function main() {
  console.log("");
  console.log("===========================================");
  console.log("  Invoice Aggregator — Setup");
  console.log("===========================================");
  console.log("");

  // ── Check Node version ──
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split(".")[0], 10);
  if (major < 18) {
    console.error(`ERROR: Node.js 18+ is required. You have v${nodeVersion}.`);
    console.error("Download the latest version from: https://nodejs.org");
    process.exit(1);
  }
  console.log(`[OK] Node.js v${nodeVersion}`);

  // ── Create .env from .env.example ──
  const envPath = path.join(ROOT, ".env");
  const examplePath = path.join(ROOT, ".env.example");

  if (fs.existsSync(envPath)) {
    console.log("[OK] .env file already exists (skipping)");
  } else if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log("[OK] Created .env from .env.example");
    console.log("     >> Open .env in a text editor to add your API keys");
  } else {
    console.warn("[WARN] .env.example not found — creating a minimal .env");
    fs.writeFileSync(
      envPath,
      [
        "PORT=3001",
        "NODE_ENV=development",
        "DATA_DIR=./data",
        "",
      ].join("\n")
    );
  }

  // ── Create data directories ──
  const dirs = [
    path.join(ROOT, "data"),
    path.join(ROOT, "data", "invoices"),
    path.join(ROOT, "uploads"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[OK] Created directory: ${path.relative(ROOT, dir)}`);
    }
  }

  // ── Done ──
  console.log("");
  console.log("-------------------------------------------");
  console.log("  Setup complete!");
  console.log("");
  console.log("  Next steps:");
  console.log("");
  console.log("  1. (Optional) Open .env in a text editor");
  console.log("     and add your API credentials for");
  console.log("     Google Ads, Meta Ads, etc.");
  console.log("");
  console.log("  2. Start the app:");
  console.log("");
  console.log("     npm run dev");
  console.log("");
  console.log("  3. Open http://localhost:3000 in your browser");
  console.log("-------------------------------------------");
  console.log("");
}

main();
