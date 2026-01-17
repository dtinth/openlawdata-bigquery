---
type: note
created: '2026-01-17T06:21:23.206Z'
---
PROJECT: openlawdata-bq - BigQuery partitioned tables for Thai legal documents

TECH STACK:
- Bun 1.3.5 (runtime, test runner, build tool)
- TypeScript with @tsconfig/bun for strict typing
- @google-cloud/bigquery 8.1.1 (BigQuery SDK)
- ofetch 1.5.1 (HTTP client for HuggingFace API)
- papaparse 5.5.3 (CSV parsing for state management)

KEY ARCHITECTURE DECISIONS:
1. Partitioned tables (2 base tables: ocr_iapp and meta) instead of 1,331+ individual tables
2. Monthly partitions using BigQuery's time-unit partitioning on publish_month DATE field
3. Partition decorator syntax: table_name$YYYYMM (e.g., ocr_iapp$202501)
4. State tracking via state_partitioned.csv (separate from main branch's state.csv)
5. Fresh start - no migration of existing data, new partitioned tables only

DATASET: sourceinth:openlawdata_soc_ratchakitcha
- Location: asia-southeast3 (Bangkok)
- Tables: ocr_iapp, meta
- Schema: content (JSON), filename (STRING), line_number (INT64), publish_month (DATE)
