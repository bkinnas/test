import { BaseProvider } from "./base-provider.js";
import { registry } from "./provider-registry.js";
import type { BrexTransaction, ProviderConfig } from "../../shared/types.js";
import type { InvoiceFetchResult } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

/**
 * Generic / Custom provider.
 *
 * This provider serves as a template for adding new services.
 * It supports email fetching and portal scraping with user-defined
 * navigation steps stored in config.
 *
 * Users can add new instances of this provider through the UI,
 * specifying custom vendor patterns, email senders, and portal URLs.
 */
class CustomProvider extends BaseProvider {
  readonly id = "custom";
  readonly name = "Custom Provider";

  async fetchViaEmail(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const { EmailFetcher } = await import("../services/email-fetcher.js");

    const emailConfig = {
      host: process.env.EMAIL_IMAP_HOST || "",
      port: Number(process.env.EMAIL_IMAP_PORT) || 993,
      user: process.env.EMAIL_IMAP_USER || "",
      password: process.env.EMAIL_IMAP_PASSWORD || "",
      tls: process.env.EMAIL_IMAP_TLS !== "false",
    };

    if (!emailConfig.host || !emailConfig.user) {
      return { success: false, errorMessage: "Email IMAP not configured" };
    }

    const fetcher = new EmailFetcher(emailConfig);
    const senders = config.emailSenderPatterns || [];

    if (senders.length === 0) {
      return { success: false, errorMessage: "No email sender patterns configured for this provider" };
    }

    const txDate = new Date(transaction.date);
    const dateFrom = new Date(txDate.getFullYear(), txDate.getMonth(), 1).toISOString().split("T")[0]!;
    const dateTo = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 5).toISOString().split("T")[0]!;

    try {
      const emails = await fetcher.searchInvoiceEmails({
        senderPatterns: senders,
        dateFrom,
        dateTo,
      });

      for (const email of emails) {
        if (email.attachments.length > 0) {
          const attachment = email.attachments[0]!;
          const safeName = config.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
          const fileName = this.invoiceFileName(safeName, transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", config.id);
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, attachment.content);

          return { success: true, filePath, fileName, mimeType: attachment.contentType };
        }
      }

      return { success: false, errorMessage: `No invoice emails found for ${config.name}` };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Email fetch error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async fetchViaPortal(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    if (!config.portalUrl) {
      return { success: false, errorMessage: "No portal URL configured for this provider" };
    }

    const { PortalScraper } = await import("../services/portal-scraper.js");
    const scraper = new PortalScraper({
      headless: process.env.PUPPETEER_HEADLESS !== "false",
      dataDir: DATA_DIR,
    });

    const downloadDir = path.join(DATA_DIR, "invoices", config.id);

    try {
      // Use basic navigation: go to portal, attempt login, wait for downloads
      const invoices = await scraper.scrapeInvoices(
        {
          portalUrl: config.portalUrl,
          credentials: config.settings,
          dateFrom: transaction.date,
          dateTo: transaction.date,
          downloadDir,
        },
        [
          { action: "goto", description: `Navigate to ${config.name} portal` },
          { action: "wait", value: "5000", description: "Wait for page to load" },
        ]
      );

      if (invoices.length > 0) {
        const inv = invoices[0]!;
        return { success: true, filePath: inv.filePath, fileName: inv.fileName, mimeType: inv.mimeType };
      }

      return { success: false, errorMessage: `No invoices found via ${config.name} portal` };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Portal scraping error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

const provider = new CustomProvider();
registry.register(provider, {
  id: "custom",
  name: "Custom Provider",
  description: "Template for adding any new service. Supports email parsing and portal scraping.",
  icon: "custom",
  supportedMethods: ["email", "portal"],
  defaultVendorPatterns: [],
  requiredSettings: [
    { key: "email", label: "Login Email", type: "text", required: false, placeholder: "user@example.com" },
    { key: "password", label: "Login Password", type: "password", required: false },
  ],
});

export default provider;
