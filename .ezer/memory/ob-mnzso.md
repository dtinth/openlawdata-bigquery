---
type: note
created: '2026-01-17T06:21:40.930Z'
---
KEY LEARNINGS & GOTCHAS:

NO 'as any':
- BigQuery SDK types are complex; use proper interfaces instead
- EnrichedData interface with publish_month: string (never optional for partitioned data)
- JobLoadMetadata requires proper typing, no type escapes

BIGQUERY PARTITION DECORATORS:
- Use table_name$YYYYMM syntax to write to specific partition
- WRITE_TRUNCATE only truncates that partition, not entire table
- Table creation is idempotent - can be called multiple times safely

FILENAME PARSING:
- Both ocr/iapp/ and meta/ files follow YYYY/YYYY-MM.jsonl pattern
- Must extract partition info at sync time to pass publish_month to transform
- Date always 01 of the month (2025-01-01, not variable day)

STATE MANAGEMENT:
- State file is state.csv
- table_name field includes partition decorator in state file
- State CSV keeps all syncs for incremental detection

HF API PAGINATION:
- Recursive listing on full dataset exceeds response size limits
- Solution: Non-recursive year listing first, then recursive per year
- Still fast and avoids pagination complications

WORKLOAD IDENTITY FEDERATION:
- GitHub Actions authenticates to GCP without secrets
- Requires: WIF pool, OIDC provider, service account with iam.workloadIdentityUser
- Must enable iamcredentials.googleapis.com API
- Workflow needs id-token: write permission
