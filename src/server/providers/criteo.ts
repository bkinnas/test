import { BaseProvider } from "./base-provider.js";
import { registry } from "./provider-registry.js";
import type { BrexTransaction, ProviderConfig } from "../../shared/types.js";
import type { InvoiceFetchResult } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

/**
 * Criteo invoice provider.
 *
 * API method: Uses the Criteo API with OAuth2 client credentials.
 * Email method: Searches for emails from Criteo billing.
 * Portal method: Navigates to the Criteo management center.
 */
class CriteoProvider extends BaseProvider {
  readonly id = "criteo";
  readonly name = "Criteo";

  private async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    const res = await fetch("https://api.criteo.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!res.ok) {
      throw new Error(`Criteo OAuth failed: ${res.status}`);
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async fetchViaApi(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const { clientId, clientSecret } = config.settings;

    if (!clientId || !clientSecret) {
      return {
        success: false,
        errorMessage: "Missing Criteo API credentials. Configure client ID and secret.",
      };
    }

    try {
      const accessToken = await this.getAccessToken(clientId, clientSecret);
      const billingPeriod = this.billingPeriod(transaction.date);

      // Criteo Advertiser Billing API
      const res = await fetch(
        `https://api.criteo.com/2024-07/advertiser-invoices?` +
          new URLSearchParams({ billingPeriod }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, errorMessage: `Criteo API error: ${errText}` };
      }

      const data = (await res.json()) as { data: any[] };

      if (!data.data?.length) {
        return { success: false, errorMessage: `No Criteo invoices for period ${billingPeriod}` };
      }

      const inv = data.data[0];
      const invoiceId = inv.id;

      // Download PDF
      const pdfRes = await fetch(
        `https://api.criteo.com/2024-07/advertiser-invoices/${invoiceId}/pdf`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (pdfRes.ok) {
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        const fileName = this.invoiceFileName("criteo", transaction.date);
        const outputDir = path.join(DATA_DIR, "invoices", "criteo");
        await fs.mkdir(outputDir, { recursive: true });
        const filePath = path.join(outputDir, fileName);
        await fs.writeFile(filePath, pdfBuffer);

        return {
          success: true,
          filePath,
          fileName,
          mimeType: "application/pdf",
          invoiceNumber: invoiceId,
        };
      }

      return { success: false, errorMessage: "Criteo invoice found but PDF download failed" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Criteo API error: ${err instanceof Error ? err.message : String(err)}`,
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
    const senders = config.emailSenderPatterns || ["noreply@criteo.com", "billing@criteo.com"];

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
          const fileName = this.invoiceFileName("criteo", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "criteo");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, attachment.content);

          return { success: true, filePath, fileName, mimeType: attachment.contentType };
        }
      }

      return { success: false, errorMessage: "No Criteo invoice emails with attachments found" };
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

    const downloadDir = path.join(DATA_DIR, "invoices", "criteo");

    try {
      const invoices = await scraper.scrapeInvoices(
        {
          portalUrl: config.portalUrl || "https://marketing.criteo.com",
          credentials: config.settings,
          dateFrom: transaction.date,
          dateTo: transaction.date,
          downloadDir,
        },
        [
          { action: "goto", description: "Navigate to Criteo Management Center" },
          { action: "type", selector: "#email", value: "{{email}}", description: "Enter email" },
          { action: "click", selector: "button[type='submit']", description: "Submit email" },
          { action: "wait", value: "2000" },
          { action: "type", selector: "#password", value: "{{password}}", description: "Enter password" },
          { action: "click", selector: "button[type='submit']", description: "Sign in" },
          { action: "waitForNavigation", description: "Wait for dashboard" },
          { action: "wait", value: "3000" },
        ]
      );

      if (invoices.length > 0) {
        const inv = invoices[0]!;
        return { success: true, filePath: inv.filePath, fileName: inv.fileName, mimeType: inv.mimeType };
      }

      return { success: false, errorMessage: "No invoices found via Criteo portal" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Portal scraping error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

const provider = new CriteoProvider();
registry.register(provider, {
  id: "criteo",
  name: "Criteo",
  description: "Fetch invoices from Criteo advertising platform",
  icon: "criteo",
  supportedMethods: ["api", "email", "portal"],
  defaultVendorPatterns: ["criteo", "criteo sa"],
  defaultEmailSenderPatterns: ["noreply@criteo.com", "billing@criteo.com"],
  defaultPortalUrl: "https://marketing.criteo.com",
  requiredSettings: [
    { key: "clientId", label: "API Client ID", type: "text", required: true },
    { key: "clientSecret", label: "API Client Secret", type: "password", required: true },
  ],
});

export default provider;
