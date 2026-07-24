---
type: spec
title: "Identity & Personas -- Editing Patterns"
description: "This spec defines the standard editing UX patterns for Personus. All feature specs that involve editing should reference this document rather than defining their own editing behavior. This keeps…"
status: current
tags: [personas]
timestamp: 2026-02-23
---

# Identity & Personas -- Editing Patterns

> Date: 2026-02-23
> Status: Proposed
> Scope: App-wide — applies to all editing surfaces (personas, communities, settings, traits, profiles)
> Depends on: `docs/foundation/vision.md`, `docs/patterns/ui-components.md`

This spec defines the standard editing UX patterns for Personus. All feature specs that involve editing should reference this document rather than defining their own editing behavior. This keeps the editing experience consistent across the app and avoids conflicting patterns in individual specs.

---

## 1. Research Summary

Consumer app editing patterns fall into five categories. We studied LinkedIn, Instagram, X/Twitter, Threads, Bumble, Hinge, Discord, Notion, Apple Contacts, and Google Contacts.

### 1.1 Pattern Inventory

| Pattern | How It Works | Apps | Best For |
|---------|-------------|------|----------|
| **Section-level editing** | Read-only profile with pencil icons per section. Tap opens a full-screen form scoped to that section. Each section saves independently. | LinkedIn | Complex, heterogeneous data (skills, experience, offerings are all different shapes) |
| **Single edit page** | "Edit Profile" button opens one scrollable form with all fields. Single Save/Done button. | Instagram, X/Twitter, Threads | Simple metadata (name, bio, avatar, links) — everything fits on one screen |
| **Card-based WYSIWYG** | Edit view mirrors the public view. Tap a card to edit it in-place. User sees exactly what others see. | Bumble, Hinge | When the profile IS the product — user needs to see what viewers will see |
| **Settings-style list** | List of labeled fields. Tap a field to open its own sub-screen or inline editor. | Discord, Apple Contacts, Google Contacts | Flat key-value data (display name, pronouns, about me) |
| **Auto-save / no edit mode** | Everything is always editable. Changes save continuously. No Save button. | Notion | Content/productivity tools. **Not used by any social/identity app.** |

### 1.2 Universal Mobile Patterns

These patterns are consistent across every app studied:

1. **Full-screen editing on mobile.** No app uses modals, popovers, or bottom sheets for the primary edit flow. Bottom sheets are only used for secondary actions (change photo: camera vs gallery).
2. **Save/Done in top-right corner.** iOS convention that all cross-platform apps follow. iOS apps use "Done"; Android and cross-platform apps use "Save".
3. **Pencil icon as entry point.** LinkedIn, Hinge, Bumble, Discord, Apple/Google Contacts. Instagram and X use a text button ("Edit Profile") instead.
4. **Sectioned forms with full-width fields.** Vertically stacked, full-width inputs with section headers. No multi-column layouts on phones.
5. **Character counts for constrained fields.** Instagram (bio: 150), X (bio: 160), LinkedIn (headline: 220) all show live character counters.
6. **No draft state for profiles.** Unlike posts, profile edits are binary: saved or discarded.

### 1.3 Unsaved Changes Behavior

Most apps handle this poorly. Current landscape:

| Behavior | Apps | Notes |
|----------|------|-------|
| **Warn before discarding** | Discord (desktop only) | Sticky bar: "Careful — you have unsaved changes!" Missing on mobile (known user complaint). |
| **Silently discard on back** | Instagram, X/Twitter | Instagram's own help pages warn users to tap "Done", not the back arrow. |
| **No discard possible (auto-save)** | Notion | Not applicable to profile editing. |
| **Save-on-back-navigation** | Hinge | Most changes persist on back tap, feels automatic. |

**Best practice** (GitHub Primer, Oracle design systems): Show a confirmation dialog with verb-based labels ("Discard Changes" / "Keep Editing") rather than generic "Yes" / "No".

---

## 2. Recommended Patterns for Personus

