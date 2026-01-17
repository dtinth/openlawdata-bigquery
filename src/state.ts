import Papa from "papaparse";
import { readFileSync, writeFileSync } from "fs";
import { existsSync } from "fs";

export interface SyncedFile {
  filename: string;
  table_name: string;
  last_file_commit: string;
  last_synced_at: string;
  row_count: number;
}

const STATE_FILE = "state.csv";

export function loadState(): Map<string, SyncedFile> {
  const map = new Map<string, SyncedFile>();

  if (!existsSync(STATE_FILE)) {
    return map;
  }

  const content = readFileSync(STATE_FILE, "utf-8");
  const result = Papa.parse<SyncedFile>(content, {
    header: true,
    dynamicTyping: {
      row_count: true,
    },
  });

  if (result.data) {
    for (const row of result.data) {
      if (row.filename) {
        map.set(row.filename, row);
      }
    }
  }

  return map;
}

export function saveState(entries: SyncedFile[]): void {
  const csv = Papa.unparse(entries);
  writeFileSync(STATE_FILE, csv, "utf-8");
}

export interface PartitionInfo {
  baseTable: string;           // "ocr_iapp" or "meta"
  yearMonth: string;           // "2025-01"
  partitionDecorator: string | null;  // "$202501" or null for pre-1960 dates
  publishMonth: string;        // "2025-01-01"
}

export function parseFilenameForPartitioning(filename: string): PartitionInfo {
  // Extract YYYY-MM from filename
  const match = filename.match(/(\d{4})-(\d{2})\.jsonl$/);
  if (!match) {
    throw new Error(`Invalid filename format: ${filename}`);
  }

  const year = match[1]!;
  const month = match[2]!;
  const yearNum = parseInt(year, 10);

  // Determine base table from path
  let baseTable: string;
  if (filename.startsWith("ocr/iapp/")) {
    baseTable = "ocr_iapp";
  } else if (filename.startsWith("meta/")) {
    baseTable = "meta";
  } else {
    throw new Error(`Unknown file path prefix: ${filename}`);
  }

  // BigQuery partitions only support dates from 1960-01-01 to 2159-12-31
  // Pre-1960 dates go to __UNPARTITIONED__ automatically (no decorator needed)
  const partitionDecorator = yearNum < 1960 ? null : `$${year}${month}`;

  return {
    baseTable,
    yearMonth: `${year}-${month}`,
    partitionDecorator,
    publishMonth: `${year}-${month}-01`,
  };
}

export function filenameToTableName(filename: string): string {
  // ocr/iapp/2025/2025-01.jsonl -> ocr_iapp$202501
  // ocr/iapp/1885/1885-01.jsonl -> ocr_iapp (no decorator for pre-1960)
  const partitionInfo = parseFilenameForPartitioning(filename);
  return `${partitionInfo.baseTable}${partitionInfo.partitionDecorator ?? ""}`;
}
