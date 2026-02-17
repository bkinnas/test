import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface OutlookSearchParams {
  senderPatterns: string[];
  dateFrom: string;
  dateTo: string;
  subjectKeywords?: string[];
  folderPath?: string;
}

export interface OutlookAttachment {
  filename: string;
  filePath: string;
  contentType: string;
}

export interface OutlookEmailResult {
  subject: string;
  from: string;
  senderName: string;
  date: string;
  attachments: OutlookAttachment[];
}

interface OutlookScriptResult {
  success: boolean;
  count?: number;
  emails?: OutlookEmailResult[];
  error?: string;
}

/**
 * Outlook invoice fetcher — searches the local Outlook desktop client
 * for invoice emails using PowerShell COM automation.
 *
 * This requires:
 * - Windows OS with PowerShell
 * - Microsoft Outlook desktop installed and configured with a mail profile
 *
 * How it works:
 * 1. Spawns a PowerShell process that loads Outlook via COM (Outlook.Application)
 * 2. Searches the specified folder (default: Inbox) by sender and date range
 * 3. Extracts PDF/image attachments and saves them to the output directory
 * 4. Returns results as structured JSON
 */
export class OutlookFetcher {
  private scriptPath: string;

  constructor() {
    this.scriptPath = path.resolve(
      __dirname,
      "../../../scripts/search-outlook.ps1"
    );
  }

  /**
   * Search the local Outlook mailbox for invoice emails.
   */
  async searchInvoiceEmails(
    params: OutlookSearchParams,
    outputDir: string
  ): Promise<OutlookEmailResult[]> {
    // Detect platform — Outlook COM only works on Windows
    if (process.platform !== "win32") {
      throw new Error(
        "Outlook desktop integration requires Windows. " +
          "On other platforms, use the IMAP email method instead."
      );
    }

    const scriptParams = {
      senderPatterns: params.senderPatterns,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      subjectKeywords: params.subjectKeywords || [],
      outputDir,
      folderPath: params.folderPath || "Inbox",
    };

    const result = await this.runPowerShell(scriptParams);

    if (!result.success) {
      throw new Error(result.error || "Outlook search failed");
    }

    return result.emails || [];
  }

  /**
   * Spawn PowerShell and run the search-outlook.ps1 script.
   */
  private runPowerShell(params: Record<string, unknown>): Promise<OutlookScriptResult> {
    return new Promise((resolve, reject) => {
      const paramsJson = JSON.stringify(params);

      const ps = spawn("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        this.scriptPath,
        "-ParamsJson",
        paramsJson,
      ]);

      let stdout = "";
      let stderr = "";

      ps.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      ps.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      ps.on("close", (code) => {
        if (code !== 0 && !stdout.trim()) {
          reject(
            new Error(
              `PowerShell exited with code ${code}: ${stderr || "Unknown error"}`
            )
          );
          return;
        }

        try {
          const result: OutlookScriptResult = JSON.parse(stdout.trim());
          resolve(result);
        } catch {
          reject(
            new Error(
              `Failed to parse Outlook search results: ${stdout.slice(0, 200)}`
            )
          );
        }
      });

      ps.on("error", (err) => {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          reject(
            new Error(
              "PowerShell not found. Outlook integration requires Windows with PowerShell."
            )
          );
        } else {
          reject(err);
        }
      });
    });
  }
}
