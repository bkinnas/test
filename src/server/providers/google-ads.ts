import { BaseProvider } from "./base-provider.js";
import { registry } from "./provider-registry.js";
import type { BrexTransaction, ProviderConfig } from "../../shared/types.js";
import type { InvoiceFetchResult } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";

/**
 * Google Ads invoice provider.
 *
 * API method: Uses the Google Ads API to fetch billing invoices.
 * Requires OAuth2 credentials + developer token.
 *
 * Email method: Searches for emails from "payments-noreply@google.com".
 * Portal method: Navigates to ads.google.com billing page.
 */
class GoogleAdsProvider extends BaseProvider {
  readonly id = "google-ads";
  readonly name = "Google Ads";

  async fetchViaApi(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    const {
      clientId,
      clientSecret,
      refreshToken,
      developerToken,
      customerId,
    } = config.settings;

    if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
      return {
        success: false,
        errorMessage: "Missing Google Ads API credentials. Please configure all required settings.",
      };
    }

    try {
      // Step 1: Get an access token using the refresh token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenRes.ok) {
        return { success: false, errorMessage: `OAuth token refresh failed: ${tokenRes.status}` };
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };
      const accessToken = tokenData.access_token;

      // Step 2: Query billing invoices for the billing period
      const billingPeriod = this.billingPeriod(transaction.date);
      const [year, month] = billingPeriod.split("-");

      const query = `
        SELECT
          invoice.id,
          invoice.pdf_url,
          invoice.due_date,
          invoice.service_date_range.start_date,
          invoice.service_date_range.end_date
        FROM invoice
        WHERE invoice.service_date_range.start_date >= '${year}-${month}-01'
          AND invoice.service_date_range.end_date <= '${year}-${month}-31'
      `;

      const searchRes = await fetch(
        `https://googleads.googleapis.com/v17/customers/${customerId.replace(/-/g, "")}/googleAds:searchStream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": developerToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        return { success: false, errorMessage: `Google Ads API error: ${errText}` };
      }

      const searchData = (await searchRes.json()) as any[];
      if (!searchData?.length || !searchData[0]?.results?.length) {
        return { success: false, errorMessage: `No invoices found for period ${billingPeriod}` };
      }

      // Step 3: Download the PDF
      const invoice = searchData[0].results[0].invoice;
      const pdfUrl = invoice.pdf_url;

      if (pdfUrl) {
        const pdfRes = await fetch(pdfUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const fileName = this.invoiceFileName("google_ads", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "google-ads");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, pdfBuffer);

          return {
            success: true,
            filePath,
            fileName,
            mimeType: "application/pdf",
            invoiceNumber: invoice.id,
          };
        }
      }

      return { success: false, errorMessage: "Invoice found but PDF download failed" };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Google Ads API error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async fetchViaEmail(
    transaction: BrexTransaction,
    config: ProviderConfig
  ): Promise<InvoiceFetchResult> {
    // Delegate to the shared email fetcher
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
      "payments-noreply@google.com",
    ];
    const txDate = new Date(transaction.date);
    const dateFrom = new Date(txDate.getFullYear(), txDate.getMonth(), 1)
      .toISOString()
      .split("T")[0]!;
    const dateTo = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 5)
      .toISOString()
      .split("T")[0]!;

    try {
      const emails = await fetcher.searchInvoiceEmails({
        senderPatterns: senders,
        dateFrom,
        dateTo,
        subjectKeywords: ["invoice", "receipt", "billing"],
      });

      for (const email of emails) {
        if (email.attachments.length > 0) {
          const attachment = email.attachments[0]!;
          const fileName = this.invoiceFileName("google_ads", transaction.date);
          const outputDir = path.join(DATA_DIR, "invoices", "google-ads");
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, fileName);
          await fs.writeFile(filePath, attachment.content);

          return {
            success: true,
            filePath,
            fileName,
            mimeType: attachment.contentType,
          };
        }
      }

      return { success: false, errorMessage: "No invoice email found with attachments" };
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

    const downloadDir = path.join(DATA_DIR, "invoices", "google-ads");

    try {
      const invoices = await scraper.scrapeInvoices(
        {
          portalUrl: config.portalUrl || "https://ads.google.com/aw/billing/documents",
          credentials: config.settings,
          dateFrom: transaction.date,
          dateTo: transaction.date,
          downloadDir,
        },
        [
          { action: "goto", description: "Navigate to Google Ads login" },
          {
            action: "type",
            selector: 'input[type="email"]',
            value: "{{email}}",
            description: "Enter email",
          },
          { action: "click", selector: "#identifierNext", description: "Click next" },
          { action: "wait", value: "2000" },
          {
            action: "type",
            selector: 'input[type="password"]',
            value: "{{password}}",
            description: "Enter password",
          },
          { action: "click", selector: "#passwordNext", description: "Click sign in" },
          { action: "waitForNavigation", description: "Wait for billing page" },
          { action: "wait", value: "3000", description: "Wait for content to load" },
        ]
      );

      if (invoices.length > 0) {
        const inv = invoices[0]!;
        return {
          success: true,
          filePath: inv.filePath,
          fileName: inv.fileName,
          mimeType: inv.mimeType,
        };
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

// Register
const provider = new GoogleAdsProvider();
registry.register(provider, {
  id: "google-ads",
  name: "Google Ads",
  description: "Fetch invoices from Google Ads billing",
  icon: "google",
  supportedMethods: ["api", "email", "portal"],
  defaultVendorPatterns: ["google ads", "google advertising", "google *ads"],
  defaultEmailSenderPatterns: ["payments-noreply@google.com"],
  defaultPortalUrl: "https://ads.google.com/aw/billing/documents",
  requiredSettings: [
    { key: "clientId", label: "OAuth Client ID", type: "text", required: true, placeholder: "xxxx.apps.googleusercontent.com" },
    { key: "clientSecret", label: "OAuth Client Secret", type: "password", required: true },
    { key: "refreshToken", label: "Refresh Token", type: "password", required: true },
    { key: "developerToken", label: "Developer Token", type: "password", required: true },
    { key: "customerId", label: "Customer ID", type: "text", required: true, placeholder: "123-456-7890" },
  ],
});

export default provider;
