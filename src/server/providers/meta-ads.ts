import { BaseProvider } from "./base-provider.js";
import { registry } from "./provider-registry.js";
import type { BrexTransaction, ProviderConfig } from "../../shared/types.js";
import type { InvoiceFetchResult } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

/**
 * Meta (Facebook) Ads invoice provider.
 *
 * API method: Uses the Meta Marketing API to fetch billing invoices.
 * Email method: Searches for emails from Meta billing.
 * Portal method: Navigates to business.facebook.com billing.
 */
class MetaAdsProvider extends BaseProvider {
  readonly id = "meta-ads";
  readonly name = "Meta Ads";

  async fetchViaApi(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const { accessToken, adAccountId } = config.settings;

    if (!accessToken || !adAccountId) {
      return {
        success: false,
        errorMessage: "Missing Meta Ads API credentials. Configure access token and ad account ID.",
      };
    }

    try {
      const billingPeriod = this.billingPeriod(transaction.date);
      const [year, month] = billingPeriod.split("-").map(Number);

      // Query the invoices endpoint
      const timeMin = Math.floor(new Date(year!, month! - 1, 1).getTime() / 1000);
      const timeMax = Math.floor(new Date(year!, month!, 0, 23, 59, 59).getTime() / 1000);

      const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${accountId}/invoices?` +
          new URLSearchParams({
            access_token: accessToken,
            fields: "id,amount,currency,invoice_date,payment_term,download_uri",
            time_range: JSON.stringify({ since: timeMin, until: timeMax }),
          })
      );

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, errorMessage: `Meta API error: ${errText}` };
      }

      const data = (await res.json()) as { data: any[] };

      if (!data.data?.length) {
        return { success: false, errorMessage: `No Meta invoices for period ${billingPeriod}` };
      }

      // Download the first matching invoice
      const inv = data.data[0];
      if (inv.download_uri) {
        const pdfRes = await fetch(inv.download_uri);
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const fileName = this.invoiceFileName("meta_ads", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "meta-ads");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, pdfBuffer);

          return {
            success: true,
            filePath,
            fileName,
            mimeType: "application/pdf",
            invoiceNumber: inv.id,
          };
        }
      }

      return { success: false, errorMessage: "Invoice found but PDF download failed" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Meta API error: ${err instanceof Error ? err.message : String(err)}`,
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
      "noreply@facebookmail.com",
      "invoice@facebookmail.com",
    ];

    const txDate = new Date(transaction.date);
    const dateFrom = new Date(txDate.getFullYear(), txDate.getMonth(), 1).toISOString().split("T")[0]!;
    const dateTo = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 5).toISOString().split("T")[0]!;

    try {
      const emails = await fetcher.searchInvoiceEmails({
        senderPatterns: senders,
        dateFrom,
        dateTo,
        subjectKeywords: ["invoice", "receipt", "payment"],
      });

      for (const email of emails) {
        if (email.attachments.length > 0) {
          const attachment = email.attachments[0]!;
          const fileName = this.invoiceFileName("meta_ads", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "meta-ads");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, attachment.content);

          return { success: true, filePath, fileName, mimeType: attachment.contentType };
        }
      }

      return { success: false, errorMessage: "No Meta invoice emails with attachments found" };
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
      "noreply@facebookmail.com",
      "invoice@facebookmail.com",
    ];
    const txDate = new Date(transaction.date);
    const dateFrom = new Date(txDate.getFullYear(), txDate.getMonth(), 1)
      .toISOString()
      .split("T")[0]!;
    const dateTo = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 5)
      .toISOString()
      .split("T")[0]!;

    const outputDir = path.join(DATA_DIR, "invoices", "meta-ads");
    await fs.mkdir(outputDir, { recursive: true });

    try {
      const emails = await fetcher.searchInvoiceEmails(
        {
          senderPatterns: senders,
          dateFrom,
          dateTo,
          subjectKeywords: ["invoice", "receipt", "payment"],
          folderPath: process.env.OUTLOOK_FOLDER_PATH || "Inbox",
        },
        outputDir
      );

      for (const email of emails) {
        if (email.attachments.length > 0) {
          const att = email.attachments[0]!;
          return {
            success: true,
            filePath: att.filePath,
            fileName: att.filename,
            mimeType: att.contentType,
          };
        }
      }

      return { success: false, errorMessage: "No Meta invoice found in Outlook" };
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

    const downloadDir = path.join(DATA_DIR, "invoices", "meta-ads");

    try {
      const invoices = await scraper.scrapeInvoices(
        {
          portalUrl: config.portalUrl || "https://business.facebook.com/billing_hub/payment_activity",
          credentials: config.settings,
          dateFrom: transaction.date,
          dateTo: transaction.date,
          downloadDir,
        },
        [
          { action: "goto", description: "Navigate to Meta Business billing" },
          { action: "type", selector: "#email", value: "{{email}}", description: "Enter email" },
          { action: "type", selector: "#pass", value: "{{password}}", description: "Enter password" },
          { action: "click", selector: "#loginbutton", description: "Click login" },
          { action: "waitForNavigation", description: "Wait for billing page" },
          { action: "wait", value: "3000", description: "Wait for invoices to load" },
        ]
      );

      if (invoices.length > 0) {
        const inv = invoices[0]!;
        return { success: true, filePath: inv.filePath, fileName: inv.fileName, mimeType: inv.mimeType };
      }

      return { success: false, errorMessage: "No invoices found via portal" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Portal scraping error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

const provider = new MetaAdsProvider();
registry.register(provider, {
  id: "meta-ads",
  name: "Meta Ads",
  description: "Fetch invoices from Meta (Facebook) Ads billing",
  icon: "meta",
  supportedMethods: ["api", "email", "outlook", "portal"],
  defaultVendorPatterns: ["facebook", "meta ads", "meta platforms", "fb ads", "instagram ads"],
  defaultEmailSenderPatterns: ["noreply@facebookmail.com", "invoice@facebookmail.com"],
  defaultPortalUrl: "https://business.facebook.com/billing_hub/payment_activity",
  requiredSettings: [
    { key: "accessToken", label: "Access Token", type: "password", required: true, helpText: "Long-lived access token with ads_read permission" },
    { key: "adAccountId", label: "Ad Account ID", type: "text", required: true, placeholder: "act_1234567890" },
  ],
});

export default provider;
