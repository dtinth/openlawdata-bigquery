import { BigQuery, Table, Job } from "@google-cloud/bigquery";
import type { JobLoadMetadata } from "@google-cloud/bigquery";

const PROJECT_ID = "sourceinth";
const DATASET_ID = "openlawdata_soc_ratchakitcha";

const bq = new BigQuery({
  projectId: PROJECT_ID,
  location: "asia-southeast3",
});

interface TableSchema {
  fields: Array<{
    name: string;
    type: string;
    mode?: string;
  }>;
}

const SCHEMA: TableSchema = {
  fields: [
    { name: "content", type: "JSON", mode: "REQUIRED" },
    { name: "filename", type: "STRING", mode: "REQUIRED" },
    { name: "line_number", type: "INT64", mode: "REQUIRED" },
  ],
};

const PARTITIONED_SCHEMA: TableSchema = {
  fields: [
    { name: "content", type: "JSON", mode: "REQUIRED" },
    { name: "filename", type: "STRING", mode: "REQUIRED" },
    { name: "line_number", type: "INT64", mode: "REQUIRED" },
    { name: "publish_month", type: "DATE", mode: "REQUIRED" },
  ],
};

export async function getOrCreateDataset() {
  const dataset = bq.dataset(DATASET_ID);
  const [exists] = await dataset.exists();

  if (!exists) {
    console.log(`Creating dataset ${DATASET_ID}...`);
    await bq.createDataset(DATASET_ID, {
      location: "asia-southeast3",
      description: "Open Law Data Thailand - Royal Gazette (Ratchakitcha)",
    });
  }

  return dataset;
}

export async function getOrCreateTable(tableName: string): Promise<Table> {
  const dataset = bq.dataset(DATASET_ID);
  const table = dataset.table(tableName);
  const [exists] = await table.exists();

  if (!exists) {
    console.log(`Creating table ${tableName}...`);
    await dataset.createTable(tableName, { schema: SCHEMA });
  }

  return table;
}

export async function truncateAndLoadTable(
  tableName: string,
  jsonlFilePath: string
): Promise<number> {
  const dataset = bq.dataset(DATASET_ID);
  const table = dataset.table(tableName);

  // Ensure table exists
  await getOrCreateTable(tableName);

  console.log(`Loading ${jsonlFilePath} into ${tableName}...`);

  const metadata: JobLoadMetadata = {
    sourceFormat: "NEWLINE_DELIMITED_JSON",
    schema: SCHEMA,
    writeDisposition: "WRITE_TRUNCATE",
  };

  const [jobMetadata] = await table.load(jsonlFilePath, metadata);

  // Get the actual Job instance to wait for completion
  const jobId = jobMetadata.jobReference?.jobId;
  if (!jobId) {
    throw new Error("No job ID returned from load operation");
  }

  const job = bq.job(jobId);

  // Wait for job to complete
  await new Promise<void>((resolve, reject) => {
    job.on("complete", () => resolve());
    job.on("error", reject);
  });

  // Get row count from table metadata
  const [tableMetadata] = await table.getMetadata();
  const rowCount = parseInt(tableMetadata.numRows || "0", 10);

  console.log(`Loaded ${rowCount} rows into ${tableName}`);
  return rowCount;
}

export async function getOrCreatePartitionedTable(
  baseTableName: string
): Promise<Table> {
  const dataset = bq.dataset(DATASET_ID);
  const table = dataset.table(baseTableName);
  const [exists] = await table.exists();

  if (!exists) {
    console.log(`Creating partitioned table ${baseTableName}...`);
    await dataset.createTable(baseTableName, {
      schema: PARTITIONED_SCHEMA,
      timePartitioning: {
        type: "MONTH",
        field: "publish_month",
        requirePartitionFilter: false,
      },
    });
  }

  return table;
}

export async function loadToPartition(
  baseTableName: string,
  partitionDecorator: string,
  jsonlFilePath: string
): Promise<number> {
  const dataset = bq.dataset(DATASET_ID);

  // Use decorator syntax: ocr_iapp$202501
  const partitionedTableName = `${baseTableName}${partitionDecorator}`;
  const table = dataset.table(partitionedTableName);

  console.log(`Loading ${jsonlFilePath} into ${partitionedTableName}...`);

  const metadata: JobLoadMetadata = {
    sourceFormat: "NEWLINE_DELIMITED_JSON",
    schema: PARTITIONED_SCHEMA,
    writeDisposition: "WRITE_TRUNCATE",
  };

  const [jobMetadata] = await table.load(jsonlFilePath, metadata);

  // Get the actual Job instance to wait for completion
  const jobId = jobMetadata.jobReference?.jobId;
  if (!jobId) {
    throw new Error("No job ID returned from load operation");
  }

  const job = bq.job(jobId);

  // Wait for job to complete
  await new Promise<void>((resolve, reject) => {
    job.on("complete", () => resolve());
    job.on("error", reject);
  });

  // Get row count from partition metadata
  const [tableMetadata] = await table.getMetadata();
  const rowCount = parseInt(tableMetadata.numRows || "0", 10);

  console.log(`Loaded ${rowCount} rows into ${partitionedTableName}`);
  return rowCount;
}
