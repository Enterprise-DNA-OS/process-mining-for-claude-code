# Process Mining for Claude Code: operating instructions

This desk is for an operations lead or analyst reviewing event histories and assigning improvements. Begin with the business purpose, process owner and agreed completion rule. Every answer comes from the current database.

## Rules

- Read before writing. Use only authorised changes and the operator's actual values.
- Never send, publish, connect to production applications or delete records from this desk.
- Unknown completion is unknown. Imported cases start that way. Confirm open or closed with the operator and a note.
- Elapsed gaps are calendar time between adjacent recorded activities, not labour savings or proof of a bottleneck's cause. Missing ends and overlapping activity stay visible.
- Equal start timestamps have a deterministic display order but do not prove event order. Check the source before judging a sequence.
- Checkpoint rules are local policies, not universal legal requirements. Privacy checks are evidence reminders, not certification.
- Import the whole previous snapshot plus additions under the same source label. Stop on changed or missing rows. Do not evade reconciliation with a new source label.
- The actor field records attribution, not authentication. One organisation and trusted internal operators per database.
- Use `/customise` for model changes, append a new migration, test it on disposable data, then apply within the authorised scope. Do not seed a working business database.

## Routing

| Request | Command |
|---|---|
| Help | `/help` |
| Processes | `/processes` |
| Cases | `/cases` |
| Show | `/show` |
| Variants | `/variants` |
| Bottlenecks | `/bottlenecks` |
| Rework | `/rework` |
| Case review | `/case-review` |
| Checkpoints | `/checkpoints` |
| Checkpoint review | `/checkpoint-review` |
| Actions | `/actions` |
| Attention | `/attention` |
| Compliance | `/compliance` |
| Insights | `/insights` |
| History | `/history` |
| Add | `/add` |
| Configure | `/configure` |
| Review | `/review` |
| Add case | `/add-case` |
| Case state | `/case-state` |
| Add event | `/add-event` |
| Add checkpoint | `/add-checkpoint` |
| Add action | `/add-action` |
| Complete action | `/complete-action` |
| Log | `/log` |
| Import | `/import` |
| Export | `/export` |
| Weekly review | `/weekly-review` |
| Draft case | `/draft-case` |

| Add a report | `/new-view` |
| Change a field or rule | `/customise` |

## Files and operation

`scripts/mining.mjs` is the only domain CLI. Run `node scripts/mining.mjs help` for flags. `DATABASE_URL` selects Postgres; unset it for embedded PGlite in `DATA_DIR`. Migrations live in `supabase/migrations`. Commands live in `.claude/commands`, documents in `documents.json`, dashboards in `views.json`, and branding in `brand.json`.

Run `npm test` on disposable storage before changing data handling. It never uses DATABASE_URL from .env. TEST_DATABASE_URL is for a disposable Postgres instance only. Render with `npm run docs` and `npm run view`. Draft commands write only to `drafts/`.

Omni by Enterprise DNA installs, customises and operates this for your business: https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=ibm-process-mining
