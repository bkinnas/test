import { BaseProvider } from "./base-provider.js";
import { registry } from "./provider-registry.js";
import type { BrexTransaction, ProviderConfig } from "../../shared/types.js";
import type { InvoiceFetchResult } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

/**
 * AppLovin invoice provider.
 *
 * API method: Uses the AppLovin Management API.
 * Email method: Searches for billing emails from AppLovin.
 * Portal method: Navigates to dash.applovin.com.
 */
class AppLovinProvider extends BaseProvider {
  readonly id = "applovin";
  readonly name = "AppLovin";

  async fetchViaApi(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const { apiKey } = config.settings;

    if (!apiKey) {
      return {
        success: false,
        errorMessage: "Missing AppLovin API key.",
      };
    }

    try {
      const billingPeriod = this.billingPeriod(transaction.date);
      const [year, month] = billingPeriod.split("-").map(Number);

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year!, month!, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      // AppLovin Advertiser Reporting API — billing endpoint
      const res = await fetch(
        `https://r.applovin.com/billing/invoices?` +
          new URLSearchParams({ start: startDate, end: endDate, api_key: apiKey })
      );

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, errorMessage: `AppLovin API error: ${errText}` };
      }

      const data = (await res.json()) as { invoices?: any[] };

      if (!data.invoices?.length) {
        return { success: false, errorMessage: `No AppLovin invoices for period ${billingPeriod}` };
      }

      const inv = data.invoices[0];
      if (inv.pdf_url) {
        const pdfRes = await fetch(inv.pdf_url);
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const fileName = this.invoiceFileName("applovin", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "applovin");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, pdfBuffer);

          return {
            success: true,
            filePath,
            fileName,
            mimeType: "application/pdf",
            invoiceNumber: inv.invoice_id,
          };
        }
      }

      return { success: false, errorMessage: "AppLovin invoice found but PDF download failed" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `AppLovin API error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

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
    const senders = config.emailSenderPatterns || [
      "billing@applovin.com",
      "noreply@applovin.com",
    ];

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
          const fileName = this.invoiceFileName("applovin", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "applovin");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, attachment.content);

          return { success: true, filePath, fileName, mimeType: attachment.contentType };
        }
      }

      return { success: false, errorMessage: "No AppLovin invoice emails found" };
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
    const { PortalScraper } = await import("../services/portal-scraper.js");
    const scraper = new PortalScraper({
      headless: process.env.PUPPETEER_HEADLESS !== "false",
      dataDir: DATA_DIR,
    });

    const downloadDir = path.join(DATA_DIR, "invoices", "applovin");

    try {
      const invoices = await scraper.scrapeInvoices(
        {
          portalUrl: config.portalUrl || "https://dash.applovin.com/o/billing",
          credentials: config.settings,
          dateFrom: transaction.date,
          dateTo: transaction.date,
          downloadDir,
        },
        [
          { action: "goto", description: "Navigate to AppLovin dashboard" },
          { action: "type", selector: 'input[name="email"]', value: "{{email}}", description: "Enter email" },
          { action: "type", selector: 'input[name="password"]', value: "{{password}}", description: "Enter password" },
          { action: "click", selector: "button[type='submit']", description: "Sign in" },
          { action: "waitForNavigation", description: "Wait for dashboard" },
          { action: "wait", value: "3000" },
        ]
      );

      if (invoices.length > 0) {
        const inv = invoices[0]!;
        return { success: true, filePath: inv.filePath, fileName: inv.fileName, mimeType: inv.mimeType };
      }

      return { success: false, errorMessage: "No invoices found via AppLovin portal" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Portal scraping error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

const provider = new AppLovinProvider();
registry.register(provider, {
  id: "applovin",
  name: "AppLovin",
  description: "Fetch invoices from AppLovin advertising platform",
  icon: "applovin",
  supportedMethods: ["api", "email", "portal"],
  defaultVendorPatterns: ["applovin", "app lovin", "applovin corporation"],
  defaultEmailSenderPatterns: ["billing@applovin.com", "noreply@applovin.com"],
  defaultPortalUrl: "https://dash.applovin.com/o/billing",
  requiredSettings: [
    { key: "apiKey", label: "Management API Key", type: "password", required: true, helpText: "Found in AppLovin dashboard under Account > Keys" },
  ],
});

export default provider;
