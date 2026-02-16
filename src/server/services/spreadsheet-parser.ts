import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";
import type { BrexTransaction } from "../../shared/types.js";

/**
 * Column name mapping — Brex exports use varying column headers.
 * We normalize to our BrexTransaction shape.
 */
const COLUMN_MAP: Record<string, keyof BrexTransaction> = {
  // Common Brex CSV/XLSX column names
  date: "date",
  "posted date": "date",
  "transaction date": "date",
  description: "description",
  merchant: "vendor",
  "merchant name": "vendor",
  vendor: "vendor",
  name: "vendor",
  amount: "amount",
  "amount (usd)": "amount",
  total: "amount",
  currency: "currency",
  category: "category",
  "expense category": "category",
  "card last 4": "cardLast4",
  "card last four": "cardLast4",
  memo: "memo",
  note: "memo",
};

function normalizeColumnName(col: string): string {
  return col.trim().toLowerCase();
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return Math.abs(value);
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,()]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.abs(num);
  }
  return 0;
}

/**
 * Parse a Brex CSV or XLSX file buffer into BrexTransaction[].
 */
export function parseBrexSpreadsheet(
  buffer: Buffer,
  originalName: string
): BrexTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Spreadsheet has no sheets");

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("Could not read sheet");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error("Spreadsheet is empty");
  }

  // Map column headers
  const sampleRow = rows[0]!;
  const headerMapping: Record<string, keyof BrexTransaction> = {};

  for (const rawCol of Object.keys(sampleRow)) {
    const normalized = normalizeColumnName(rawCol);
    if (COLUMN_MAP[normalized]) {
      headerMapping[rawCol] = COLUMN_MAP[normalized];
    }
  }

  // Parse each row
  const transactions: BrexTransaction[] = [];

  for (const row of rows) {
    const rawRow: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      rawRow[k] = String(v);
    }

    const tx: Partial<BrexTransaction> = { id: uuid(), rawRow };

    for (const [rawCol, field] of Object.entries(headerMapping)) {
      const value = row[rawCol];

      switch (field) {
        case "amount":
          tx.amount = parseAmount(value);
          break;
        case "date":
          tx.date =
            value instanceof Date
              ? value.toISOString().split("T")[0]
              : String(value);
          break;
        default:
          (tx as Record<string, unknown>)[field] = String(value ?? "");
      }
    }

    // Ensure required fields have defaults
    tx.vendor = tx.vendor || tx.description || "Unknown";
    tx.description = tx.description || tx.vendor || "";
    tx.date = tx.date || new Date().toISOString().split("T")[0]!;
    tx.amount = tx.amount ?? 0;
    tx.currency = tx.currency || "USD";
    tx.category = tx.category || "";

    transactions.push(tx as BrexTransaction);
  }

  console.log(
    `[parser] Parsed ${transactions.length} transactions from "${originalName}"`
  );
  return transactions;
}
