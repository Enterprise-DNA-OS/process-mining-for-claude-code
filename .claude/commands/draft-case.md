---
description: Draft case for the process mining desk.
---

The command reads the case history, checkpoint findings and actions before writing to drafts/. Read the file, show the evidence and unresolved work, and leave it as a draft. Nothing sends.

```bash
node scripts/mining.mjs draft-case ORD-102
```

Add `--json` for structured output. On an error, explain it and keep the source data intact.
