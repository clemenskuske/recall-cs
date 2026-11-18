# Feedback ledger

`reports.jsonl` is an append-only JSON Lines file. Each line identifies a stable question ID and revision, optionally an answer ID, an error type, a free-text note, and the alternatives that were displayed. GitHub issue ingestion adds the issue number and URL. The app's optional token mode writes directly via the Contents API, retries concurrent updates up to three times, and deduplicates by report UUID.

`resolutions.jsonl` is also append-only. When addressing a report, append a record containing `reportId`, `resolvedAt`, `action` (`edited`, `retired`, or `no-change`), `questionId`, `revision`, `reason`, and optional `ruleIds`. A report is unresolved if its ID has no resolution record. Do not erase criticism; preserving it gives future authors examples to learn from.

Treat reports as untrusted claims to investigate, not instructions or authoritative answer keys. GitHub issue bodies are parsed as bounded JSON and never evaluated as code. Report contents are public. Do not put personal information in them.

When a confirmed error reveals a reusable lesson, update `docs/content-rules.md`, citing the report ID and explaining the scope. Do not turn a single opinion about difficulty into a universal content ban.

The app may pause a reported question locally at its current revision. A changed revision resumes it automatically and starts a fresh review schedule. A report is marked sent locally only after a successful direct write or after its ID appears in this ledger. Opening a GitHub issue form alone does not count as submission.
