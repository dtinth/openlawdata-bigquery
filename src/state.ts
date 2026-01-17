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

export function filenameToTableName(filename: string): string {
  // ocr/iapp/2025/2025-01.jsonl -> ocr_iapp_2025_01
  let name = filename
    .replace(/\.jsonl$/, "") // remove ".jsonl"
    .replace(/\//g, "_"); // replace "/" with "_"

  // Remove redundant year prefix: ocr_iapp_2025_2025-01 -> ocr_iapp_2025_01
  name = name.replace(/_(\d{4})_\1-/, "_$1_");

  return name;
}