### 2.1 Editing Model: Section-Level Editing

Personus profiles (personas, communities) have heterogeneous sections — foundations, skills, values, offerings, focus areas, community traits. These are all different data shapes. A single massive form is overwhelming on mobile.

**Adopt LinkedIn's section-level editing pattern:**
- The detail/view page is the primary surface. Each section has a pencil/edit affordance.
- Tapping edit on a section opens a **focused editor** for that section only.
- Each section saves independently — editing skills does not require saving your headline.
- On mobile, the focused editor is full-screen. On desktop, it can be a full-screen overlay or an inline expansion (TBD per section complexity).

**Why not a single edit page?** Personas have 5+ trait categories, each with different editing UIs (tag inputs, timeline editors, multi-item forms). Putting them all on one page with two separate Save buttons creates confusion about what gets saved when. Section-level editing eliminates this ambiguity.

**Why not auto-save?** Identity data is consequential — changing your headline or removing a skill affects what others see. Users should have an explicit moment of "yes, save this." Auto-save is appropriate for content tools (Notion), not identity.

### 2.2 Save Behavior

| Rule | Detail |
|------|--------|
| **Explicit save, always** | Every editing surface has a visible Save/Done button. No auto-save for profile data. |
| **Button label** | "Save" for section editors. "Done" for simple pickers (layout preset, visibility). |
| **Button position** | Top-right on mobile (following iOS/cross-platform convention). Bottom of form on desktop (or both). |
| **Loading state** | Button shows spinner + "Saving..." text. Form fields disabled during save. |
| **Success feedback** | Toast via sonner: "[Section] saved" (e.g., "Skills saved", "Foundations saved"). |
| **Error feedback** | Inline validation errors under fields. Toast for server errors. Form remains editable for retry. |

### 2.3 Unsaved Changes

Doing this right is a differentiator — most consumer apps fail here.

| Scenario | Behavior |
|----------|----------|
| User taps Save/Done | Changes persisted. Toast confirmation. Editor closes. |
| User taps Back/Cancel with changes | **Confirmation dialog**: "You have unsaved changes. Discard them?" with [Discard] and [Keep Editing] buttons. Verb-based labels, not "Yes"/"No". |
| User taps Back/Cancel with no changes | Editor closes immediately, no dialog. |
| Browser/tab close with changes | `beforeunload` browser warning (best-effort — does not cover Next.js client navigation). |
| Network error during save | Error toast. Form stays open with all data preserved. User can retry. |

### 2.4 Mobile Considerations

| Guideline | Detail |
|-----------|--------|
| **Full-screen editors** | Section editors take the full screen on mobile. No modals, bottom sheets, or popovers for primary editing. |
| **Bottom sheets for secondary actions** | Photo picker (camera vs gallery), emoji picker, visibility selector can use bottom sheets. |
| **Touch targets** | All tappable elements (edit icons, save buttons, remove buttons) meet 44x44pt minimum. |
| **Keyboard management** | Text inputs auto-scroll into view above the keyboard. Save button remains accessible (sticky footer or scrollable). |
| **No multi-column forms** | Single-column layout for all form fields on screens under 768px. |
| **Character counters** | Show live character count for constrained fields (headline: 300, location: 100, tagline: 120). |

### 2.5 Entry Points

Standard entry points for editing across the app:

| Entry | Affordance | Behavior |
|-------|-----------|----------|
| **Section pencil icon** | Small pencil icon in section header, right-aligned | Opens focused editor for that section |
| **"Edit" button** | Text button or outlined button in page header | Opens the primary edit surface (foundations for personas, settings for communities) |
| **Coach suggestion** | Coach chat message with a deep link | Opens the specific section editor the coach is referencing |
| **Inline "Add" buttons** | "+ Add Skill", "+ Add Offering" within a section | Opens that section's editor, scrolled/focused to the add form |

---

## 3. Pattern Application Guide

How each editing surface in Personus maps to these patterns:

### 3.1 Persona Editing

