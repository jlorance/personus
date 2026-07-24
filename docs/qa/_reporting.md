---
type: guide
title: QA Reporting
description: This file describes the QA reporting conventions and artifacts for the personus project.
status: stub
tags: [qa]
---

# QA Reporting

> STUB — needs customization for this project.

This file describes the QA reporting conventions and artifacts for the personus project.

## Status

This stub was bootstrapped during PER-44 (docs/realized-tracker-record branch) as part of the QA framework initialization. Update with actual reporting procedures once established.

## Report Artifacts

- Coverage reports (location, format)
- Test result summaries (location, format)
- Flakiness tracking

## Phase Signals

Test-phase signals are emitted to `.claude/abl/signals/` as JSONL files per ticket.
Signal schema:

```json
{
  "kind": "signal",
  "skill": "deliver",
  "phase": "qa",
  "ticket": "TICKET-ID",
  "author": "github-handle",
  "fields": {
    "qa_status": "...",
    "reason": "..."
  }
}
```

Valid `qa_status` values:
- `passed` — test cases authored and passing
- `skipped-internal` — infrastructure/docs/config change with no behavioral surface
- `skipped-approved` — exemption approved by QA lead
- `failed` — test cases failing; blocks delivery

## Escalation

Document escalation path for test failures blocking delivery.
