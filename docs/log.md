# Change log

Reserved OKF change-history file for the `docs/` bundle. Newest first.

## 2026-07-24 — Initial OKF port

Ported the Personus design docs from the legacy repo (`current/personus/docs`, 120 live files) into this OKF knowledge bundle, reconciled to the shipped `main`.

- **Structure.** `specs/` → `domains/` (one dir per product area); the `integrations` area was renamed to **`platform-channels`** to match the shipped `platform_channel_bindings` concept. foundation / decisions / guides / research / patterns / business-model / qa kept. Generated `index.md`; conventions in [`_okf.md`](/_okf.md).
- **Frontmatter.** Every concept file now carries OKF frontmatter (`type` required; `title`/`description`/`status`/`tags`/`timestamp`). Added a `docs:validate` CI check.
- **Reconciled to code.** `ContactChannelAdapter` → `ContactRelay`; the old `integrations` table → `platform_channel_bindings`; residual `ABL` → `library`/`Solution Profile`. Reconciliation notes added to the integration/data-model docs whose prose still described the retired table.
- **Quarantined (preserved, `status: superseded`).** Point-in-time alignment/onboarding reports, the stale v5 agent spec, the legacy README, `to-reintegrate.md`, and all legacy `_archive/` trees moved under `archive/`.
- **Not ported.** `Personus_ai_Core_PRD_v1_0.docx` (binary) — see [`business-model/_core-prd-source.md`](/business-model/_core-prd-source.md). The `archived/personus/docs` snapshot was a strict older copy with no unique content — discarded.
- **Follow-up.** Deep, line-by-line spec-vs-`main` reconciliation is tracked per-domain in Linear (Personus MVP); `status: current` here means "matches `main` in intent," not "prose fully audited."

Tooling: `scripts/docs/{port,validate,gen-index,lib}.mjs`.