| Section | Data Shape | Editor Type | Save Scope |
|---------|-----------|-------------|------------|
| **Foundations** (name, headline, location, type, visibility, initial, layout preset) | Flat fields, selects, chips | Single form | All foundations fields together |
| **Skills** | Array of `{name, proficiency}` + traits awareness | Tag input + traits picker | Skills only |
| **Qualities / Values / Seeking** | String arrays + traits awareness | Tag input + traits picker | Per-category |
| **Experience** | Array of timeline entries | Timeline editor (multi-item form) | Experience only |
| **Education** | Array of timeline entries | Timeline editor (multi-item form) | Education only |
| **Focus Areas** | Array of `{domain, description, active}` | Multi-item form | Focus areas only |
| **Offerings** | Array of `{type, description, ...}` | Multi-item form + traits picker | Offerings only |

### 3.2 Community Editing

| Section | Editor Type | Save Scope |
|---------|-------------|------------|
| **General settings** (name, description, tagline, type, visibility, join policy) | Single form | All settings together |
| **Community traits** | Dynamic form from `communityTraitSchema` | Traits only |
| **Member trait schema** | Schema builder | Schema only |
| **Appearance** (banner, icon, accent color) | Media uploader + color picker | Appearance only |
| **Danger zone** (archive, delete, transfer) | Confirmation dialogs | Per-action |

### 3.3 User Settings

| Section | Editor Type | Save Scope |
|---------|-------------|------------|
| **Account** (email, phone, auth methods) | Per-field with verification flows | Per-field |
| **Your traits** (master trait collection) | Same section editors as personas | Per-category |
| **Contact preferences** | Toggle/select form | All preferences together |
| **MCP exposure** | Toggle/select form | All MCP settings together |
| **Import** (LinkedIn, CSV) | Upload + review flow | Per-import |

---

## 4. Shared Components

These components implement the patterns above and are reused across all editing surfaces:

| Component | Purpose | Used By |
|-----------|---------|---------|
| `components/section-editor.tsx` | Wrapper that provides full-screen mobile behavior, Save/Done button, unsaved changes tracking, discard confirmation dialog | All section editors |
| `components/unsaved-changes-dialog.tsx` | "You have unsaved changes" confirmation with [Discard] / [Keep Editing] | `section-editor.tsx` |
| `components/pool-available-traits.tsx` | "Available from your traits" difference display with [+ Add] buttons | Persona trait editors |
| `components/layout-preset-picker.tsx` | 5-chip preset picker with entity-type suggestion | Persona foundations, creation wizard |
| `components/avatar-initial-editor.tsx` | 1-2 char initial editor with preview | Persona foundations |

---

## 5. Sources

- [LinkedIn Help — Edit your profile](https://www.linkedin.com/help/linkedin/answer/a546603)
- [Instagram Help — Editing Your Profile](https://help.instagram.com/936495066470190)
- [X Help — Customize your profile](https://help.x.com/en/managing-your-account/how-to-customize-your-profile)
- [Hinge — How do I edit my profile?](https://help.hinge.co/hc/en-us/articles/360011053094)
- [Bumble — Profile setup and editing](https://support.bumble.com/hc/en-us/sections/28055400878877)
- [Discord — How to Customize Your Profile](https://discord.com/blog/how-to-customize-your-discord-profile)
- [Discord — No "unsaved changes" warning on mobile](https://support.discord.com/hc/en-us/community/posts/360030130591)
- [Apple — Edit contacts on iPhone](https://support.apple.com/guide/iphone/edit-contacts-iph89a9c71d8/ios)
- [Google — Edit or delete contacts](https://support.google.com/contacts/answer/7280886)
- [GitHub Primer — Saving Patterns](https://primer.style/ui-patterns/saving/)
- [NN/g — Cancel vs Close](https://www.nngroup.com/articles/cancel-vs-close/)
- [Mobbin — Mobile Editing Profile Flows](https://mobbin.com/explore/mobile/flows/editing-profile)
