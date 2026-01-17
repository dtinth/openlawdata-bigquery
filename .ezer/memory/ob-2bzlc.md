---
type: note
created: '2026-01-17T06:21:32.004Z'
---
FILE STRUCTURE & SYNC FLOW:

src/hf.ts - Hugging Face API integration
  - fetchFilesInYearDirectories(basePath): Fetches files year-by-year to avoid API limits
  - fetchHFFileMetadata(): Returns meta/ and ocr/iapp/ files with commit hashes
  - Non-recursive listing first to find years, then recursive per year

src/state.ts - State management
  - STATE_FILE = 'state.csv'
  - SyncedFile interface: filename, table_name (includes decorator), last_file_commit, last_synced_at, row_count
  - parseFilenameForPartitioning(): Extracts partition info from filenames
    * Returns: baseTable (ocr_iapp|meta), partitionDecorator ($YYYYMM), publishMonth (YYYY-MM-01)
  - filenameToTableName(): Returns 'ocr_iapp$202501' format (not 'ocr_iapp_2025_01')

src/bigquery.ts - BigQuery operations
  - PARTITIONED_SCHEMA: Includes publish_month DATE field
  - getOrCreatePartitionedTable(baseTableName): Creates table with MONTH time partitioning
  - loadToPartition(baseTableName, partitionDecorator, jsonlFilePath): Loads via decorator syntax
  - WRITE_TRUNCATE only affects specified partition, not entire table

src/sync.ts - Orchestration
  - transformJsonlWithMetadata(): Adds content, filename, line_number, publish_month to each line
  - syncFile(): Downloads → Transforms → Creates table → Loads partition → Updates state
  - Partition info parsed from filename during sync

SYNC FLOW:
1. Query HF API for meta/ and ocr/iapp/ files by year
2. Check state.csv to find files needing sync
3. For each file: download → transform → create base table (idempotent) → load to partition
4. Update state with commit hash and row count
5. State tracks which partitions have been synced
