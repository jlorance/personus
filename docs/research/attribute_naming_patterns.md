---
type: research
title: "Research: Attribute Naming Patterns Across Matching Platforms"
description: "Analysis of how major matching platforms (Hinge, Bumble, Tinder, Match.com, OkCupid, eHarmony, LinkedIn) name, categorize, and display user attributes. Goal: validate Personus's naming choices and…"
status: current
tags: [research]
timestamp: 2026-02-10
---

# Research: Attribute Naming Patterns Across Matching Platforms

> Date: 2026-02-10
> Status: Research complete, naming plan drafted

## Summary

Analysis of how major matching platforms (Hinge, Bumble, Tinder, Match.com, OkCupid, eHarmony, LinkedIn) name, categorize, and display user attributes. Goal: validate Personus's naming choices and identify improvements.

**Key finding:** No major platform uses "traits" user-facing. Our internal use is fine, but users should see natural language terms. Our current field names (`skills`, `values`, `openTo`) are well-aligned with industry conventions.

---

## Platform Terminology Comparison

| Concept         | Hinge       | Bumble            | Tinder       | Match.com  | OkCupid   | LinkedIn    | Personus (current)         |
| --------------- | ----------- | ----------------- | ------------ | ---------- | --------- | ----------- | -------------------------- |
| Demographics    | **Vitals**  | Basic Info        | —            | Basics     | Basics    | Intro       | persona base layer         |
| Professional    | **Virtues** | Basic Info        | —            | Background | Fields    | Experience  | `employment`, `education`  |
| Capabilities    | —           | —                 | —            | —          | —         | **Skills**  | `skills`, `certifications` |
| Interests       | —           | **Badges** (200+) | **Passions** | Interests  | Topics    | —           | `hobbies`                  |
| Values          | Virtues     | Basic Info        | —            | **Values** | Questions | —           | `values`                   |
| Lifestyle       | **Vices**   | Basic Info        | —            | Lifestyle  | Questions | —           | —                          |
| Goals           | Intentions  | Looking For       | —            | —          | —         | **Open To** | `openTo`                   |
| Free expression | **Prompts** | Prompts           | Bio          | Summary    | Essays    | About       | `headline`                 |

---

## Category Grouping Patterns

### Hinge: Alliterative Three-Part Model (Most Elegant)

- **Vitals**: age, height, location, ethnicity, family plans, zodiac
- **Virtues**: job, education, religion, hometown, languages, politics
- **Vices**: drinking, smoking, marijuana, drugs

### Bumble: Two-Tier Badge System

- **Basic Info** (factual): work, education, height, location, lifestyle choices
- **Interest Badges** (~200 options, pick 5): organized into 12 categories (Creativity, Sports, Going Out, Staying In, etc.)

### Match.com: Multi-Section

- **About You / About Your Match** (parallel self + preference structure)
- **Appearance**, **Lifestyle**, **Background & Values**, **Topics**, **Summary**

### LinkedIn: Professional Taxonomy

- **Experience**, **Education**, **Skills** (41,000+ skill taxonomy), **Endorsements**, **Recommendations**

---

## Attribute Type Patterns

| Type                 | Examples                                  | Personus Equivalent           |
| -------------------- | ----------------------------------------- | ----------------------------- |
| Free-text            | OkCupid essays, Match summary             | `headline`                    |
| Prompted free-text   | Hinge prompts (150 chars), Bumble prompts | Not yet implemented           |
| Single-select enum   | Height, religion, education level         | `contactPolicy`, `visibility` |
| Multi-select enum    | Bumble badges (pick 5), Tinder passions   | `skills`, `values`, `openTo`  |
| Scored questionnaire | OkCupid match questions (500+)            | Not applicable                |

### Importance Weighting (OkCupid Model)

OkCupid captures three inputs per question:

1. Your answer
2. Acceptable answers in a match
3. Importance: Irrelevant (0) → A Little (1) → Somewhat (10) → Very (50) → Mandatory (250)

