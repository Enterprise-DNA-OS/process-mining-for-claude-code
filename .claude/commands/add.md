---
description: Add for the process mining desk.
---

Read the affected process and case first. Use the operator's supplied values and a real attribution label. The example is fictional, not authority to apply its values. Resolve ambiguous names before writing. Show the saved record and any remaining evidence gaps.

```bash
node scripts/mining.mjs add --code=SERVICE --name="Service requests" --owner="Operations lead" --purpose="Review request delays" --terminal="Close case" --sla-hours=120 --stale-hours=72 --retention-review=2027-01-01 --actor="Operator"
```

Add `--json` for structured output. On an error, explain it and keep the source data intact.
