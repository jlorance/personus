---
type: guide
title: "[Suite Name] — [Spec Title]"
description: "[2-3 sentence overview. What this spec covers and why it matters. No pitch — just enough context for an implementor to understand intent.]"
status: current
tags: [_templates]
---

# [Suite Name] — [Spec Title]

> Date: YYYY-MM-DD
> Status: Draft
> Depends on: `00-prd.md`, [other specs]
> Primary actors: [who uses this — User, CO, CM, Visitor, AI Agent]

[2-3 sentence overview. What this spec covers and why it matters. No pitch — just enough context for an implementor to understand intent.]

---

## [N]. Feature Name

### Overview

[2-3 sentences. What this feature does and why the user needs it.]

### Wireframe

```
┌─────────────────────────────────────────────────────────┐
│ ASCII wireframe showing layout, key elements, actions    │
│ Include states: empty, loading, populated, error         │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/(dashboard)/[route]/page.tsx           ← Server Component (data fetching)
  └─ components/[feature]-client.tsx       ← Client Component ("use client")
       ├─ components/[sub-component].tsx   ← Presentational
       └─ calls: app/actions/[feature].ts  ← Server Actions
            └─ reads/writes: lib/db/schema/[table].ts
```

[Note which components already exist and which are new. Reference file paths and line numbers where applicable.]

### Workflows & Stories

Each workflow represents a complete user journey through this feature. Workflows decompose into **stories** — the atomic units of work that become Linear issues.

```
Workflow (user journey — lives in spec as context)
  └─ Story (testable unit of work — becomes a Linear issue)
       ├─ User requirement: what the user needs to accomplish
       ├─ Functional requirement: what the system must do
       └─ Technical requirement: what code changes are needed
```

---

#### Workflow: [Actor] [verb phrase — what they accomplish]

**Preconditions:**
- [What must be true before this workflow starts]
- [Auth state, data state, feature flags, tier requirements]

**Stories:**

**[W.1] [Short story title]**
> [Actor] [does what] so that [why]

- **User:** [Who is doing this, in what state]
- **Functional:** [What the system does — visible behavior, data changes, notifications]
- **Technical:** [Files touched, actions called, schema used — reference existing code paths]
- **Acceptance criteria:**
  - [ ] [Verifiable condition — becomes a test assertion]
  - [ ] [Verifiable condition]
  - [ ] [Verifiable condition]
- **Failure paths:**
  - If [condition]: [what the user sees, what the system does]

**[W.2] [Next story title]**
> [Actor] [does what] so that [why]

- **User:** ...
- **Functional:** ...
- **Technical:** ...
- **Acceptance criteria:**
  - [ ] ...
- **Failure paths:**
  - ...

[Continue for each story in the workflow. A workflow typically has 3-7 stories.]

**Workflow success:** [What's true when all stories are complete — the end-to-end outcome]

---

#### Workflow: [Next workflow...]

[Repeat for each distinct user journey in this feature. Aim for 2-4 workflows per feature section.]

---

### Schema

```typescript
// Copy-paste ready for lib/db/schema/[file].ts
// Include table definition, indexes, and relations
// If modifying existing schema, note: "Adds to lib/db/schema/[file].ts line [N]"

export const tableName = pgTable('table_name', {
  // columns...
}, (table) => [
  // indexes...
]);
```

### Server Actions

```typescript
// Full signatures with input/output types
// Note: "New action" or "Modifies existing app/actions/[file].ts"
// Include auth requirements as comments

actionName(input: { ... }): Promise<{ ... }>
// [Role] required. [What it does in one line.]
```

### Validation

```typescript
// Zod schemas for lib/validations/[file].ts
// Shared between server actions and form components

export const featureSchema = z.object({
  // fields...
});
```

### Edge Cases

- [ ] [What happens when X is empty/null/missing?]
- [ ] [What happens when the user doesn't have permission?]
- [ ] [What happens with concurrent operations?]
- [ ] [What happens at tier/quota limits?]
- [ ] [What happens when referenced data is deleted?]

### Migration Notes

[Only if this spec modifies existing schema. Call out:]
- Which tables/columns are added, renamed, or removed
- Whether this is additive (safe) or destructive (needs data migration)
- Any backfill logic needed for existing rows

### Test Criteria

**Unit tests** (from story acceptance criteria):
- [Server action returns correct result for valid input]
- [Server action rejects invalid input with correct error]
- [Permission check denies unauthorized access]

**Integration tests** (from workflow sequences):
- [Multi-step workflow produces correct DB state]
- [Related data cascades correctly on delete]

**E2E tests** (from workflow steps — 1:1 with Playwright scenarios):
- [Workflow: Actor completes journey → verify each story's acceptance criteria in sequence]

### Implementation Order

1. [Schema/migration — what tables need to exist first]
2. [Server actions — in dependency order]
3. [UI components — page, then interactive pieces]
4. [Wiring — connect components to actions]
5. [Tests — unit first, then integration, then E2E]

[Number every step. Note dependencies: "requires step 3". Each step should map to one or more stories.]

---

## Appendix: Linear Issue Mapping

When the spec is approved, stories map to Linear issues:

| Story ID | Linear Issue Title | Labels | Blocked By | Estimate |
|----------|--------------------|--------|------------|----------|
| [W.1] | [Story title — imperative form] | `[suite]`, `[feature]` | — | — |
| [W.2] | [Story title — imperative form] | `[suite]`, `[feature]` | W.1 | — |

**Conventions:**
- Story IDs use `[Workflow#].[Story#]` format (e.g., `1.3` = workflow 1, story 3)
- Issue titles are imperative: "Implement persona creation wizard step 1" not "User creates persona"
- Labels include the spec suite (`personas`, `communities`) and feature area (`crud`, `visibility`, `search`)
- Blocked By reflects story dependencies — matches implementation order
- Estimates are filled in during implementation planning, not during spec writing
