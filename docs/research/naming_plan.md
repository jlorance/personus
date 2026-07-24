---
type: research
title: "Naming Plan: Profile, Personas, and Attributes"
description: "Users should understand that building a rich Profile is the investment. Creating Personas is the payoff — each one selects and presents exactly what's relevant for a given context."
status: current
tags: [research]
timestamp: 2026-02-10
---

# Naming Plan: Profile, Personas, and Attributes

> Status: Draft for review
> Date: 2026-02-10
> Context: Pre-launch, no production database. All changes are greenfield.

## Core Mental Model

> **Your Profile is everything about you — exhaustive, private, and always growing.**
> **Personas are lenses — curated views you choose to share with the world.**

Users should understand that building a rich Profile is the investment. Creating Personas is the payoff — each one selects and presents exactly what's relevant for a given context.

---

## 1. Top-Level Terminology

| Concept                                | Term                    | User-facing explanation                                                                                         |
| -------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Master collection of all attributes    | **Profile**             | "Your Profile is your complete self — skills, experience, qualities, offerings, and more. It's private to you." |
| A curated view for a specific audience | **Persona**             | "A Persona is a lens on your Profile. Choose what to share, with whom."                                         |
| Individual attribute items             | _(no collective noun)_  | Users see specific labels: "skills", "experience", etc. Never "traits" or "attributes."                         |
| Internal DB/code term for attributes   | `traits` (JSONB column) | Never surfaced to users.                                                                                        |

---

## 2. Field Naming

### Profile-Level Fields (the exhaustive collection)

#### Foundations — who you are

| Field        | User-facing label | Code field    | Data type                     | Notes         |
| ------------ | ----------------- | ------------- | ----------------------------- | ------------- |
| Display Name | **Name**          | `displayName` | `string`                      |               |
| Headline     | **Headline**      | `headline`    | `string`                      | Short tagline |
| Location     | **Location**      | `location`    | `string` or `PersonaLocation` |               |
| Languages    | **Languages**     | `languages`   | `Language[]`                  |               |

#### Capabilities — what you can do

| Field          | User-facing label  | Code field       | Data type         | Notes                                                                                      |
| -------------- | ------------------ | ---------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| Skills         | **Skills**         | `skills`         | `Skill[]`         | Concrete, measurable, endorsable. Has proficiency + years.                                 |
| Qualities      | **Qualities**      | `qualities`      | `string[]`        | Personal differentiators — how you work, not what you do. Replaces `distinctiveStrengths`. |
| Experience     | **Experience**     | `experience`     | `Employment[]`    | Replaces `employment`. User-facing label was already "Work Experience" in some places.     |
| Education      | **Education**      | `education`      | `Education[]`     |                                                                                            |
| Certifications | **Certifications** | `certifications` | `Certification[]` |                                                                                            |

**Skills vs. Qualities distinction:**

- **Skills** = what you CAN do (Python, project management, carpentry) — structured, endorsable
- **Qualities** = how you DO it (patient teacher, bridge-builder, calm under pressure) — freeform tags

#### Direction — where you're headed

| Field       | User-facing label | Code field             | Data type     | Notes                                                                                                                                  |
| ----------- | ----------------- | ---------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Interests   | **Interests**     | `interests`            | `Interest[]`  | Replaces `hobbies`. More universal term (Bumble, Tinder, CMB all use it).                                                              |
| Values      | **Values**        | `values`               | `string[]`    |                                                                                                                                        |
| Open To     | **Looking For**   | `seekingOpportunities` | `string[]`    | What you're seeking — "consulting gigs", "board positions", "co-founder". Renamed from `openTo` for clarity alongside new `offerings`. |
| Focus Areas | **Focus Areas**   | `focusAreas`           | `FocusArea[]` | Array at Profile level. Replaces `currentFocus` (was a single string). See section 4.                                                  |

#### Offerings — what you have to give

| Field     | User-facing label | Code field  | Data type    | Notes                                                                 |
| --------- | ----------------- | ----------- | ------------ | --------------------------------------------------------------------- |
| Offerings | **What I Offer**  | `offerings` | `Offering[]` | **New field.** Mentorship, advice, resources, support. See section 5. |

---

## 3. Category Grouping (for UI sections)

### On Profile edit screens

```
FOUNDATIONS          — Name, Headline, Location, Languages
CAPABILITIES         — Skills, Qualities, Experience, Education, Certifications
DIRECTION            — Values, Interests, Looking For, Focus Areas
OFFERINGS            — What I Offer (mentorship, advice, resources, support)
```

### On Persona edit screens

Same categories, but the user is selecting/filtering from their Profile:

- "Which skills does this persona show?"
- "Which focus area does this persona highlight?"
- "What offerings does this persona advertise?"

Plus persona-specific settings:

- Contact Preferences (per-persona, inherits from Profile defaults)
- Visibility (public / authenticated / connections / group)

---

## 4. Focus Areas (Profile-level → Persona-level)

### Why an array, not a single string

A person has multiple concurrent focuses across life domains:

