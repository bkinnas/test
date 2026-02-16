import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { aggregator } from "../services/invoice-aggregator.js";
import { configStore } from "../services/config-store.js";
import type { ApiResponse, AggregationJob, JobStatusResponse } from "../../shared/types.js";

export const invoicesRouter = Router();

/**
 * GET /api/invoices/jobs
 * List all aggregation jobs.
 */
invoicesRouter.get("/jobs", async (_req, res) => {
  const jobs = aggregator.getAllJobs();
  res.json({ success: true, data: jobs } satisfies ApiResponse<AggregationJob[]>);
});

/**
 * GET /api/invoices/jobs/:jobId
 * Get the status and details of a specific job.
 */
invoicesRouter.get("/jobs/:jobId", async (req, res) => {
  const job = aggregator.getJob(req.params.jobId!);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" } satisfies ApiResponse);
    return;
  }
  res.json({ success: true, data: { job } } satisfies ApiResponse<JobStatusResponse>);
});

/**
 * POST /api/invoices/jobs/:jobId/fetch
 * Start fetching invoices for a job.
 */
invoicesRouter.post("/jobs/:jobId/fetch", async (req, res) => {
  const job = aggregator.getJob(req.params.jobId!);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" } satisfies ApiResponse);
    return;
  }

  if (job.status === "fetching") {
    res.status(409).json({ success: false, error: "Job is already fetching" } satisfies ApiResponse);
    return;
  }

  // Start fetching in the background
  const configs = await configStore.getAll();
  aggregator.executeJob(job.id, configs).catch((err) => {
    console.error(`[invoices] Job ${job.id} failed:`, err);
  });

  res.json({ success: true, data: { job } } satisfies ApiResponse<JobStatusResponse>);
});

/**
 * GET /api/invoices/download/:jobId/:invoiceId
 * Download a specific invoice file.
 */
invoicesRouter.get("/download/:jobId/:invoiceId", async (req, res) => {
  const job = aggregator.getJob(req.params.jobId!);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" } satisfies ApiResponse);
    return;
  }

  const invoice = job.invoices.find((inv) => inv.id === req.params.invoiceId);
  if (!invoice || !invoice.filePath) {
    res.status(404).json({ success: false, error: "Invoice file not found" } satisfies ApiResponse);
    return;
  }

  try {
    await fs.access(invoice.filePath);
    res.setHeader("Content-Type", invoice.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.fileName || "invoice.pdf"}"`
    );
    const fileBuffer = await fs.readFile(invoice.filePath);
    res.send(fileBuffer);
  } catch {
    res.status(404).json({ success: false, error: "Invoice file not found on disk" } satisfies ApiResponse);
  }
});

/**
 * GET /api/invoices/download-all/:jobId
 * Download all invoices for a job as individual files (returns a list of download links).
 */
invoicesRouter.get("/download-all/:jobId", async (req, res) => {
  const job = aggregator.getJob(req.params.jobId!);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" } satisfies ApiResponse);
    return;
  }

  const downloadable = job.invoices
    .filter((inv) => inv.status === "downloaded" && inv.filePath)
    .map((inv) => ({
      invoiceId: inv.id,
      provider: inv.providerName,
      fileName: inv.fileName,
      url: `/api/invoices/download/${job.id}/${inv.id}`,
    }));

  res.json({ success: true, data: downloadable } satisfies ApiResponse);
});
