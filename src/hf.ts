import { $fetch } from "ofetch";

interface HFTreeItem {
  type: "file" | "directory";
  oid: string;
  size: number;
  path: string;
}

export interface FileMetadata {
  filename: string;
  size: number;
  commitHash: string;
}

const DATASET_NAME = "open-law-data-thailand/soc-ratchakitcha";

async function fetchFilesInYearDirectories(
  basePath: string
): Promise<FileMetadata[]> {
  const files: FileMetadata[] = [];

  // First, get non-recursive listing to find year directories
  const indexUrl = `https://huggingface.co/api/datasets/${DATASET_NAME}/tree/main/${basePath}`;
  const indexParams = {
    repo_type: "dataset",
    recursive: "false",
  };

  console.log(`Fetching year directories from ${basePath}/...`);
  const yearDirs = await $fetch<HFTreeItem[]>(indexUrl, {
    query: indexParams,
  });

  // Find all year directories
  const years = yearDirs
    .filter((item) => item.type === "directory")
    .map((item) => item.path.split("/").pop())
    .filter((year) => year && /^\d{4}$/.test(year));

  console.log(`Found ${years.length} year directories in ${basePath}/`);

  // Now recursively fetch files from each year directory
  for (const year of years) {
    const yearPath = `${basePath}/${year}`;
    const yearUrl = `https://huggingface.co/api/datasets/${DATASET_NAME}/tree/main/${yearPath}`;
    const yearParams = {
      repo_type: "dataset",
      recursive: "true",
    };

    console.log(`Fetching files from ${yearPath}/...`);
    const yearResponse = await $fetch<HFTreeItem[]>(yearUrl, {
      query: yearParams,
    });

    // Filter for JSONL files
    for (const item of yearResponse) {
      if (item.type === "file" && item.path.endsWith(".jsonl")) {
        files.push({
          filename: item.path,
          size: item.size,
          commitHash: item.oid,
        });
      }
    }
  }

  return files;
}

export async function fetchHFFileMetadata(): Promise<FileMetadata[]> {
  const files: FileMetadata[] = [];

  // Fetch meta/ files (years are directly under meta/)
  const metaFiles = await fetchFilesInYearDirectories("meta");
  files.push(...metaFiles);

  // Fetch ocr/ files (years are under ocr/iapp/, not directly under ocr/)
  const ocrFiles = await fetchFilesInYearDirectories("ocr/iapp");
  files.push(...ocrFiles);

  console.log(`Found ${files.length} JSONL files total`);
  return files;
}
