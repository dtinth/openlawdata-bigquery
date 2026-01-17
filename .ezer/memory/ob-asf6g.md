---
type: note
created: '2026-01-17T06:21:50.110Z'
---
PROJECT GUIDELINES (from CLAUDE.md):

USE BUN THROUGHOUT:
✓ bun <file> instead of node/ts-node
✓ bun test instead of jest/vitest
✓ bun install instead of npm
✓ bun run <script> for package.json scripts
✓ @tsconfig/bun with extends instead of custom tsconfig
✓ bun add @types/node to avoid Buffer/Uint8Array issues

TYPESCRIPT:
✓ Strict mode enabled via @tsconfig/bun
✓ No 'any' types - use proper interfaces
✓ Type-only imports: import type { X } from 'module'
✓ typecheck script: 'bun run typecheck' runs tsc --noEmit

GOOGLE CLOUD:
✓ Use @google-cloud/bigquery SDK (not alternatives)
✓ Project hardcoded to 'sourceinth'
✓ Location: 'asia-southeast3'
✓ Dataset ID: 'openlawdata_soc_ratchakitcha'

HTTP:
✓ Use ofetch (not node-fetch, axios, etc)
✓ responseType: 'arrayBuffer' for binary data
✓ No headers/auth needed for HF public dataset API

STATE TRACKING:
✓ CSV via papaparse for simplicity
✓ File-level granularity (one row per JSONL file)
✓ Commit hash tracking for change detection
✓ Row count verification after load
