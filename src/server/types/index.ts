import type {
  BrexTransaction,
  Invoice,
  FetchMethod,
  ProviderConfig,
} from "../../shared/types.js";

export interface InvoiceFetchResult {
  success: boolean;
  invoice?: Partial<Invoice>;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  invoiceNumber?: string;
  errorMessage?: string;
}

export interface InvoiceProvider {
  readonly id: string;
  readonly name: string;

  /** Fetch an invoice via the provider's API */
  fetchViaApi(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult>;

  /** Fetch an invoice via email parsing */
  fetchViaEmail(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult>;

  /** Fetch an invoice via portal scraping */
  fetchViaPortal(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult>;

  /** Fetch using the preferred method from config */
  fetch(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult>;
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

export interface ScraperContext {
  headless: boolean;
  dataDir: string;
}
