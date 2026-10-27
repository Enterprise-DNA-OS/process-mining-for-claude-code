# Verification

27 October 2026, Linux, Node 22.23.4:

- `npm install`: PASS, no dependency audit findings.
- `npm test`: PASS, all 29 CLI commands and 70 command checks on disposable PGlite storage.
- The same smoke suite on disposable PostgreSQL 18.4: PASS. The test server was stopped and its temporary data removed.
- Import tests cover preview rollback, replay, snapshot extension, changed or missing rows, duplicate events, explicit column mapping, time offsets and a later-row failure after earlier writes.
- Analysis tests cover known elapsed gaps, repeated activities, missing predecessor evidence, overlaps, simultaneous starts and unknown case status.
- Mutation tests cover completion guards, attribution, resolution requirements, case scoping, ambiguous names and append-only history.
- Rendering checks cover HTML escaping, spreadsheet formula escaping, all three dashboards and all three document types.
- `npm run demo`, `npm run view` and `npm run docs`: PASS. The demo produces three views and eight documents.
- The Command Centre page gate passes with sourced prices and three captured demo runs.

The manual GitHub workflow includes Windows and Linux on Node 20/22 plus Postgres 17. Local results above do not establish Windows execution. Hosted check results and visual verification are recorded below when completed.

The import example is synthetic, following IBM's documented event model. No customer export or production database was used. Large-event-volume performance and full IBM platform compatibility are not claimed.

The landing route rendered HTTP 200 in an isolated local preview using the unchanged Landing Pages components. The page has noindex,nofollow, all three offers and six attributed booking links. Desktop and mobile screenshots were inspected. The process dashboard and mobile case history were inspected too. A shared renderer improvement keeps wide report tables scrollable and timestamps on one line. That improvement is also in the Command Centre template for the runner to commit.
