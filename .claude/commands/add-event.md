---
description: Add event for the process mining desk.
---

Read the affected process and case first. Use the operator's supplied values and a real attribution label. The example is fictional, not authority to apply its values. Resolve ambiguous names before writing. Show the saved record and any remaining evidence gaps.

```bash
node scripts/mining.mjs add-event ORD-102 --key=source-event-123 --activity=Dispatch --start=2026-10-20T09:00:00Z --end=2026-10-20T09:30:00Z --resource=depot-a --role=Warehouse --actor="Operator"
```

Add `--json` for structured output. On an error, explain it and keep the source data intact.
