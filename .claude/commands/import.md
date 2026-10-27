---
description: Import for the process mining desk.
---

Read docs/replace-ibm-process-mining.md first. Confirm the export is an event-level history, with complete cases and explicit timestamp offsets. Run the preview, reconcile counts, then repeat without --dry-run within the authorised import. Always reuse the source label. Changed snapshots must be reconciled explicitly, never hidden under a new source label.

```bash
node scripts/mining.mjs import ibm-process-mining examples/ibm-events.csv --process=ORDERS --source=ibm-orders --dry-run --actor="Operator"
```

Add `--json` for structured output. On an error, explain it and keep the source data intact.
