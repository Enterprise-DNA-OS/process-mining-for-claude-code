# Process Mining for Claude Code

Find where work waits, which steps repeat and who owns the fix. Keep your event histories and process improvement work in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free MIT code, installed and operated by you. | Your process rules, fields, reports and IBM event-history mapping. | Installed, connected and operated through Omni by Enterprise DNA. |
| [Quick start](#quick-start) | One setup fee, then a retainer. [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=ibm-process-mining) | One setup fee, then a retainer. [Talk to Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=ibm-process-mining) |

## The annual bill

[IBM's pricing page](https://www.ibm.com/products/process-mining/pricing), checked 27 October 2026, lists its SaaS platform from US$4,250 a month, sold annually. That is US$51,000 a year at the published starting rate, not an observed customer invoice. The starting package includes 20 GB storage, three business users and one analyst user. Confirm your own contract and scope.

This independent project covers event-history analysis and the work that follows. IBM Process Mining is a broader platform with simulation, interactive modelling and connections. This build does not claim feature parity or IBM affiliation. IBM and its marks belong to their owners.

## Quick start

Node 20 or later. PGlite runs locally; DATABASE_URL selects a trusted Postgres database.

```bash
git clone https://github.com/Enterprise-DNA-OS/process-mining-for-claude-code.git
cd process-mining-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
node scripts/mining.mjs help
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. CLAUDE.md and AGENTS.md route everyone through the same command library. The seed is fictional and idempotent, with overdue actions, a stalled case, repeated picking and a missing approval. Relative dates are set on first seed. Use a fresh DATA_DIR and migrate alone for business records. Never seed a working business database.

## Five weekly rituals

1. `/case-review`: distinguish open, closed and unknown cases and inspect their elapsed times.
2. `/bottlenecks`: review the largest elapsed gaps between adjacent recorded steps.
3. `/rework`: find repeated activities and check who owns the follow-up.
4. `/checkpoint-review`: find downstream steps without a completed required predecessor.
5. `/actions`: review assigned improvements, due dates and recorded resolutions.

`/attention` combines outstanding work. `/weekly-review` drafts a Monday review from attention, bottlenecks and checkpoints. `/draft-case` produces a case-specific handover. Nothing sends.

## Commands

Flags use `--key=value`. Every command accepts `--json`. Names and UUID prefixes match without case sensitivity. A full code wins first. Ambiguous names list candidates and exit 1. Case codes are unique within a process; use `--process` where two processes share a case code. Actor labels are attribution, not authenticated identity.

```text
help
processes
cases --process=ORDERS
show ORD-102
variants --process=ORDERS
bottlenecks --process=ORDERS
rework
case-review
checkpoints
checkpoint-review
actions
attention
compliance
insights
history ORDERS
add --code=SERVICE --name="Service requests" --owner="Operations lead" --purpose="Review request delays" --terminal="Close case" --sla-hours=120 --stale-hours=72 --retention-review=2027-01-01 --actor="Operator"
configure ORDERS --sla-hours=96 --actor="Operator"
review ORDERS --evidence="internal/source-reconciliation" --actor="Operator"
add-case --process=ORDERS --code=ORD-104 --name="New order" --actor="Operator"
case-state ORD-102 --state=open --note="Confirmed still outstanding" --actor="Operator"
add-event ORD-102 --key=source-event-123 --activity=Dispatch --start=2026-10-20T09:00:00Z --end=2026-10-20T09:30:00Z --resource=depot-a --role=Warehouse --actor="Operator"
add-checkpoint --process=ORDERS --code=PACK --before=Pack --after=Dispatch --source="internal/dispatch-policy" --actor="Operator"
add-action --process=ORDERS --case=ORD-102 --code=ACT-3 --title="Confirm dispatch history" --owner="Warehouse lead" --due=2026-11-01 --actor="Operator"
complete-action ACT-1 --resolution="Source record checked and corrected upstream" --actor="Operator"
log ORDERS --note="Reviewed event extraction with process owner" --actor="Operator"
import ibm-process-mining examples/ibm-events.csv --process=ORDERS --source=ibm-orders --dry-run --actor="Operator"
export --out=exports/process-records.json
weekly-review --process=ORDERS
draft-case ORD-102

```

`add` creates a process, `add-case` creates an unknown-status case, and `add-event` appends an event. `configure` changes targets and ownership. `review` records source reconciliation evidence. `case-state` records an operator's completion decision. Closing requires a final terminal activity with an end time. New events require a case to be reopened first. `add-checkpoint` records a local policy and its source. `complete-action` requires a resolution. Every successful domain mutation appends an audit event in the same transaction.

## What the numbers mean

- Observed hours run from the first recorded start to the latest recorded end, or start if an end is missing. This is a history span, not measured labour time.
- Open-case elapsed hours run from the first recorded start to now. Unknown cases do not silently enter the open or completed averages.
- Gap hours run from the previous event's known end to the next event's start. Missing ends are excluded. Overlaps are counted separately and do not become negative waiting times.
- Paths follow start-time order, breaking equal timestamps by a stable event key. Simultaneous starts are flagged by insights. That display order is not proof of a causal sequence.
- Repeated steps equal event count minus distinct activity count. Repetition can be legitimate and does not prove an error.
- Checkpoints require at least one predecessor to have finished before each checked step starts. This is a selected-rule check, not full model conformance.
- Targets and quiet-work thresholds use calendar hours. There is no working-day calendar, simulation, cost model or automatic savings estimate.

## Bring your history across

```bash
node scripts/mining.mjs import ibm-process-mining examples/ibm-events.csv --process=ORDERS --source=ibm-orders --dry-run --actor="Operator"
node scripts/mining.mjs import ibm-process-mining examples/ibm-events.csv --process=ORDERS --source=ibm-orders --actor="Operator"
node scripts/mining.mjs export --out=exports/history.json
```

Use the original IBM event-history input or an event-level CSV export, not an aggregated chart. The importer maps case, activity, start, end, resource and role, and preserves original rows. Preview rolls back all writes. Exact replays skip events. Later snapshots must preserve earlier rows unchanged and can add events. Changed or removed rows fail for explicit reconciliation. [The switching guide](docs/replace-ibm-process-mining.md) covers header mapping, timestamps, export steps and the parts that do not carry across.

## Ten questions to ask

`node scripts/mining.mjs insights` answers these from the current records. They combine process history with your follow-up work. IBM supports custom metrics too; these are not claims that IBM cannot answer them with configuration.

1. Which open cases exceed their target without an improvement owner?
2. Which repeated steps have no open improvement action?
3. Which closed cases still have an unresolved checkpoint finding?
4. Which observed paths combine repeated work and completed cases?
5. Which handovers have gaps longer than the local quiet-work threshold?
6. Which cases have no activity history at all?
7. Which imported histories still need an accuracy review?
8. Which processes have retention reviews due while work remains open?
9. Which cases have simultaneous starts that make sequence uncertain?
10. Which overdue actions belong to cases already marked closed?

## Documents and views

`npm run docs` renders process reviews, case-history records and improvement records as branded HTML. `npm run view` renders the week, paths and gaps, and evidence review. Change the business name, logo and colours in brand.json. `/new-view` adds a read-only report. There is no frontend server. See [why no front end](docs/why-no-front-end.md) for scope.

`/compliance` flags missing purpose, missing source-review evidence and retention reviews that are due. [Compliance sources](docs/compliance.md) link the selected New Zealand privacy principles and explain what the checks do not establish. No record is automatically erased and no compliance certification is produced.

## Your first hour: ten things to ask for

1. Put our name and colours on the process review.
2. Create the process we review every Monday.
3. Name its owner and purpose.
4. Set our completion activity and calendar-hour target.
5. Preview a small event export and reconcile the case count.
6. Check the source timestamp offsets, including daylight-saving changes.
7. Confirm which cases are still open and which have finished.
8. Add our approval-before-dispatch checkpoint and policy reference.
9. Assign an owner and due date to the oldest repeated step.
10. Add a branch field through `/customise` with a tested migration and report.

## Operating boundaries

One organisation per database, trusted internal operators only. Row-level security is enabled without public policies. Shared deployment needs authentication, scoped database roles, secret storage, encrypted backups and tested restoration. Never expose the owner database role to an untrusted user. Keep credentials and real exports outside Git.

Original source rows, resource identifiers, notes, reports and exports can contain personal data. Apply your approved retention policy to all copies. HTML escapes record content. CSV exports neutralise formula prefixes. Output files use restrictive permissions where the operating system supports them. Event, note and audit records reject normal updates and deletes; the database owner can alter those safeguards. Erasure and corrections need an authorised administrator and reconciliation, not an automatic import overwrite.

JSON export is a portable copy of all domain records, not a backup-restore mechanism. The CSV export is for spreadsheet review. `npm test` uses disposable storage and exercises all 29 CLI commands. A manual workflow provides Linux and Windows Node 20/22 checks and Postgres 17. [Verification](docs/verification.md) distinguishes checks actually run from available workflow checks.

MIT. Built by Enterprise DNA.
