# Evidence checks for event-history analysis

Sources checked 27 October 2026. Event histories can identify customers and employees. These checks support selected New Zealand Privacy Act 2020 principles. They are not a full legal checklist, certification or an automated decision about a person.

| Rule | Authority | What `/compliance` checks |
|---|---|---|
| IPP1, purpose | [Office of the Privacy Commissioner](https://www.privacy.org.nz/privacy-principles/1/) | A process has a recorded analysis purpose. A nonempty field does not establish that collection is lawful or necessary. |
| IPP8, accuracy | [Office of the Privacy Commissioner](https://www.privacy.org.nz/privacy-principles/8/) | A reviewer recorded a source reconciliation reference. New events invalidate that review. The program does not verify the reference. |
| IPP9, retention | [Office of the Privacy Commissioner](https://www.privacy.org.nz/privacy-principles/9/) | A retention review date exists and is not due. There is no statutory retention period encoded here. The process owner chooses the review date after considering the purpose and any other retention duties. |

The software does not delete information. The owner decides what to retain and records any authorised disposal plan, covering source rows, exports, drafts and backups. Append-only event protection is an operational safeguard, not a reason to retain personal data indefinitely. A database administrator must implement any approved erasure across all copies.

Approval-before-picking in the fictional seed is an internal wholesale policy, not a legal rule. `/checkpoint-review` looks for a completed predecessor at or before each checked activity's start time. A missing or unfinished predecessor is a finding. It does not implement full process-model conformance or prove misconduct. Missing source events and timestamp errors can produce a finding.

The 120-hour case target and 48-hour quiet-work threshold are demo settings in calendar hours. Change them through configure. They are not statutory deadlines. `/customise` can add a jurisdiction-specific rule only after its source and scope are checked.