```typescript
interface FocusArea {
  domain: string; // e.g., "professional", "social impact", "learning", "creative"
  description: string; // e.g., "Building AI-native social tools"
  active: boolean; // currently active or paused
}
```

**Profile** holds all focus areas (the exhaustive list).
**Persona** selects which to surface:

- "Professional Dev" persona → shows professional focus
- "Community Leader" persona → shows social impact focus
- A persona could show multiple if they overlap

### Suggested domain presets (not enforced)

- Professional
- Learning
- Creative
- Social Impact
- Community
- Personal
- _(custom)_

---

## 5. Offerings (New Field)

### Structure

```typescript
interface Offering {
  type: 'mentorship' | 'advice' | 'service' | 'resource' | 'support' | 'other';
  description: string; // "React & TypeScript mentoring for junior devs"
  availability?: string; // "2hrs/week", "by appointment", "ongoing"
  audience?: string; // "junior developers", "local community", "anyone"
}
```

### Relationship to existing fields

| Field         | Answers               | Example                                        |
| ------------- | --------------------- | ---------------------------------------------- |
| Skills        | "What can you do?"    | "I know Python"                                |
| Qualities     | "How do you do it?"   | "I'm a patient teacher"                        |
| **Offerings** | "What will you give?" | "I'll mentor junior devs in Python, 2hrs/week" |
| Looking For   | "What do you want?"   | "I'm seeking a co-founder"                     |

Offerings bridges skills and intent — it's the active commitment to share what you know/have.

### Future extensibility

The `type` field accommodates future categories:

- `"resource"` → lending physical items, sharing tools/spaces
- `"service"` → pro-bono work, volunteer availability
- `"support"` → emotional support roles, community organizing

---

## 6. Contact Preferences (GDPR-Inspired)

### Replaces `contactPolicy`

The current `contactPolicy: "open" | "mediated" | "closed"` is replaced by a structured, purpose-bound consent model inspired by GDPR categories.

### Categories

**Discovery** — controls who can find this persona

| Key                     | Label                  | Options                                            | Default         |
| ----------------------- | ---------------------- | -------------------------------------------------- | --------------- |
| `searchVisibility`      | Search Visibility      | `public` / `authenticated` / `connections` / `off` | `authenticated` |
| `aiMatching`            | AI-Powered Matching    | `on` / `off`                                       | `off`           |
| `endorsementVisibility` | Endorsement Visibility | `show_all` / `count_only` / `hide`                 | `show_all`      |

**Contact** — controls who can reach out

| Key                  | Label                           | Options                                            | Default         |
| -------------------- | ------------------------------- | -------------------------------------------------- | --------------- |
| `directMessages`     | Direct Messages                 | `anyone` / `connections` / `group_members` / `off` | `connections`   |
| `connectionRequests` | Connection Requests             | `open` / `require_intro` / `off`                   | `require_intro` |
| `opportunityContact` | Recruiter / Opportunity Contact | `on` / `off`                                       | `off`           |

**Data Sharing** — controls what flows beyond Personus

| Key                      | Label                    | Options                | Default |
| ------------------------ | ------------------------ | ---------------------- | ------- |
| `groupAdminVisibility`   | Group Admin Visibility   | per-group at join time | `off`   |
| `thirdPartyIntegrations` | Third-Party Integrations | per-integration        | `off`   |
| `analyticsContribution`  | Analytics Contribution   | `on` / `off`           | `off`   |

**Communication** — controls how Personus notifies you

| Key                     | Label                  | Options                     | Default     |
| ----------------------- | ---------------------- | --------------------------- | ----------- |
| `activityNotifications` | Activity Notifications | `all` / `important` / `off` | `important` |
| `coachNudges`           | Coach Suggestions      | `on` / `off`                | `on`        |

### Inheritance Model

```
Profile defaults  →  Persona overrides  →  Group restrictions
         │                    │                     │
    Set once as          Can widen OR          Can only narrow
    baseline             narrow per            (never expand
                         persona               beyond persona)
```

### Data Model

```typescript
interface ContactPreferences {
  discovery: {
    searchVisibility: 'public' | 'authenticated' | 'connections' | 'off';
    aiMatching: boolean;
    endorsementVisibility: 'show_all' | 'count_only' | 'hide';
  };
  contact: {
    directMessages: 'anyone' | 'connections' | 'group_members' | 'off';
    connectionRequests: 'open' | 'require_intro' | 'off';
    opportunityContact: boolean;
  };
  dataSharing: {
    analyticsContribution: boolean;
    // thirdPartyIntegrations and groupAdminVisibility are per-entity, stored separately
  };
  communication: {
    activityNotifications: 'all' | 'important' | 'off';
    coachNudges: boolean;
  };
}
```

### Schema Changes

- **`users` table**: add `defaultContactPreferences` JSONB column (profile-level defaults)
- **`personas` table**: rename `contactPolicy` → `contactPreferences` JSONB column
- Persona `contactPreferences` merges with user defaults at read time (persona values win where set)
- `persona_group_memberships`: add `contactOverrides` JSONB for group-level restrictions

---

