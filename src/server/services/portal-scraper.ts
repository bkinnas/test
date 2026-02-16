import type { ScraperContext } from "../types/index.js";
import fs from "fs/promises";
import path from "path";

export interface PortalScraperParams {
  portalUrl: string;
  credentials: Record<string, string>;
  dateFrom: string;
  dateTo: string;
  downloadDir: string;
}

export interface ScrapedInvoice {
  fileName: string;
  filePath: string;
  mimeType: string;
}

/**
 * Generic portal scraper using Puppeteer.
 * Each provider can extend this with provider-specific navigation logic.
 */
export class PortalScraper {
  private context: ScraperContext;

  constructor(context: ScraperContext) {
    this.context = context;
  }

  /**
   * Launch a browser, navigate to the portal, and attempt to download invoices.
   * This is a base implementation — providers override with specific selectors.
   */
  async scrapeInvoices(
    params: PortalScraperParams,
    navigationSteps: NavigationStep[]
  ): Promise<ScrapedInvoice[]> {
    let puppeteer: typeof import("puppeteer-core");
    try {
      puppeteer = await import("puppeteer-core");
    } catch {
      throw new Error("puppeteer-core is not installed. Run: npm install puppeteer-core");
    }

    await fs.mkdir(params.downloadDir, { recursive: true });

    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome";
    const browser = await puppeteer.launch({
      headless: this.context.headless,
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      // Configure download behavior
      const cdp = await page.createCDPSession();
      await cdp.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: params.downloadDir,
      });

      // Execute navigation steps
      for (const step of navigationSteps) {
        await this.executeStep(page, step, params);
      }

      // Wait for any downloads to complete
      await new Promise((r) => setTimeout(r, 3000));

      // Scan download directory for new files
      const files = await fs.readdir(params.downloadDir);
      const results: ScrapedInvoice[] = [];

      for (const file of files) {
        const filePath = path.join(params.downloadDir, file);
        const ext = path.extname(file).toLowerCase();
        const mimeType =
          ext === ".pdf"
            ? "application/pdf"
            : ext === ".png"
              ? "image/png"
              : ext === ".jpg" || ext === ".jpeg"
                ? "image/jpeg"
                : "application/octet-stream";

        results.push({ fileName: file, filePath, mimeType });
      }

      return results;
    } finally {
      await browser.close();
    }
  }

  private async executeStep(
    page: any,
    step: NavigationStep,
    params: PortalScraperParams
  ): Promise<void> {
    switch (step.action) {
      case "goto":
        await page.goto(step.value ?? params.portalUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        break;

      case "type":
        if (step.selector && step.value) {
          await page.waitForSelector(step.selector, { timeout: 10000 });
          await page.type(step.selector, this.resolveValue(step.value, params));
        }
        break;

      case "click":
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout: 10000 });
          await page.click(step.selector);
        }
        break;

      case "wait":
        await new Promise((r) => setTimeout(r, Number(step.value) || 2000));
        break;

      case "waitForNavigation":
        await page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        break;

      case "waitForSelector":
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout: 15000 });
        }
        break;
    }
  }

  private resolveValue(
    value: string,
    params: PortalScraperParams
  ): string {
    // Replace credential placeholders like {{username}}, {{password}}
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return params.credentials[key] ?? "";
    });
  }
}

export interface NavigationStep {
  action:
    | "goto"
    | "type"
    | "click"
    | "wait"
    | "waitForNavigation"
    | "waitForSelector";
  selector?: string;
  value?: string;
  description?: string;
}
