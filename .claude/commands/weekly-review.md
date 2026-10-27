---
description: Weekly review for the process mining desk.
---

This command reads attention, bottlenecks and checkpoint-review and writes the results to drafts/. Open the returned file, explain the most urgent items, their owners and what source evidence is still needed. Do not send it.

```bash
node scripts/mining.mjs weekly-review --process=ORDERS
```

Add `--json` for structured output. On an error, explain it and keep the source data intact.
