// ── Core domain types shared between client and server ──

export interface BrexTransaction {
  id: string;
  date: string;
  description: string;
  vendor: string;
  amount: number;
  currency: string;
  category: string;
  cardLast4?: string;
  memo?: string;
  rawRow: Record<string, string>;
}

export type FetchMethod = "api" | "email" | "portal";

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  /** Which fetch methods this provider supports */
  supportedMethods: FetchMethod[];
  /** Which method to use (user preference) */
  preferredMethod: FetchMethod;
  /** Vendor name patterns to match from Brex export */
  vendorPatterns: string[];
  /** Provider-specific credentials and settings */
  settings: Record<string, string>;
  /** Portal URL for scraping method */
  portalUrl?: string;
  /** Email sender patterns for email method */
  emailSenderPatterns?: string[];
}

export type InvoiceStatus =
  | "pending"
  | "fetching"
  | "found"
  | "downloaded"
  | "not_found"
  | "error";

export interface Invoice {
  id: string;
  transactionId: string;
  providerId: string;
  providerName: string;
  vendor: string;
  amount: number;
  currency: string;
  date: string;
  invoiceNumber?: string;
  status: InvoiceStatus;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  fetchMethod?: FetchMethod;
  errorMessage?: string;
  fetchedAt?: string;
}

export interface AggregationJob {
  id: string;
  status: "idle" | "parsing" | "matching" | "fetching" | "complete" | "error";
  fileName: string;
  uploadedAt: string;
  totalTransactions: number;
  matchedTransactions: number;
  invoicesFound: number;
  invoicesDownloaded: number;
  errors: number;
  transactions: BrexTransaction[];
  invoices: Invoice[];
  progress: number;
  currentProvider?: string;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  supportedMethods: FetchMethod[];
  requiredSettings: ProviderSettingDef[];
  defaultVendorPatterns: string[];
  defaultEmailSenderPatterns?: string[];
  defaultPortalUrl?: string;
}

export interface ProviderSettingDef {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

// ── API response types ──

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadResponse {
  jobId: string;
  transactions: BrexTransaction[];
  matchedProviders: { providerId: string; transactionIds: string[] }[];
}

export interface JobStatusResponse {
  job: AggregationJob;
}
