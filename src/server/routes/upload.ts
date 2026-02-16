import { Router } from "express";
import multer from "multer";
import path from "path";
import { parseBrexSpreadsheet } from "../services/spreadsheet-parser.js";
import { aggregator } from "../services/invoice-aggregator.js";
import { configStore } from "../services/config-store.js";
import type { ApiResponse, UploadResponse } from "../../shared/types.js";

const DATA_DIR = process.env.DATA_DIR || "./data";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".csv", ".xlsx", ".xls"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and XLSX files are supported"));
    }
  },
});

export const uploadRouter = Router();

/**
 * POST /api/upload
 * Upload a Brex spreadsheet, parse transactions, match to providers.
 */
uploadRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "No file uploaded",
      } satisfies ApiResponse);
      return;
    }

    // Parse the spreadsheet
    const transactions = parseBrexSpreadsheet(
      req.file.buffer,
      req.file.originalname
    );

    if (transactions.length === 0) {
      res.status(400).json({
        success: false,
        error: "No transactions found in the spreadsheet",
      } satisfies ApiResponse);
      return;
    }

    // Create an aggregation job
    const job = aggregator.createJob(transactions, req.file.originalname);

    // Match transactions to configured providers
    const configs = await configStore.getAll();
    const matchedProviders = aggregator.matchTransactions(job.id, configs);

    const response: UploadResponse = {
      jobId: job.id,
      transactions,
      matchedProviders,
    };

    res.json({ success: true, data: response } satisfies ApiResponse<UploadResponse>);
  } catch (err) {
    console.error("[upload] Error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    } satisfies ApiResponse);
  }
});
