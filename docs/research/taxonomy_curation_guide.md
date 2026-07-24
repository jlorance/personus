---
type: guide
title: Taxonomy Curation Guide
description: Repeatable runbook for curating Personus trait taxonomies. This guide ensures consistency across iterations and enables new team members to re-run the process.
status: current
tags: [research]
timestamp: 2026-02-10
---

# Taxonomy Curation Guide

Repeatable runbook for curating Personus trait taxonomies. This guide ensures consistency across iterations and enables new team members to re-run the process.

**Version:** 1.0
**Last updated:** 2026-02-10
**Process:** Document → Collate → Harmonize → Curate (4-phase, applied per taxonomy)

---

## 1. Source Inventory

### Tier 1: Formal Taxonomies (structural backbone)

| Source                      | URL / Access                                | License                       | Data freshness              | Used for                    |
| --------------------------- | ------------------------------------------- | ----------------------------- | --------------------------- | --------------------------- |
| **ESCO v1.2**               | https://esco.ec.europa.eu/en/classification | Free / CC BY 4.0              | Updated annually            | Skills (primary naming)     |
| **O\*NET 30.1**             | https://www.onetonline.org/                 | US DoL, CC BY 4.0             | Updated semi-annually       | Skills (category structure) |
| **VIA Character Strengths** | https://www.viacharacter.org/               | Academic (names free)         | Stable (2004 framework)     | Qualities                   |
| **Schwartz Basic Values**   | Academic papers                             | Academic (names free)         | Stable (2012 refined model) | Values                      |
| **ISO 639-1**               | https://www.loc.gov/standards/iso639-2/     | Public standard               | Stable                      | Languages                   |
| **ISCED-F 2013**            | UNESCO                                      | Public international standard | Stable                      | Education fields            |
| **NAICS**                   | https://www.census.gov/naics/               | Public domain                 | Updated every 5 years       | Industry categories         |

### Tier 2: Marketplace & SMB Sources (the long tail)

| Source         | URL / Access                                                   | What it adds                                         |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| **Thumbtack**  | https://www.thumbtack.com/browse/                              | 1,000+ home/local service categories                 |
| **Yelp**       | https://www.yelp.com/developers/documentation/v3/category_list | 1,400+ business categories                           |
| **Angi**       | https://www.angi.com/                                          | 500+ home professional categories + trust attributes |
| **TaskRabbit** | https://www.taskrabbit.com/                                    | 150+ personal service tasks                          |
| **Nextdoor**   | https://nextdoor.com/                                          | Neighborhood service categories                      |
| **BNI**        | https://www.bni.com/                                           | ~500 referral networking classifications             |

### Avoided Sources

| Source                    | Reason                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| CliftonStrengths (Gallup) | Trademarked — cannot use the 34 theme names                        |
| Yelp API data (direct)    | Terms restrict commercial reuse; use structure as inspiration only |
| LinkedIn skills taxonomy  | Proprietary; use as validation reference only                      |

---

## 2. Extraction Instructions

### ESCO Skills

1. Visit https://esco.ec.europa.eu/en/classification/skill_main
2. Export skills list (CSV available via API)
3. Filter to "skill" type (exclude occupations, knowledge)
4. Sort by usage frequency if available; otherwise take top items per category
5. Target: ~500 starter skills from ~13,939 total

### O\*NET Knowledge & Skills

1. Visit https://www.onetonline.org/find/descriptor/browse/
2. Download "Knowledge" and "Skills" Excel files
3. Use the 33 knowledge areas as category structure inspiration
4. Cross-reference with ESCO for naming consistency

### Thumbtack / Angi / TaskRabbit

1. Browse category pages (no API needed)
2. Capture service names as listed — these represent consumer search language
3. Note categories unique to marketplaces (not in ESCO/O\*NET)
4. Focus on: Home Services, Trades, Personal Services, Events

### VIA Character Strengths

1. Full list at https://www.viacharacter.org/character-strengths
2. 24 strengths organized under 6 virtues
3. Adopt all 24 as-is; supplement with professional qualities

### Schwartz Values

1. Reference: "An Overview of the Schwartz Theory of Basic Values" (2012)
2. 19 refined values mapped to user-friendly labels
3. Supplement with professional/community values

---

## 3. Collation Rules

When the same concept appears across sources under different names:

1. **Exact match** — Same name, same concept → automatic merge
2. **Fuzzy match** — Minor variations (plural, hyphenation, word order) → merge
   - "Plumbing" / "Plumber" / "Plumbers" → merge under "Plumbing"
   - "Pressure Washing" / "Power Washing" / "Pressure Washers" → "Pressure Washing"
3. **Synonym match** — Different words, same concept → merge under consumer-preferred term
   - "HVAC" / "Heating & Cooling" / "Air Conditioning" → "HVAC"
4. **Specificity difference** — One is a subset of another → keep general, not specific
   - "Photography" + "Real Estate Photography" → keep "Photography" in taxonomy
   - Users can type "Real Estate Photography" as a custom value

### Example collation decisions