Exponential scale means one "Mandatory" outweighs 250 "A Little Important" items. Relevant for our search/matching.

---

## Display Patterns

| Pattern            | Platform                 | Use Case                   | Our `displayConfig.type`    |
| ------------------ | ------------------------ | -------------------------- | --------------------------- |
| Tags/pills         | Bumble, Tinder, LinkedIn | Quick-scan attributes      | `tag_list`, `pill_list`     |
| Timeline           | LinkedIn                 | Chronological history      | `timeline`                  |
| Prompted cards     | Hinge, Bumble            | Personality expression     | Not yet implemented         |
| Completeness meter | Bumble, LinkedIn         | Profile quality motivation | `completeness.ts` (built)   |
| Compatibility %    | OkCupid                  | Discovery results          | Vector similarity (planned) |

---

## Privacy Controls Comparison

| Level                   | Platform                        | Personus                          |
| ----------------------- | ------------------------------- | --------------------------------- |
| Profile-level show/hide | All platforms (incognito/pause) | Per-persona visibility            |
| Field-level optional    | Hinge (most fields optional)    | Per-persona trait selection       |
| Per-group visibility    | **None**                        | Per-persona + group memberships   |
| Post-match reveal       | CMB (hidden icebreakers)        | Could implement staged disclosure |

**Personus's per-persona, per-group visibility model has no direct precedent.** This is a genuine differentiator.

---

## Progressive Disclosure

| Pattern            | Platform         | Notes                                               |
| ------------------ | ---------------- | --------------------------------------------------- |
| Gated onboarding   | eHarmony         | 80-question quiz required before access             |
| Percentage meter   | Bumble, LinkedIn | Visual progress + specific suggestions              |
| Quality feedback   | Hinge            | AI evaluates answer uniqueness, not just completion |
| Behavioral nudging | OkCupid          | "More questions = better matches" messaging         |
| Staged reveal      | CMB              | Icebreakers hidden until post-match                 |

Our completeness scoring (100-point scale, 8 weighted fields) aligns with the percentage meter pattern.

---

## Naming Recommendations

### Terms That Resonate (User-Facing)

- **"Skills"** — universal for professional capabilities (LinkedIn's 41K taxonomy validates)
- **"Interests"** — more universal than "hobbies" (used by Bumble, Tinder, CMB)
- **"Values"** — used by Match and Hinge, well-understood
- **"Open To"** — matches LinkedIn's "Open To Work" concept
- **"Strengths"** — cleaner than "Distinctive Strengths"
- **"Basics"** — for demographic/factual fields

### Terms to Avoid (User-Facing)

- **"Traits"** — sounds clinical/psychological, no platform uses it
- **"Attributes"** — too technical
- **"Vitals"** — too medical outside Hinge's dating context
- **"Policy"** — too corporate/legal (as in "Contact Policy")

---

## Sources

- [Bumble Badges](https://bumble.com/en-us/the-buzz/bumble-badges)
- [Hinge Profile Tips](https://eddie-hernandez.com/best-hinge-profile-tips-for-men-women/)
- [Hinge 2025 Product Evolution](https://hinge.co/newsroom/hinge-2025-product-evolution)
- [Match Profile Guide](https://www.vidaselect.com/how-to-write-a-match-profile)
- [OkCupid Match Questions](https://okcupid-app.zendesk.com/hc/en-us/articles/22770910347803-Match-Questions)
- [OkCupid Algorithm](https://tinderprofile.ai/blog/how-the-okcupid-algorithm-works/)
- [eHarmony Compatibility Scoring](https://www.prnewswire.com/news-releases/eharmony-unveils-its-compatibility-scoring-for-the-first-time-300378763.html)
- [LinkedIn Skills and Endorsements](https://www.linkedfusion.io/blogs/linkedin-skills-endorsements/)
- [Dating App Design Guide](https://fulminoussoftware.com/dating-app-design-guide)
- [Completeness Meter Pattern](https://ui-patterns.com/patterns/CompletenessMeter)
