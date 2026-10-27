---
description: Add checkpoint for the process mining desk.
---

Read the affected process and case first. Use the operator's supplied values and a real attribution label. The example is fictional, not authority to apply its values. Resolve ambiguous names before writing. Show the saved record and any remaining evidence gaps.

```bash
node scripts/mining.mjs add-checkpoint --process=ORDERS --code=PACK --before=Pack --after=Dispatch --source="internal/dispatch-policy" --actor="Operator"
```

Add `--json` for structured output. On an error, explain it and keep the source data intact.
