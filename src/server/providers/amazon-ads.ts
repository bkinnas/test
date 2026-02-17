import { BaseProvider } from "./base-provider.js";
import { registry } from "./provider-registry.js";
import type { BrexTransaction, ProviderConfig } from "../../shared/types.js";
import type { InvoiceFetchResult } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

/**
 * Amazon Ads invoice provider.
 *
 * API method: Uses the Amazon Advertising API to fetch billing data.
 * Email method: Searches for invoice emails from Amazon.
 * Portal method: Navigates to advertising.amazon.com billing.
 */
class AmazonAdsProvider extends BaseProvider {
  readonly id = "amazon-ads";
  readonly name = "Amazon Ads";

  private async getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
    const res = await fetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      throw new Error(`Amazon OAuth failed: ${res.status}`);
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async fetchViaApi(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const { clientId, clientSecret, refreshToken, profileId } = config.settings;

    if (!clientId || !clientSecret || !refreshToken) {
      return {
        success: false,
        errorMessage: "Missing Amazon Ads API credentials.",
      };
    }

    try {
      const accessToken = await this.getAccessToken(clientId, clientSecret, refreshToken);
      const billingPeriod = this.billingPeriod(transaction.date);
      const [year, month] = billingPeriod.split("-").map(Number);

      const startDate = `${year}${String(month).padStart(2, "0")}01`;
      const endDate = `${year}${String(month).padStart(2, "0")}${new Date(year!, month!, 0).getDate()}`;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        "Amazon-Advertising-API-ClientId": clientId,
        "Content-Type": "application/json",
      };
      if (profileId) {
        headers["Amazon-Advertising-API-Scope"] = profileId;
      }

      // Request billing invoices
      const res = await fetch(
        `https://advertising-api.amazon.com/v2/invoices?startDate=${startDate}&endDate=${endDate}`,
        { headers }
      );

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, errorMessage: `Amazon Ads API error: ${errText}` };
      }

      const data = (await res.json()) as any[];

      if (!data?.length) {
        return { success: false, errorMessage: `No Amazon Ads invoices for period ${billingPeriod}` };
      }

      const inv = data[0];
      if (inv.invoiceUrl || inv.downloadUrl) {
        const pdfRes = await fetch(inv.invoiceUrl || inv.downloadUrl, { headers });
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const fileName = this.invoiceFileName("amazon_ads", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "amazon-ads");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, pdfBuffer);

          return {
            success: true,
            filePath,
            fileName,
            mimeType: "application/pdf",
            invoiceNumber: inv.invoiceId || inv.id,
          };
        }
      }

      return { success: false, errorMessage: "Amazon Ads invoice found but download failed" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Amazon Ads API error: ${err instanceof Error ? err.message : String(err)}`,
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
      "advertising-invoice@amazon.com",
      "no-reply@advertising.amazon.com",
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
          const fileName = this.invoiceFileName("amazon_ads", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "amazon-ads");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, attachment.content);

          return { success: true, filePath, fileName, mimeType: attachment.contentType };
        }
      }

      return { success: false, errorMessage: "No Amazon Ads invoice emails found" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Email fetch error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async fetchViaOutlook(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const { OutlookFetcher } = await import("../services/outlook-fetcher.js");
    const fetcher = new OutlookFetcher();

    const senders = config.emailSenderPatterns || [
      "advertising-invoice@amazon.com",
      "no-reply@advertising.amazon.com",
    ];
    const txDate = new Date(transaction.date);
    const dateFrom = new Date(txDate.getFullYear(), txDate.getMonth(), 1).toISOString().split("T")[0]!;
    const dateTo = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 5).toISOString().split("T")[0]!;

    const outputDir = path.join(DATA_DIR, "invoices", "amazon-ads");
    await fs.mkdir(outputDir, { recursive: true });

    try {
      const emails = await fetcher.searchInvoiceEmails(
        { senderPatterns: senders, dateFrom, dateTo, folderPath: process.env.OUTLOOK_FOLDER_PATH || "Inbox" },
        outputDir
      );

      for (const email of emails) {
        if (email.attachments.length > 0) {
          const att = email.attachments[0]!;
          return { success: true, filePath: att.filePath, fileName: att.filename, mimeType: att.contentType };
        }
      }

      return { success: false, errorMessage: "No Amazon Ads invoice found in Outlook" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Outlook fetch error: ${err instanceof Error ? err.message : String(err)}`,
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

    const downloadDir = path.join(DATA_DIR, "invoices", "amazon-ads");

    try {
      const invoices = await scraper.scrapeInvoices(
        {
          portalUrl: config.portalUrl || "https://advertising.amazon.com/billing",
          credentials: config.settings,
          dateFrom: transaction.date,
          dateTo: transaction.date,
          downloadDir,
        },
        [
          { action: "goto", description: "Navigate to Amazon Ads billing" },
          { action: "type", selector: "#ap_email", value: "{{email}}", description: "Enter email" },
          { action: "click", selector: "#continue", description: "Click continue" },
          { action: "wait", value: "2000" },
          { action: "type", selector: "#ap_password", value: "{{password}}", description: "Enter password" },
          { action: "click", selector: "#signInSubmit", description: "Sign in" },
          { action: "waitForNavigation", description: "Wait for billing" },
          { action: "wait", value: "3000" },
        ]
      );

      if (invoices.length > 0) {
        const inv = invoices[0]!;
        return { success: true, filePath: inv.filePath, fileName: inv.fileName, mimeType: inv.mimeType };
      }

      return { success: false, errorMessage: "No invoices found via Amazon portal" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Portal scraping error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

const provider = new AmazonAdsProvider();
registry.register(provider, {
  id: "amazon-ads",
  name: "Amazon Ads",
  description: "Fetch invoices from Amazon Advertising",
  icon: "amazon",
  supportedMethods: ["api", "email", "outlook", "portal"],
  defaultVendorPatterns: ["amazon ads", "amazon advertising", "amazon.com advertising", "amazon *advertising"],
  defaultEmailSenderPatterns: ["advertising-invoice@amazon.com", "no-reply@advertising.amazon.com"],
  defaultPortalUrl: "https://advertising.amazon.com/billing",
  requiredSettings: [
    { key: "clientId", label: "API Client ID", type: "text", required: true },
    { key: "clientSecret", label: "API Client Secret", type: "password", required: true },
    { key: "refreshToken", label: "Refresh Token", type: "password", required: true },
    { key: "profileId", label: "Profile ID", type: "text", required: false, helpText: "Amazon Advertising profile ID (optional)" },
  ],
});

export default provider;