| Concept          | ESCO              | O\*NET               | Thumbtack       | Yelp               | Angi               | Canonical name        | Rationale                                 |
| ---------------- | ----------------- | -------------------- | --------------- | ------------------ | ------------------ | --------------------- | ----------------------------------------- |
| Plumbing         | "repair plumbing" | "Plumbers" (47-2152) | "Plumbing"      | "Plumbers"         | "Plumber"          | **Plumbing**          | Noun form, consumer search term           |
| Handyman         | —                 | —                    | "Handyman"      | "Handyman"         | "Handyman"         | **Handyman Services** | Absent from formal; marketplace-validated |
| Pressure washing | —                 | —                    | "Power Washing" | "Pressure Washers" | "Pressure Washing" | **Pressure Washing**  | Consumer search preference                |

---

## 4. Harmonization Principles

Priority order for choosing canonical names:

1. **Consumer search language** — "Plumber" → "Plumbing" (skill form, but search-friendly)
2. **Noun form preferred** — Skills are labeled as capabilities ("Plumbing"), not roles ("Plumber")
3. **Specificity over generality** — Don't create too-broad categories; but don't micro-split either
4. **No abbreviations** — Except when the abbreviation IS the common search term (HVAC, CDL, SEO)
5. **Active voice for qualities** — "Patient" not "Patience" (how someone describes themselves)
6. **US English spelling** — "Organization" not "Organisation"

---

## 5. Deduplication Log

Key dedup decisions made during v1.0 curation:

| Decision               | Chose                  | Over                                      | Rationale                              |
| ---------------------- | ---------------------- | ----------------------------------------- | -------------------------------------- |
| Skill naming form      | "Plumbing" (noun)      | "Plumber" (role)                          | These are skill labels, not job titles |
| Abbreviations          | "HVAC"                 | "Heating, Ventilation & Air Conditioning" | HVAC is the consumer search term       |
| Handyman               | "Handyman Services"    | Omit (no formal source)                   | 5/7 marketplace sources include it     |
| Power/pressure washing | "Pressure Washing"     | "Power Washing"                           | Higher search volume                   |
| VIA strengths          | Keep academic names    | Rename to consumer language               | VIA names are already accessible       |
| Schwartz values        | Map to friendly labels | Keep academic terminology                 | "Benevolence" → "Helpfulness"          |

---

## 6. Category Boundaries

### Skills taxonomy category definitions

| Category                      | Includes                                            | Excludes                                  | Edge cases                                                           |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| **Technology & Software**     | Programming, IT, data, cloud, security              | Hardware repair (→ Trades)                | "Home Automation" → Home Services                                    |
| **Trades & Construction**     | Licensed trades, construction labor, building       | Home repair/maintenance (→ Home Services) | "General Contracting" stays in Trades                                |
| **Home Services**             | Residential maintenance, cleaning, home improvement | Licensed trades (→ Trades)                | "Painting" → Home Services (residential); fine art painting → Design |
| **Personal & Local Services** | Caregiving, personal assistance, beauty             | Clinical care (→ Healthcare)              | "Massage Therapy" → Healthcare; "Personal Training" → Healthcare     |
| **Healthcare & Wellness**     | Clinical, therapy, fitness, mental health           | Beauty services (→ Personal)              | Licensed practitioners go here                                       |

---

## 7. Coverage Checklist

Walk through Personus use case personas to verify coverage:

### Maya (Software Engineer)

- [x] Python, JavaScript, React, TypeScript in Technology
- [x] Machine Learning, Data Science in Technology
- [x] Mentorship in Seeking Opportunities
- [x] Creative, Curious in Qualities

### Marco (Plumber / Trades Professional)

- [x] Plumbing, Electrical Work in Trades
- [x] HVAC in Trades
- [x] Referral Partners in Seeking Opportunities
- [x] Dependable, Detail-Oriented in Qualities

### Carlos (Solo Business Owner)

- [x] Handyman Services, Pressure Washing in Home Services
- [x] Small Business Owners in Offering Audiences
- [x] Customers, Referral Partners in Seeking Opportunities
- [x] Entrepreneurship in Business & Management

### Dr. Chen (Healthcare Professional)

- [x] Patient Care, Clinical Research in Healthcare
- [x] Mentorship, Speaking Opportunities in Seeking Opportunities
- [x] Medicine, Public Health in Education Fields

---

## 8. Version History

| Version | Date       | Author        | Changes                                                                                                                                                                                                                                                                                                          |
| ------- | ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-02-10 | Personus team | Initial taxonomy with ~600 skills across 16 categories, ~35 qualities (VIA + professional), ~30 values (Schwartz + professional), ~200 interests across 14 categories, 184 languages (ISO 639-1), ~100 education fields (ISCED-F), ~25 seeking opportunities, 6 focus area domains, 6 offering types + audiences |

---

## Appendix: Taxonomy Statistics (v1.0)

| Taxonomy              | Categories | Total values | Primary source              |
| --------------------- | ---------- | ------------ | --------------------------- |
| Skills                | 16         | ~600         | ESCO + O\*NET + marketplace |
| Qualities             | 7          | ~36          | VIA Character Strengths     |
| Values                | 5          | ~30          | Schwartz Basic Values       |
| Seeking Opportunities | 4          | ~25          | BNI + marketplace           |
| Interests             | 14         | ~200         | Wikidata + Wikipedia        |
| Focus Area Domains    | 1          | 6            | Personus design             |
| Offering Types        | 2          | ~17          | Personus design             |
| Languages             | 1          | ~186         | ISO 639-1                   |
| Education Fields      | 11         | ~100         | ISCED-F 2013                |
