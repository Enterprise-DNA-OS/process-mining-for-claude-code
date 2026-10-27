# Bring an IBM Process Mining event history across

Sources checked 27 October 2026:

- [IBM event-log requirements](https://www.ibm.com/docs/en/process-mining/2.2.0?topic=sources-event-log): case identifier, activity and start time are required. End time, resource and role are optional.
- [IBM dashboard export](https://www.ibm.com/docs/en/process-mining/2.2.0?topic=analytics-using-dashboards): Data source, Export, Download produces a CSV for dashboard data.

Use the original event CSV uploaded to IBM, or an event-level dashboard export containing the required fields. A summary chart export is not an event history. Check that every case includes its complete history, filters are removed as appropriate, and resource identifiers have been approved for this analysis. Do not export a project backup with credentials. The included example is synthetic and follows IBM's documented event model, not a captured customer export.

## One-command import

Create a process with its owner, purpose, completion activity and retention-review date. Preview first:

```bash
node scripts/mining.mjs import ibm-process-mining examples/ibm-events.csv --process=ORDERS --source=ibm-orders --dry-run --actor="Operator"
```

Repeat without `--dry-run` after reconciling the row and case counts. This one command writes the complete event batch transactionally. Any error rolls back the batch and its audit entry.

| IBM field | Accepted headers | Stored as |
|---|---|---|
| Case identifier | ProcessID, Process ID, Case ID, caseid | Case code inside the chosen process |
| Activity | Activity | Activity name, case-sensitive |
| Start time | StartTime, Start time | Offset-aware instant |
| End time | EndTime, End time | Optional instant, never before start |
| Resource | Resource | Optional source identifier |
| Role | Role | Optional role |
| Other columns | Original headings | Original source row, not extra calculated measures |

Map a different heading with `--case-column`, `--activity-column`, `--start-column`, `--end-column`, `--resource-column` or `--role-column`. Missing explicitly mapped columns fail. Files must be comma-delimited UTF-8 CSV. BOM, CRLF, quoted commas, embedded newlines and doubled quotes are supported. XLSX, ZIP, parquet and project archives are not accepted by this importer.

Use ISO timestamps with Z or an explicit offset. For a known fixed-offset export without offsets, supply `--timezone=+12:00`. This is a fixed offset, not a named timezone. For a period crossing daylight-saving changes, add the correct offset to each source timestamp before import. Invalid, future and reversed timestamps are rejected. End times remain missing when the source has none.

## Repeat imports and reconciliation

Keep one stable source label for a process dataset. Repeating the same snapshot skips its events. A later snapshot must contain every previous row unchanged, plus any additions. A changed or removed row fails for explicit reconciliation. Row order can change. Identical rows are counted separately within a snapshot, so legitimate same-time events are not silently discarded.

Do not use a new source label to get around a failure: the labels isolate datasets, so doing that duplicates the old events. Mapping changes, corrections and removals need a reviewed migration or a separately named comparison process. Keep the original export outside Git. New events for a closed case require an explicit reopen and review.

Imported cases start with unknown completion. Confirm their state using `case-state` and a note. Closing requires the configured terminal activity with an end time as the last recorded step. IBM completion filters, process models, cost settings, simulations, custom dashboards, permissions, task recordings and connections are not imported. Enterprise DNA scopes those mappings and connections separately. This is an analysis and follow-up desk, not a like-for-like copy of the full IBM platform.

## Exit and backup

`node scripts/mining.mjs export --out=exports/history.json` exports every domain record, original source row and audit event. Add `--format=csv` for a flat event-history export. Spreadsheet formula prefixes are escaped; do not use that CSV for exact restoration. JSON is a portable record copy, not an automatic restore tool. Back up the database itself and prove the restore procedure before business use.
