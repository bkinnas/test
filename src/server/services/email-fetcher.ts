import type { EmailConfig } from "../types/index.js";

export interface EmailSearchParams {
  senderPatterns: string[];
  dateFrom: string;
  dateTo: string;
  subjectKeywords?: string[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface EmailResult {
  subject: string;
  from: string;
  date: string;
  attachments: EmailAttachment[];
  htmlBody?: string;
}

/**
 * Email invoice fetcher — connects to an IMAP inbox and searches for
 * invoice emails from a given sender within a date range.
 */
export class EmailFetcher {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Search the inbox for emails matching the given criteria
   * and return any PDF/image attachments (likely invoices).
   */
  async searchInvoiceEmails(
    params: EmailSearchParams
  ): Promise<EmailResult[]> {
    // Dynamic import to avoid crashes when imap-simple isn't configured
    let imapSimple: typeof import("imap-simple");
    try {
      imapSimple = await import("imap-simple");
    } catch {
      throw new Error(
        "imap-simple is not installed. Run: npm install imap-simple"
      );
    }

    const connection = await imapSimple.connect({
      imap: {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        tls: this.config.tls,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    });

    try {
      await connection.openBox("INBOX");

      // Build IMAP search criteria
      const searchCriteria: unknown[] = [
        ["SINCE", params.dateFrom],
        ["BEFORE", params.dateTo],
      ];

      // Search for each sender pattern
      const results: EmailResult[] = [];

      for (const sender of params.senderPatterns) {
        const criteria = [["FROM", sender], ...searchCriteria];

        const messages = await connection.search(criteria as string[][], {
          bodies: ["HEADER", "TEXT", ""],
          struct: true,
        });

        for (const msg of messages) {
          const header = msg.parts.find(
            (p: { which: string }) => p.which === "HEADER"
          );
          const subject = header?.body?.subject?.[0] ?? "";
          const from = header?.body?.from?.[0] ?? "";
          const date = header?.body?.date?.[0] ?? "";

          // Extract attachments
          const attachments: EmailAttachment[] = [];
          const struct = msg.attributes.struct;

          if (struct) {
            const parts = flattenStruct(struct);
            for (const part of parts) {
              if (
                part.disposition?.type?.toLowerCase() === "attachment" ||
                part.type === "application/pdf" ||
                part.subtype === "pdf"
              ) {
                try {
                  const partData = await connection.getPartData(msg, part);
                  if (partData) {
                    attachments.push({
                      filename:
                        part.disposition?.params?.filename ??
                        `attachment.${part.subtype ?? "bin"}`,
                      content: Buffer.isBuffer(partData)
                        ? partData
                        : Buffer.from(String(partData)),
                      contentType: `${part.type}/${part.subtype}`,
                    });
                  }
                } catch {
                  // Skip parts that can't be decoded
                }
              }
            }
          }

          results.push({ subject, from, date, attachments });
        }
      }

      return results;
    } finally {
      connection.end();
    }
  }
}

/** Recursively flatten IMAP message structure to find all parts */
function flattenStruct(struct: unknown[]): any[] {
  const parts: any[] = [];
  for (const item of struct) {
    if (Array.isArray(item)) {
      parts.push(...flattenStruct(item));
    } else if (item && typeof item === "object") {
      parts.push(item);
    }
  }
  return parts;
}
