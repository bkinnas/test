import type { BrexTransaction, ProviderConfig } from "../../shared/types.js";
import type { InvoiceFetchResult, InvoiceProvider } from "../types/index.js";

/**
 * Abstract base class for all invoice providers.
 * Subclasses must implement at least one fetch method.
 * The `fetch()` dispatcher routes to the preferred method from config.
 */
export abstract class BaseProvider implements InvoiceProvider {
  abstract readonly id: string;
  abstract readonly name: string;

  async fetch(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const method = config.preferredMethod;

    switch (method) {
      case "api":
        return this.fetchViaApi(transaction, config);
      case "email":
        return this.fetchViaEmail(transaction, config);
      case "portal":
        return this.fetchViaPortal(transaction, config);
      default:
        return {
          success: false,
          errorMessage: `Unknown fetch method: ${method}`,
        };
    }
  }

  async fetchViaApi(
    _transaction: BrexTransaction,
    _config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    return {
      success: false,
      errorMessage: `${this.name}: API fetch not implemented`,
    };
  }

  async fetchViaEmail(
    _transaction: BrexTransaction,
    _config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    return {
      success: false,
      errorMessage: `${this.name}: Email fetch not implemented`,
    };
  }

  async fetchViaPortal(
    _transaction: BrexTransaction,
    _config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    return {
      success: false,
      errorMessage: `${this.name}: Portal scraping not implemented`,
    };
  }

  /** Utility: format a date string to YYYY-MM for billing period matching */
  protected billingPeriod(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  /** Utility: build an output file path for a downloaded invoice */
  protected invoiceFileName(
    providerName: string,
    date: string,
    ext = "pdf"
  ): string {
    const period = this.billingPeriod(date);
    const safe = providerName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    return `${safe}_invoice_${period}.${ext}`;
  }
}
