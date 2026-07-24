---
type: decision
title: "Styling: Tailwind v4 CSS-Based Configuration"
description: "Date: 2026-04-11 Status: Accepted (retroactive) Scope: apps/web, apps/admin Participants: Retroactive — documenting an already-shipped decision"
status: current
tags: [decisions]
timestamp: 2026-04-11
---

# Styling: Tailwind v4 CSS-Based Configuration

**Date:** 2026-04-11
**Status:** Accepted (retroactive)
**Scope:** `apps/web`, `apps/admin`
**Participants:** Retroactive — documenting an already-shipped decision

## Context

Personus ships a rich visual design system: three persona tints (person green, org blue, shadow purple), a gold accent, custom typography (Fraunces display, Outfit body, JetBrains Mono), OKLCH color space, and a dark mode that must coexist with shadcn/ui components. The consumer app uses Tailwind CSS v4 with **CSS-based configuration** in `apps/web/app/globals.css` via `@theme inline { ... }`, not a `tailwind.config.ts` file. Dark mode is wired through `@custom-variant dark (&:is(.dark *))`. PostCSS uses `@tailwindcss/postcss` (not `tailwindcss` directly).

Tailwind v4 represents a significant break from v3: config moves into CSS, the engine is rewritten, and the mental model shifts from "JavaScript config drives CSS" to "CSS is the source of truth."

## Decision Drivers

1. **shadcn/ui compatibility** — the component library is the foundation of the UI; styling must match its expectations.
2. **Design token fidelity** — persona tints and accent colors use OKLCH for perceptually-uniform color ramps; the toolchain must support wide-gamut colors.
3. **Dark mode without flicker** — class-based dark mode with Next.js SSR must not FOUC.
4. **Build performance** — v4's Rust-based engine is meaningfully faster than v3's PostCSS plugin.
5. **Single source of truth for tokens** — avoid duplicating color/font definitions across `tailwind.config.ts` and CSS variables.
6. **Upgrade path from v3** — if a major issue emerges, we must be able to fall back.

## Decision

We use **Tailwind CSS v4** with CSS-based configuration. Design tokens (colors, fonts, spacing where custom, persona tints) live in `apps/web/app/globals.css` in an `@theme inline` block. Dark mode uses `@custom-variant dark (&:is(.dark *))`. No `tailwind.config.ts` file. PostCSS uses `@tailwindcss/postcss`. `apps/admin` follows the same pattern for consistency.

This satisfies drivers 1–5 fully. Driver 6 is accepted with the knowledge that v3 → v4 migration guides exist but downgrading would be a manual port.

## Alternatives Considered

### Comparison Matrix

| Driver | Tailwind v4 CSS config (chosen) | Tailwind v3 JS config | CSS Modules | vanilla-extract |
|---|---|---|---|---|
| shadcn/ui compat | Yes (current guidance) | Yes | Possible but heavier | Possible but heavier |
| OKLCH / wide-gamut | First-class | First-class | Native CSS | Native CSS |
| Dark mode ergonomics | `@custom-variant dark` | `darkMode: 'class'` | Manual | Manual |
| Build speed | Rust engine, fastest | PostCSS plugin | N/A | Medium |
| Single source of truth | Yes (CSS only) | Two places (JS + CSS vars) | CSS only | TS only |
| Typed tokens | No (CSS vars) | Optional via TS config | No | Yes |
| Maturity | Recent but stable | Very mature | Very mature | Mature |
| Ecosystem (plugins) | Growing | Huge | N/A | N/A |

### Tailwind v4 CSS config (chosen)
Aligns with shadcn/ui's current recommendations, collapses config into one place (CSS), and gets the Rust engine speedup for free. OKLCH support is first-class.

### Tailwind v3 JS config (rejected)
Mature and battle-tested, but splits config across `tailwind.config.ts` and CSS variables. Opting for v3 on a greenfield codebase means planning a v4 migration later. Rejected on future-proofing.

### CSS Modules (rejected)
Strong type-level isolation but removes the utility-first velocity Tailwind provides — and removes shadcn/ui compatibility. Rejected on fit.

### vanilla-extract (rejected)
Excellent type safety, but another layer of abstraction and a much smaller ecosystem. Rejected on cost-benefit.

## Consequences

### Positive
- One file (`globals.css`) holds colors, fonts, and theme config — no JS/CSS split.
- OKLCH colors and dark-mode variants work cleanly out of the box.
- Rust-based build is noticeably faster on large files.
- shadcn/ui components drop in without adapter shims.

### Negative
- Tailwind v4 is recent; some plugins from the v3 ecosystem may lag or have compat issues.
- CSS-based config is less discoverable for contributors used to `tailwind.config.ts`.
- No TypeScript-typed token objects — token typos fail at runtime / in CSS.

### Risks
- **Plugin ecosystem gaps.** A v3 plugin we need might not have a v4 equivalent. Mitigation: most core plugins are absorbed into v4; check before adding.
- **Tooling integration lag.** IDE autocomplete for `@theme inline` tokens depends on extension support. Mitigation: acceptable friction; improving quickly.
- **Downgrade cost.** If v4 proves unstable, falling back to v3 is a manual port of `globals.css` → `tailwind.config.ts`. Mitigation: `globals.css` is small and well-structured.

## Implementation

- Theme config: `apps/web/app/globals.css` (`@theme inline { ... }`)
- Dark mode: `@custom-variant dark (&:is(.dark *))` in the same file
- PostCSS: `@tailwindcss/postcss`
- Design tokens: `--persona-person`, `--persona-org`, `--persona-shadow`, `--accent-gold`, Fraunces / Outfit / JetBrains Mono
- Admin app mirrors the same approach in `apps/admin/app/globals.css`

## References

- `apps/web/app/globals.css` — current theme config
- shadcn/ui Tailwind v4 migration notes
- Onboarding report `docs/onboarding-2026-04-10.md` — P3 retroactive ADR item
