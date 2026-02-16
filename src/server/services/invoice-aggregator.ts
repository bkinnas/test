import { v4 as uuid } from "uuid";
import type {
  AggregationJob,
  BrexTransaction,
  Invoice,
  ProviderConfig,
} from "../../shared/types.js";
import { registry } from "../providers/provider-registry.js";
import type { InvoiceFetchResult } from "../types/index.js";

/**
 * The invoice aggregation engine — orchestrates the full pipeline:
 * 1. Takes parsed Brex transactions
 * 2. Matches each transaction to a configured provider by vendor name
 * 3. Fetches invoices from matched providers (API / email / portal)
 * 4. Tracks progress and results in an AggregationJob
 */
export class InvoiceAggregator {
  private jobs = new Map<string, AggregationJob>();

  getJob(jobId: string): AggregationJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): AggregationJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  /**
   * Create a new aggregation job from parsed transactions.
   */
  createJob(transactions: BrexTransaction[], fileName: string): AggregationJob {
    const job: AggregationJob = {
      id: uuid(),
      status: "idle",
      fileName,
      uploadedAt: new Date().toISOString(),
      totalTransactions: transactions.length,
      matchedTransactions: 0,
      invoicesFound: 0,
      invoicesDownloaded: 0,
      errors: 0,
      transactions,
      invoices: [],
      progress: 0,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Match transactions to providers and create pending invoice entries.
   */
  matchTransactions(
    jobId: string,
    providerConfigs: ProviderConfig[]
  ): { providerId: string; transactionIds: string[] }[] {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = "matching";
    const matches: { providerId: string; transactionIds: string[] }[] = [];

    for (const config of providerConfigs) {
      if (!config.enabled) continue;

      const matchedTxIds: string[] = [];

      for (const tx of job.transactions) {
        const vendor = tx.vendor.toLowerCase();
        const description = tx.description.toLowerCase();

        const isMatch = config.vendorPatterns.some((pattern) => {
          const p = pattern.toLowerCase();
          // Support wildcard patterns like "google *ads"
          if (p.includes("*")) {
            const regex = new RegExp(
              "^" + p.replace(/\*/g, ".*") + "$",
              "i"
            );
            return regex.test(vendor) || regex.test(description);
          }
          return vendor.includes(p) || description.includes(p);
        });

        if (isMatch) {
          matchedTxIds.push(tx.id);

          // Create a pending invoice record
          const invoice: Invoice = {
            id: uuid(),
            transactionId: tx.id,
            providerId: config.id,
            providerName: config.name,
            vendor: tx.vendor,
            amount: tx.amount,
            currency: tx.currency,
            date: tx.date,
            status: "pending",
          };

          job.invoices.push(invoice);
        }
      }

      if (matchedTxIds.length > 0) {
        matches.push({ providerId: config.id, transactionIds: matchedTxIds });
      }
    }

    job.matchedTransactions = new Set(
      job.invoices.map((inv) => inv.transactionId)
    ).size;

    return matches;
  }

  /**
   * Execute the aggregation — fetch all matched invoices.
   * Runs provider-by-provider, updating job progress along the way.
   */
  async executeJob(
    jobId: string,
    providerConfigs: ProviderConfig[]
  ): Promise<AggregationJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = "fetching";
    job.progress = 0;

    const totalInvoices = job.invoices.length;
    let processed = 0;

    // Group invoices by provider
    const byProvider = new Map<string, Invoice[]>();
    for (const inv of job.invoices) {
      const list = byProvider.get(inv.providerId) || [];
      list.push(inv);
      byProvider.set(inv.providerId, list);
    }

    for (const [providerId, invoices] of byProvider) {
      const provider = registry.getProvider(providerId);
      const config = providerConfigs.find((c) => c.id === providerId);

      if (!provider || !config) {
        for (const inv of invoices) {
          inv.status = "error";
          inv.errorMessage = "Provider not found or not configured";
          job.errors++;
          processed++;
          job.progress = Math.round((processed / totalInvoices) * 100);
        }
        continue;
      }

      job.currentProvider = config.name;

      for (const inv of invoices) {
        inv.status = "fetching";
        inv.fetchMethod = config.preferredMethod;

        const transaction = job.transactions.find(
          (tx) => tx.id === inv.transactionId
        );

        if (!transaction) {
          inv.status = "error";
          inv.errorMessage = "Transaction not found";
          job.errors++;
          processed++;
          job.progress = Math.round((processed / totalInvoices) * 100);
          continue;
        }

        try {
          const result: InvoiceFetchResult = await provider.fetch(
            transaction,
            config
          );

          if (result.success) {
            inv.status = "downloaded";
            inv.filePath = result.filePath;
            inv.fileName = result.fileName;
            inv.mimeType = result.mimeType;
            inv.invoiceNumber = result.invoiceNumber;
            inv.fetchedAt = new Date().toISOString();
            job.invoicesFound++;
            job.invoicesDownloaded++;
          } else {
            inv.status = "not_found";
            inv.errorMessage = result.errorMessage;
          }
        } catch (err) {
          inv.status = "error";
          inv.errorMessage =
            err instanceof Error ? err.message : String(err);
          job.errors++;
        }

        processed++;
        job.progress = Math.round((processed / totalInvoices) * 100);
      }
    }

    job.status = "complete";
    job.progress = 100;
    job.currentProvider = undefined;

    return job;
  }
}

// Singleton
export const aggregator = new InvoiceAggregator();