## 7. Type Definition Changes

### New/Renamed Types in `types/index.ts`

```typescript
// Renamed: Hobby → Interest
interface Interest {
  name: string;
  category?: string; // "Sports", "Creative", "Technology", etc.
  description?: string;
}

// New: replaces distinctiveStrengths (was string[], now typed)
// Qualities remain string[] — simple freeform tags

// Renamed: Employment → Experience (type name only, fields unchanged)
interface Experience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  location?: string;
}

// New
interface FocusArea {
  domain: string;
  description: string;
  active?: boolean;
}

// New
interface Offering {
  type: 'mentorship' | 'advice' | 'service' | 'resource' | 'support' | 'other';
  description: string;
  availability?: string;
  audience?: string;
}

// Updated Traits
interface Traits {
  skills?: Skill[];
  qualities?: string[]; // was distinctiveStrengths
  experience?: Experience[]; // was employment
  education?: Education[];
  certifications?: Certification[];
  interests?: Interest[]; // was hobbies
  values?: string[];
  languages?: string[];
  seekingOpportunities?: string[]; // was openTo
  focusAreas?: FocusArea[]; // was currentFocus (string)
  offerings?: Offering[]; // new
  [key: string]: any;
}
```

---

## 8. Completeness Scoring (Revised)

Updated weights reflecting the new fields:

| Field                | Max Points | Scoring                                                                |
| -------------------- | ---------- | ---------------------------------------------------------------------- |
| headline             | 15         | 10 if present, 15 if >= 20 chars                                       |
| skills               | 20         | 5 per skill, max 20                                                    |
| qualities            | 10         | 3 per quality, max 10 (was 15 for distinctiveStrengths)                |
| values               | 8          | 3 per value, max 8                                                     |
| seekingOpportunities | 8          | 3 per item, max 8                                                      |
| offerings            | 12         | 4 per offering, max 12 (new, high weight — this is the differentiator) |
| focusAreas           | 7          | 7 if at least one active focus area                                    |
| location             | 10         | 10 if present                                                          |
| contactPreferences   | 10         | 8 if using defaults, 10 if customized                                  |
| **Total**            | **100**    |                                                                        |

---

## 9. Files to Change

Since there is no production database, all changes are direct renames/rewrites:

| File                                           | Changes                                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `types/index.ts`                               | Rename types, add new interfaces, update Traits                                                 |
| `lib/db/schema.ts`                             | Rename `contactPolicy` → `contactPreferences` (JSONB), add `defaultContactPreferences` to users |
| `lib/personas/completeness.ts`                 | Update field names, scoring weights, suggestion text                                            |
| `app/(dashboard)/personas/[uri]/edit/page.tsx` | Update section titles, field names, add Offerings + Focus Areas UI                              |
| `app/(dashboard)/personas/[uri]/page.tsx`      | Update display labels                                                                           |
| `app/(dashboard)/dashboard/page.tsx`           | Update badge displays                                                                           |
| `components/coach-chat.tsx`                    | Update tip badges                                                                               |
| `lib/mastra/agents/persona-coach.ts`           | Update agent instructions and field references                                                  |
| `lib/mastra/tools.ts`                          | Update tool field names                                                                         |
| `app/actions/personas.ts`                      | Update server action field references                                                           |
| `app/actions/coach.ts`                         | Update coach action field references                                                            |
| `docs/foundation/data-model.md`                | Update data model spec                                                                          |
| `docs/foundation/at-protocol.md`               | Align lexicon field names                                                                       |

---

## 10. Commerce Persona Implications

The naming plan is designed to extend beyond professional networking. A **Commerce Persona** uses the same architecture:

| Professional Persona | Commerce Persona                           |
| -------------------- | ------------------------------------------ |
| Skills, Experience   | Size/fit, brand preferences                |
| Values, Interests    | Sustainability prefs, dietary restrictions |
| Offerings            | — (not applicable)                         |
| Looking For          | Shopping goals, wish lists                 |
| Focus Areas          | Current shopping priorities                |
| Contact Preferences  | Agent authorization + data sharing consent |

The `[key: string]: any` extensibility on `Traits` means commerce-specific trait types (shipping, budget, dietary, size) can be added via new `trait_metadata` rows without changing the core type definitions. Commerce traits would be new categories alongside `professional`, `personal`, and `business`:

- `commerce_shipping`
- `commerce_preferences`
- `commerce_dietary` (GDPR Article 9 — special category)
- `commerce_authorization` (agent delegation scope)

See `docs/research/agentic_commerce_integration.md` for the full commerce persona attribute schema and privacy tier mapping.

---

## 11. Migration Approach

No database exists yet. No backward compatibility needed.

1. Update `types/index.ts` with all renamed/new interfaces
2. Update `lib/db/schema.ts` with column changes
3. Find-and-replace field names across all files (see list above)
4. Update completeness scoring algorithm
5. Update coach agent instructions to reference new field names
6. Update AT Protocol design doc lexicons to match
7. Run `bun run type-check` and `bun run lint` to verify
8. Run `bun run build` to confirm everything compiles
