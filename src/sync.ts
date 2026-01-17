import { fetchHFFileMetadata } from "./hf";
import type { FileMetadata } from "./hf";
import { loadState, saveState, filenameToTableName } from "./state";
import type { SyncedFile } from "./state";
import { truncateAndLoadTable, getOrCreateDataset } from "./bigquery";
import { $fetch } from "ofetch";
import { writeFileSync, createReadStream, createWriteStream, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createInterface } from "readline";

const DOWNLOAD_DIR = "downloads";

interface SyncTask {
  filename: string;
  tableName: string;
  fileMetadata: FileMetadata;
}

export async function findSyncTasks(): Promise<SyncTask[]> {
  console.log("Fetching file metadata from Hugging Face...");
  const hfFiles = await fetchHFFileMetadata();
  const state = loadState();

  const tasks: SyncTask[] = [];

  for (const file of hfFiles) {
    const tableName = filenameToTableName(file.filename);
    const stateEntry = state.get(file.filename);

    // Sync if: not in state OR commit hash changed
    if (!stateEntry || stateEntry.last_file_commit !== file.commitHash) {
      tasks.push({
        filename: file.filename,
        tableName,
        fileMetadata: file,
      });
    }
  }

  console.log(`Found ${tasks.length} files to sync`);
  return tasks;
}

async function downloadFile(
  filename: string,
  targetPath: string
): Promise<void> {
  const url = `https://huggingface.co/datasets/open-law-data-thailand/soc-ratchakitcha/resolve/main/${filename}`;
  console.log(`Downloading ${filename}...`);

  // Create directories if they don't exist
  mkdirSync(dirname(targetPath), { recursive: true });

  const data = await $fetch(url, {
    responseType: "arrayBuffer",
  });

  writeFileSync(targetPath, Buffer.from(data));
  console.log(`Downloaded to ${targetPath}`);
}

async function transformJsonlWithMetadata(
  inputPath: string,
  outputPath: string,
  filename: string
): Promise<number> {
  console.log(`Transforming ${inputPath}...`);

  const input = createReadStream(inputPath);
  const output = createWriteStream(outputPath);

  const rl = createInterface({
    input,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let processedLines = 0;

  return new Promise((resolve, reject) => {
    rl.on("line", (line) => {
      if (line.trim()) {
        try {
          lineNumber++;
          const jsonData = JSON.parse(line);
          const enrichedData = {
            content: jsonData,
            filename,
            line_number: lineNumber,
          };
          output.write(JSON.stringify(enrichedData) + "\n");
          processedLines++;
        } catch (e) {
          reject(new Error(`Failed to parse line ${lineNumber}: ${e}`));
        }
      }
    });

    rl.on("close", () => {
      output.end();
      resolve(processedLines);
    });

    rl.on("error", reject);
    output.on("error", reject);
  });
}

export async function syncFile(task: SyncTask): Promise<void> {
  const downloadPath = join(DOWNLOAD_DIR, task.filename);
  const transformedPath = join(DOWNLOAD_DIR, `${task.tableName}.transformed.jsonl`);

  // Ensure downloads directory exists
  mkdirSync(DOWNLOAD_DIR, { recursive: true });

  try {
    // Download file
    await downloadFile(task.filename, downloadPath);

    // Transform: add filename and line_number
    const rowCount = await transformJsonlWithMetadata(
      downloadPath,
      transformedPath,
      task.filename
    );

    // Ensure dataset exists
    await getOrCreateDataset();

    // Load to BigQuery using native JSONL loader
    await truncateAndLoadTable(task.tableName, transformedPath);

    // Update state
    const state = loadState();
    const syncedFile: SyncedFile = {
      filename: task.filename,
      table_name: task.tableName,
      last_file_commit: task.fileMetadata.commitHash,
      last_synced_at: new Date().toISOString(),
      row_count: rowCount,
    };

    state.set(task.filename, syncedFile);
    saveState(Array.from(state.values()));

    console.log(
      `Synced ${task.filename} -> ${task.tableName} (${rowCount} rows)`
    );
  } catch (error) {
    console.error(`Failed to sync ${task.filename}:`, error);
    throw error;
  }
}

export async function runSync(): Promise<void> {
  console.log("Starting sync...\n");

  const tasks = await findSyncTasks();

  if (tasks.length === 0) {
    console.log("No files need syncing.");
    return;
  }

  for (const task of tasks) {
    console.log(
      `\n[${tasks.indexOf(task) + 1}/${tasks.length}] Syncing ${task.filename}...`
    );
    await syncFile(task);
  }

  console.log("\nSync complete!");
}
