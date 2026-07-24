---
type: spec
title: Communities — Community Lifecycle
description: "This spec covers the full lifecycle of a community: create, configure, edit, and archive/delete. Everything a CO does to set up and maintain the community itself (not its members — that's…"
status: current
tags: [communities]
timestamp: 2026-02-23
---

# Communities — Community Lifecycle

> Date: 2026-02-23
> Status: Draft
> Depends on: `00-prd.md`
> Primary actor: Community Organizer (CO)

This spec covers the full lifecycle of a community: create, configure, edit, and archive/delete. Everything a CO does to set up and maintain the community itself (not its members — that's `02-membership.md`).

---

## 1. Create a Community

### 1.1 Entry Points

| Entry Point | Route | Context |
|-------------|-------|---------|
| Dashboard "Create" button | `/communities/new` | From main dashboard or My Communities |
| Explore page "Create New" | `/communities/new` | From Explore page header |
| Direct URL | `/communities/new` | Shared link |

### 1.2 Creation Wizard (Existing — Enhancement Needed)

The 3-step wizard exists (`app/(dashboard)/communities/new/wizard-client.tsx`). Current state:

**Step 1: Choose Type** — Grid of 9 type cards with icon, name, description, default join policy badge. Works well.

**Step 2: Quick Setup** — Name, description, tags, visibility, join policy. Creates the community.

**Step 3: Success** — Confirmation with "What's next?" guidance and navigation.

### 1.3 Wizard Enhancements

The current wizard is a solid MVP. Enhancements to add:

**Step 2 additions:**
- **Profile image or emoji** — Upload a photo/logo, or pick an emoji (currently hardcoded to type icon). Profile image makes the community feel real; emoji is the quick fallback.
- **Tagline** — Optional short one-liner (120 chars). Separate from description — shown on cards and the public page header.
- **Community traits form** — Auto-generated from the selected type's `communityTraitSchema`. For a Club, this means fields like "activities", "location", "meetingFrequency", "skillLevel". For a Guild, this means "primarySkills", "serviceArea", "responseCommitment". These are the community's own profile fields. Optional at creation time (can be filled in settings later), but showing them early helps COs think about their community's identity.

**Step 3 additions:**
- **Quick invite** — Generate and display an invite link immediately (see `05-invitations.md`)
- **Connect platforms** — "Connect Discord" / "Connect Slack" quick-start buttons (see `09-integrations-ui.md`)
- Navigation to community dashboard (not just back to main dashboard)

### 1.4 Server Action: `createCommunity`

**Existing.** Validates with Zod, generates slug, inserts community, adds creator as admin member with their first persona, logs activity.

**Enhancement needed:** Accept optional `traits` object (validated against the type's `communityTraitSchema`), optional `icon` emoji string, optional `profileImageUrl`, and optional `tagline`.

### 1.5 Validation

**Existing** (`lib/validations/communities.ts`):
- `name`: 2-100 chars
- `description`: 10-1000 chars
- `communityType`: required, must match a type slug
- `tags`: max 10, each ≤50 chars
- `publicPresence.level`: private | discoverable | full
- `joinPolicy`: open | approval | invite_only

**To add:**
- `icon`: optional emoji string
- `profileImageUrl`: optional URL (from presigned upload)
- `tagline`: optional string, max 120 chars
- `traits`: optional JSONB, validated against the type's `communityTraitSchema`

---

## 2. Community Dashboard

After creation, the CO manages their community from a dashboard. This is the primary CO surface.

### 2.1 Route

`/communities/[slug]` — Community dashboard (authenticated, role-gated)

### 2.2 Layout

Tabbed layout with role-aware tab visibility. The action bar and CX chat are persistent across all tabs.

```
┌─────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░ banner image ░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
├─────────────────────────────────────────────────────────┤
│ [img] Community Name                     [type badge]    │
│       "Tagline here"                       [★ Favorite]  │
│ 👥 142 members  •  ⭐ 87 endorsements  •  🟢 Healthy   │
├─────────────────────────────────────────────────────────┤
│ [Post Notice] [Invite] [Share Link] [···]                │
├─────────────────────────────────────────────────────────┤
│ [Overview] [Members] [Notices] [Settings] [Analytics]    │
│                                                          │
│ (Guild adds: [Taxonomy] [Offerings] [Routing] [Apps])    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Tab content area                                         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ 💬 What are you looking for, or what can you offer?      │
│ [Ask the community coach...]                             │
└─────────────────────────────────────────────────────────┘
```

**Tab visibility by role:**

| Tab | Member | Steward | Admin |
|-----|--------|---------|-------|
| Overview | Yes | Yes | Yes |
| Members | Yes (read-only) | Yes (manage) | Yes (manage) |
| Notices | Yes | Yes | Yes |
| Settings | — | Partial | Full |
| Analytics | — | Yes | Yes |
| Guild tabs | Varies by tier | Yes | Yes |

### 2.3 Overview Tab

The default landing tab. Shows at-a-glance health:

| Section | What It Shows |
|---------|--------------|
| **Stats bar** | Member count, endorsement count, integration health badge |
| **Recent notices** | 3 most recent active notices (see `10-notices.md` §4.2) |
| **Recent activity** | Last 10 community events (joins, endorsements, searches, introductions) |
| **Community capability profile** | Top skills/capabilities among members (see `03-member-directory.md` §5) |
| **Unmet needs** | Traits searched for but not found (CO insight) |

### 2.4 Action Bar

The action bar sits between the header and the tabs — always visible regardless of which tab is active. It encourages community interaction by surfacing the most common actions a member would take.

```
┌─────────────────────────────────────────────────────────┐
│ [Post Notice] [Invite Someone] [Share Link] [···]        │
└─────────────────────────────────────────────────────────┘
```

Actions are role-aware — the bar shows different buttons depending on the member's role and the community's configuration:

| Action | Who Sees It | When | What It Does |
|--------|------------|------|-------------|
| **Post Notice** | All members (or CO-only, configurable) | Community allows notices | Opens the post notice form (see `10-notices.md` §3) |
| **Invite Someone** | All members | Community `allowMemberInvites` is true | Opens the invite flow (see `05-invitations.md`) |
| **Invite Someone** | Steward, Admin | Always | Opens the invite flow |
| **Share Link** | All members | Community is public or authenticated | Copies the public page URL (`/g/[slug]`) to clipboard, or opens a share sheet (native share API on mobile, copy + social buttons on desktop) |
| **Edit Settings** | Steward, Admin | Always | Navigates to Settings tab |
| **Connect Platform** | Admin | No integrations connected yet | Quick-start integration (see `09-integrations-ui.md`) |
| **Manage Members** | Steward, Admin | Always | Navigates to Members tab |

The `[···]` overflow menu holds less-frequent actions like Edit Settings, Connect Platform, and Manage Members — keeping the primary bar clean with the 2-3 most encouraging actions.

**Notice permissions:** Communities can configure who may post notices. Default: all members. COs can restrict to steward/admin only via `communities.settings.noticePolicy`:

| Value | Who Can Post |
|-------|-------------|
| `'all_members'` (default) | Any non-suspended member |
| `'stewards_and_admins'` | Steward or admin role only |

Stored as `communities.settings.noticePolicy` (string, default `'all_members'`).

**Member invite permissions:** Whether regular members can invite others. Default: depends on join policy.

| Join Policy | Default `allowMemberInvites` |
|-------------|---------------------------|
| `open` | `true` — anyone can share the join link |
| `approval` | `true` — members can invite, but invitees still need approval |
| `invite_only` | `false` — only steward/admin can invite |

COs can override the default in Settings. Stored as `communities.settings.allowMemberInvites` (boolean).

### 2.5 Share Link

When a member clicks "Share Link":

```
┌─────────────────────────────────────────────────────────┐
│ Share this community                                     │
│                                                          │
│ personus.ai/g/mill-valley-mtb                  [Copy ✓]  │
│                                                          │
│ [Twitter/X]  [LinkedIn]  [Bluesky]  [Email]              │
│                                                          │
│ Or share the directory:                                  │
│ personus.ai/g/mill-valley-mtb/directory        [Copy]    │
│ (Only shown if public directory is enabled)              │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
- On mobile: Uses the Web Share API (`navigator.share()`) for native sharing
- On desktop: Popover with copy-to-clipboard + social share buttons
- Social buttons compose a pre-filled post: "[Community Name] on Personus — [description snippet]"
- If the community has a public directory, a second URL is offered
- For private communities, Share Link is hidden (there's no public page to share)

### 2.6 Favorite / Star

Members can favorite a community for quick access. The star toggle appears in the community dashboard header.

```
[★ Favorited]  ←  click to unfavorite
[☆ Favorite]   ←  click to favorite
```

**Where favorites appear:**

1. **Main dashboard sidebar** — "Favorites" section above "My Communities," showing favorited community icons/names as quick links
2. **Mobile nav** — Favorited communities appear as icon shortcuts in the bottom bar or top of the communities list

```
┌───────────────────────────┐
│ Favorites                  │
│ [🏔️] Mill Valley MTB      │
│ [📸] Bay Area Photo        │
│                            │
│ My Communities              │
│ ...                        │
└───────────────────────────┘
```

**Schema:**

```typescript
export const communityFavorites = pgTable('community_favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_community_favorites').on(table.userId, table.communityId),
  index('idx_favorites_user').on(table.userId),
]);
```

**Server actions:**

```typescript
toggleCommunityFavorite(communityId: string): Promise<{ favorited: boolean }>
// Toggle favorite on/off for the current user. Must be a member of the community.

listFavoriteCommunities(userId: string): Promise<FavoriteCommunity[]>
// Returns user's favorited communities in order of when they were favorited.
```

**Limit:** Max 10 favorites per user. If at the limit, prompt: "You're at the max — unfavorite one to add another."

### 2.7 Community CX Chat

A persistent conversational interface at the bottom of the community dashboard. This is the community-scoped version of the Persona Coach — it encourages members to discover capabilities and offer their own.

**Why it's always there:** The chat box is the primary interaction nudge. Instead of hoping members click through tabs, the CX chat puts the most useful question front-and-center: "What are you looking for, or what can you offer?"

```
┌─────────────────────────────────────────────────────────┐
│ 💬 Community Coach                              [expand] │
│                                                          │
│ What are you looking for, or what can you offer?         │
│                                                          │
│ Suggestions:                                             │
│ [Who knows grant writing?]                               │
│ [I can help with photography]                            │
│ [Anyone going to the meetup?]                            │
│                                                          │
│ [Type a message...                              ] [Send] │
└─────────────────────────────────────────────────────────┘
```

**Collapsed state:** When not in use, the chat shows as a single-line input bar docked to the bottom of the dashboard: `💬 Ask the community coach...` — clicking expands it.

**Expanded state:** Full chat panel (right sidebar on desktop, bottom sheet on mobile) with:
- Message history for this community session
- Suggested prompts that rotate based on community context
- Results inline (member cards, notices, capability summaries)

**What it can do:**

| Intent | Example | What Happens |
|--------|---------|-------------|
| **Discover** | "Who knows electrical wiring?" | Runs `searchCommunityMembers` → shows member cards inline |
| **Offer** | "I can help with grant writing" | Suggests posting a notice (type: `offering`) → prefills the notice form |
| **Ask** | "Looking for collaborators for a project" | Suggests posting a notice (type: `looking_for`) → prefills the notice form |
| **Learn** | "What skills does this community have?" | Runs `getCommunityCapabilityProfile` → shows top skills summary |
| **Navigate** | "How do I invite someone?" | Explains the invite flow, offers a direct link to the action |

**Agent:** Uses the Community Coach agent (`lib/mastra/agents/community-coach.ts`) scoped to this community. The agent has access to `searchCommunityMembers`, `getCommunityCapabilityProfile`, and `listNotices` as tools — same as the bot commands in `03-member-directory.md` §7.

**Suggested prompts:** Generated contextually:
- New member (joined < 7 days): "Who shares my skills?", "What does this community offer?"
- Active member: "Anyone looking for [member's top skill]?", "Post an update"
- CO: "What skills are we missing?", "Who joined recently?"

**Privacy:** The chat is scoped to the community. It can only search members and traits within this community. It cannot access other communities, other personas, or global data. Message history is stored per-user per-community in `coach_sessions` with `communityId` context.

### 2.8 Server Actions Needed

```
getCommunity(slug: string)                    → Community with type info
getCommunityStats(communityId: string)        → member count, endorsement count, search count
getCommunityActivity(communityId: string)     → recent activity events (paginated)
getCommunityTopSkills(communityId: string)    → aggregated skill counts from member personas
toggleCommunityFavorite(communityId: string)  → toggle favorite on/off
listFavoriteCommunities(userId: string)       → user's favorited communities
```

---

## 3. Community Settings

### 3.1 Route

`/communities/[slug]/settings` — Settings page (admin only, steward partial)

### 3.2 Settings Sections

#### 3.2.1 General Settings

| Field | Type | Who Can Edit | Notes |
|-------|------|-------------|-------|
| Name | text | Admin | 2-100 chars |
| Description | textarea | Admin, Steward | 10-1000 chars |
| Icon | emoji picker | Admin, Steward | |
| Tags | tag input | Admin, Steward | Max 10, for discovery |
| Public Presence | select | Admin | private / discoverable / full (see §3.2.3) |
| Join Policy | select | Admin | open / approval / invite_only |
| Max Members | number | Admin | CO Base: 1,000 / CO Pro: 10,000 |
| Notice Policy | select | Admin | `all_members` / `stewards_and_admins` — who can post notices |
| Allow Member Invites | toggle | Admin | Whether regular members can invite others (see §2.4) |

#### 3.2.2 Community Traits Editor

Community-level traits are defined by the type's `communityTraitSchema`. These are the community's own profile fields — what the community itself is about.

```
┌─────────────────────────────────────────────────────────┐
│ Community Profile                                        │
│                                                          │
│ These describe your community to the world.              │
│                                                          │
│ Activities (tag input)                                   │
│ [hiking] [camping] [rock climbing] [+ add]               │
│                                                          │
│ Location (text)                                          │
│ [Mill Valley, CA                        ]                │
│                                                          │
│ Meeting Frequency (select)                               │
│ [Weekly ▾]                                               │
│                                                          │
│ Skill Level (select)                                     │
│ [All Levels ▾]                                           │
│                                                          │
│ Website (url)                                            │
│ [https://millvalleymtb.org              ]                │
│                                                          │
│ [Save Changes]                                           │
└─────────────────────────────────────────────────────────┘
```

**Rendering:** Fields are rendered dynamically from the type's `communityTraitSchema`. Each field in the schema specifies `type` (text, textarea, select, tag_input, url), `label`, `placeholder`, `required`, and `options` (for selects). The same metadata-driven rendering pattern used for persona traits applies here.

**Server action:**
```
updateCommunityTraits(communityId: string, traits: Record<string, unknown>)
```

Validates `traits` against the type's `communityTraitSchema`. Admin or steward role required.

#### 3.2.3 Public Presence (3 Tiers)

Every community chooses how visible it is to the outside world. This is a single setting with three tiers — not multiple toggles.

```
┌─────────────────────────────────────────────────────────┐
│ Public Presence                                          │
│                                                          │
│ How visible is your community to non-members?            │
│                                                          │
│ ○ Private                                                │
│   Only members know this community exists. No public     │
│   page, not listed in Explore. Members join by invite.   │
│   Good for: friend groups, private teams, family.        │
│                                                          │
│ ● Discoverable                                           │
│   Has a public page with your community's name, icon,    │
│   description, and a way to contact the organizer.       │
│   People can find you, but can't browse members.         │
│   Good for: clubs, social groups, local communities.     │
│                                                          │
│ ○ Full Profile                                           │
│   Everything in Discoverable plus a rich community       │
│   profile — top skills, recent notices, featured         │
│   members. Optionally, a browsable member directory.     │
│   Good for: guilds, professional networks, conferences.  │
│                                                          │
│ [Save Changes]                                           │
└─────────────────────────────────────────────────────────┘
```

**The three tiers:**

| Tier | Public Page | In Explore | Member Directory | Join CTA |
|------|------------|------------|-----------------|----------|
| **Private** | None — `/g/[slug]` returns 404 | No | No | Invite-only |
| **Discoverable** | Basic info: name, icon, description, location, tags, external links, contact CO | Yes | No | Yes (Join or Request) |
| **Full Profile** | Rich page: everything in Discoverable + top capabilities, recent notices, featured members, community stats | Yes | Optional (members-only or public) | Yes |

**Examples by community type:**

| Community | Type | Typical Tier | Why |
|-----------|------|-------------|-----|
| "Saturday Soccer Crew" | Friends | Private | No reason for strangers to find it |
| "Eastside Knitting Circle" | Club | Discoverable | Want new members to find them, but the value is showing up in person |
| "Portland Trail Running" | Club | Full Profile | Members showcase GPS routes, gear, and weekly runs — the public page helps recruit |
| "Maplewood Block 4" | Neighborhood | Discoverable | Neighbors can find and join, but member details are private |
| "Tri-County Trades Guild" | Guild | Full Profile + Public Directory | The "Find a Plumber" use case — visitors browse professionals |
| "React Portland Meetup" | Event | Full Profile | Attendees want to see who else is going and what skills are represented |

**When CO selects "Full Profile," additional settings appear:**

```
┌─────────────────────────────────────────────────────────┐
│ Full Profile Settings                                    │
│                                                          │
│ Member Directory                                         │
│ Who can browse individual members?                       │
│                                                          │
│ ● Members only                                           │
│   Only community members can browse and search the       │
│   directory. The public page still shows aggregate       │
│   info (top skills, member count) but not individuals.   │
│                                                          │
│ ○ Public                                                 │
│   Anyone can browse opted-in members. Great for          │
│   "Find a Professional" directories.                     │
│                                                          │
│ (When "Public" is selected:)                             │
│                                                          │
│ Directory URL:                                           │
│ personus.ai/g/tri-county-trades/directory    [Copy]      │
│                                                          │
│ Fields visible in public directory:                      │
│ ☑ Skills Offered                                         │
│ ☑ Location                                               │
│ ☑ Availability                                           │
│ ☐ Rate Range                                             │
│ ☑ Certifications                                         │
│                                                          │
│ Allow public search          [on/off]                    │
│ Show endorsement counts      [on/off]                    │
│                                                          │
│ [Save Changes]                                           │
└─────────────────────────────────────────────────────────┘
```

**Stored as:** `communities.settings.publicPresence` JSONB:

```typescript
{
  level: 'private' | 'discoverable' | 'full',

  // Only relevant when level is 'full':
  directory: {
    access: 'members' | 'public',     // Who can browse member directory
    allowSearch: boolean,              // Enable keyword search in directory
    showEndorsements: boolean,         // Show endorsement counts
    visibleFields: string[],           // Keys from memberTraitSchema (for public access)
  }
}
```

**Replaces:** The old `visibility` field (`public` / `authenticated` / `private`) and the old `publicDirectory` settings. This is a single, intuitive concept instead of two disconnected toggles.

**Migration mapping:** `visibility: 'private'` → `level: 'private'`. `visibility: 'public'` without `publicDirectory.enabled` → `level: 'discoverable'`. `visibility: 'public'` with `publicDirectory.enabled` → `level: 'full'`.

**Server action:**
```
updatePublicPresence(communityId: string, settings: PublicPresenceSettings)
```
Admin only. Changing from `full` to `discoverable` immediately hides the member directory from non-members but preserves all member `directoryOptIn` settings (they'll re-appear if CO switches back).

#### 3.2.4 Member Trait Schema Editor (Context Schema Builder)

COs define what members share when they join. This is the `memberTraitSchema` — initially populated from the community type's defaults, but customizable.

```
┌─────────────────────────────────────────────────────────┐
│ Member Schema — What members share                       │
│                                                          │
│ Define the fields members fill in when they join.        │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1. Skills Offered (tag_input)              [Edit] ↕ │ │
│ │    Required: Yes                                    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 2. Rate Range (text)                       [Edit] ↕ │ │
│ │    Required: No • Placeholder: "$50-100/hr"        │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 3. Availability (select)                   [Edit] ↕ │ │
│ │    Options: Full-time, Part-time, Weekends         │ │
│ │    Required: No                                    │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 4. Certifications (tag_input)              [Edit] ↕ │ │
│ │    Required: No                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [+ Add Field]                                            │
│                                                          │
│ Field count: 4 of 5 (Solo) / 10 (CO Base) / ∞ (CO Pro) │
│                                                          │
│ Preview:                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Shows what a member would see when joining           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Save Schema]                                            │
└─────────────────────────────────────────────────────────┘
```

**Add Field dialog:**

| Property | Input | Notes |
|----------|-------|-------|
| Label | text | "What do you want to call this field?" |
| Type | select | text, textarea, select, tag_input, number, url |
| Required | toggle | |
| Placeholder | text | |
| Options | tag input | Only for select type |
| Help text | text | Optional guidance for members |

**Server action:**
```
updateMemberTraitSchema(communityId: string, schema: MemberTraitSchemaField[])
```

Admin only. Validates field count against pricing tier. Schema changes don't retroactively remove data from existing members — fields that are removed become hidden but data persists.

#### 3.2.5 Danger Zone

| Action | Who | Details |
|--------|-----|---------|
| Transfer ownership | Admin (founding user) | Confirm with password. Transfers `foundingUserId` to another admin. |
| Archive / Close community | Admin (founding user) | See `11-community-closure.md` for the full lifecycle. |

**Transfer ownership** is the only danger-zone action handled in this spec. Archive and close are multi-step processes with grace periods, data export, and notifications — see `11-community-closure.md` for the complete workflow.

#### 3.2.6 Community Appearance

How a community looks. Visual identity drives emotional attachment — a community with a cover photo of their Saturday morning run feels like *their place*. An emoji and a text description feels like a database record.

```
┌─────────────────────────────────────────────────────────┐
│ Community Appearance                                     │
│                                                          │
│ Profile Image                                            │
│ ┌────────┐                                               │
│ │  [img]  │  Upload a logo, photo, or icon for your      │
│ │ 200x200 │  community. Shows on cards, search results,  │
│ └────────┘  and the dashboard header.                    │
│ [Upload Image]   or   [Use Emoji Instead: 🏃]            │
│                                                          │
│ Banner Image                                             │
│ ┌──────────────────────────────────────────────────────┐│
│ │                                                       ││
│ │              1200 x 400 banner                        ││
│ │                                                       ││
│ └──────────────────────────────────────────────────────┘│
│ [Upload Banner]                                          │
│                                                          │
│ Tagline                                                  │
│ [Trail runners exploring the Pacific Northwest     ]     │
│ Short one-liner (120 chars). Shown on cards and pages.  │
│                                                          │
│ Accent Color                                             │
│ [■ #2D7A4F]  [Auto-detect from banner]                   │
│ Tints your community's header, badges, and cards.       │
│                                                          │
│ ── CO Base / CO Pro Only ────────────────────────────── │
│                                                          │
│ Theme                                          [CO Base] │
│ Primary: [■ #2D7A4F]   Secondary: [■ #F5F0E8]           │
│ Preference: ● Light  ○ Dark                              │
│                                                          │
│ Featured Media                                 [CO Base] │
│ [img1] [img2] [img3] [img4] [+ Add]  (up to 12)        │
│ Photos shown on your Full Profile public page.          │
│                                                          │
│ Custom Sections                                [CO Pro]  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1. "Our Story"  (markdown)                   [Edit] │ │
│ │ 2. "FAQ"         (markdown)                  [Edit] │ │
│ └─────────────────────────────────────────────────────┘ │
│ [+ Add Section]  (up to 5)                               │
│                                                          │
│ Member Badges                                  [CO Pro]  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🏅 Founding Member  •  auto: joined in first 30 days│ │
│ │ ⭐ Top Contributor  •  manual: CO assigns            │ │
│ └─────────────────────────────────────────────────────┘ │
│ [+ Create Badge]  (up to 10)                             │
│                                                          │
│ [Save Changes]                                           │
└─────────────────────────────────────────────────────────┘
```

**Tier breakdown:**

| Feature | Free / Solo | CO Base ($99/yr) | CO Pro ($199/mo) |
|---------|------------|-----------------|-----------------|
| **Profile image** | Yes | Yes | Yes |
| **Banner image** | Yes | Yes | Yes |
| **Tagline** | Yes | Yes | Yes |
| **Accent color** | Yes | Yes | Yes |
| **Custom theme** (primary + secondary + light/dark) | — | Yes | Yes |
| **Featured media** (gallery on public page) | — | Up to 6 images | Up to 12 images |
| **Custom sections** (markdown blocks on public page) | — | — | Up to 5 sections |
| **Member badges** (visual flair on member cards) | — | — | Up to 10 badges |
| **Custom link blocks** (styled CTAs on public page) | — | — | Up to 6 links |

**Schema additions** to `communities` table:

```typescript
// Visual identity — all tiers
profileImageUrl: text('profile_image_url'),       // Uploaded image URL (null = use emoji icon)
bannerImageUrl: text('banner_image_url'),          // Banner/cover image URL
tagline: text('tagline'),                          // Short tagline (max 120 chars)
accentColor: text('accent_color'),                 // Hex color (e.g., '#2D7A4F')

// Visual identity — paid tiers (stored in settings JSONB)
// communities.settings.theme: { primary, secondary, mode }     → CO Base+
// communities.settings.featuredMedia: string[]                  → CO Base+ (image URLs, max 6/12)
// communities.settings.customSections: { title, content }[]    → CO Pro (markdown, max 5)
// communities.settings.memberBadges: { id, label, emoji, rule }[]  → CO Pro (max 10)
// communities.settings.customLinks: { url, title, style }[]    → CO Pro (max 6)
```

Free-tier fields are top-level columns (cheap, always queried for cards). Paid-tier features live in `communities.settings` JSONB (only accessed on the settings page and public page render).

**Image handling:**
- Upload via presigned URL to object storage (Vercel Blob or S3)
- Profile image: resized to 200x200 and 64x64 (card thumbnail) on upload
- Banner image: resized to 1200x400 on upload
- Featured media: resized to 800x600 (gallery) and 200x150 (thumbnail)
- Max file size: 5MB per image
- Accepted formats: JPEG, PNG, WebP
- Default banner: a subtle gradient generated from the accent color (no upload required)

**Accent color auto-detection:** When a banner is uploaded, extract the dominant color and suggest it as the accent. CO can override. Uses a lightweight color extraction library (e.g., `color-thief` or server-side image analysis).

**Member badges (CO Pro):**

```typescript
interface MemberBadge {
  id: string;                              // UUID
  label: string;                           // "Founding Member", "Top Contributor"
  emoji: string;                           // Badge icon
  rule: 'manual' | 'auto_founding' | 'auto_endorsement_count';
  threshold?: number;                      // For auto rules (e.g., endorsement count >= 5)
}
```

Auto rules: `auto_founding` = joined within first 30 days. `auto_endorsement_count` = earned N+ endorsements in this community. Manual = CO assigns/removes per member.

Badges display as small emoji+label chips on member cards in the directory and on the member's community profile page.

**Server actions:**

```typescript
updateCommunityAppearance(communityId: string, data: {
  profileImageUrl?: string | null;
  bannerImageUrl?: string | null;
  tagline?: string | null;
  accentColor?: string | null;
  theme?: { primary: string; secondary: string; mode: 'light' | 'dark' } | null;
  featuredMedia?: string[];
  customSections?: { title: string; content: string }[];
  memberBadges?: MemberBadge[];
  customLinks?: { url: string; title: string; style?: string }[];
})
// Admin or steward. Validates tier limits. Image URLs must be from trusted storage domain.

getImageUploadUrl(input: {
  communityId: string;
  purpose: 'profile' | 'banner' | 'featured_media';
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string }>
// Returns a presigned upload URL. Admin or steward.
```

### 3.3 Server Actions Needed

```
updateCommunity(communityId: string, data: Partial<CommunityUpdate>)  → General settings
updateCommunityTraits(communityId: string, traits: Record<string, unknown>)  → Community traits
updateCommunityAppearance(communityId: string, data: AppearanceUpdate)  → Visual identity (§3.2.6)
getImageUploadUrl(communityId, purpose, contentType)  → Presigned upload URL
updateMemberTraitSchema(communityId: string, schema: MemberTraitSchemaField[])  → Schema builder
transferCommunityOwnership(communityId: string, newOwnerId: string)
// Archive, close, and delete actions → see 11-community-closure.md
```

### 3.4 Validations Needed

```typescript
// lib/validations/communities.ts (additions)

updateCommunitySchema  → name, description, icon, tags, joinPolicy, maxMembers, publicPresence
communityAppearanceSchema → profileImageUrl, bannerImageUrl, tagline, accentColor, theme, featuredMedia, customSections, memberBadges, customLinks (tier-validated)
communityTraitsSchema  → dynamic validation against type's communityTraitSchema
memberTraitSchemaFieldSchema → label, type, required, placeholder, options, helpText
```

---

## 4. Community Public Page

Every community with `publicPresence.level` of `discoverable` or `full` has a public-facing page. Private communities have no public page.

### 4.1 Route

`/g/[slug]` — Public community page

Returns 404 for private communities. What the page shows depends on the community's public presence tier.

### 4.2 Discoverable Tier — The Business Card

A clean, simple page with enough information for someone to decide whether to join or contact the organizer. No member browsing, no trait aggregation.

**Example: Eastside Knitting Circle (Club)**

```
┌─────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░ banner image (or gradient) ░░░░░░░░░░░ │
├─────────────────────────────────────────────────────────┤
│ [img] Eastside Knitting Circle              Club         │
│       "A welcoming group for knitters of all levels"     │
│                                                          │
│ A welcoming group for knitters of all skill levels.      │
│ We meet every Thursday evening at the Eastside           │
│ Community Center to work on projects and hang out.       │
│                                                          │
│ 👥 34 members  •  📍 Portland, OR                        │
│                                                          │
│ Tags: [knitting] [fiber arts] [social]                   │
│                                                          │
│ Find us on: [Instagram] [Facebook Group]                 │
│                                                          │
│ [Join This Community]          [Share]                    │
│                                                          │
│ Questions? [Contact the Organizer →]                     │
└─────────────────────────────────────────────────────────┘
```

**Example: Maplewood Block 4 (Neighborhood)**

```
┌─────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░ (accent color gradient) ░░░░░░░░░░░░ │
├─────────────────────────────────────────────────────────┤
│ [🏡] Maplewood Block 4                  Neighborhood     │
│                                                          │
│ Neighbors on Block 4 of the Maplewood subdivision.       │
│ Tool sharing, block parties, keeping an eye out.         │
│                                                          │
│ 👥 18 members  •  📍 Maplewood, Austin, TX               │
│                                                          │
│ Find us on: [Nextdoor]                                   │
│                                                          │
│ [Request to Join]              [Share]                    │
│                                                          │
│ Questions? [Contact the Organizer →]                     │
└─────────────────────────────────────────────────────────┘
```

**What Discoverable shows:**
- Banner image (or accent color gradient fallback)
- Profile image or emoji icon, name, type badge, tagline
- Description (full)
- Member count + location
- Tags
- External platform links
- Join CTA (appropriate to join policy)
- "Contact the Organizer" button (sends an introduction request to the founding user/admin)

**What Discoverable does NOT show:**
- Member names, skills, or any individual data
- Capability aggregation ("top skills")
- Notices
- Endorsement counts
- Gallery, custom sections, or other paid appearance features

### 4.3 Full Profile Tier — The Showcase

A rich page that shows the community's collective capabilities and recent activity. Designed to answer: "What is this community, what can its members do, and what's happening right now?"

**Content priority:** Dynamic content that refreshes often appears above static content.

| Priority | Section | Owned By | Refresh Frequency |
|---------|---------|----------|-------------------|
| 1 | **What's Happening** (Notices) | `10-notices.md` §4.3 | Daily — time-bound, always changing |
| 2 | **Community Pulse** | This spec (§4.4) | Weekly — aggregate stats |
| 3 | **What Members Offer** (Capability Profile) | `03-member-directory.md` §5 | As members join/leave/update |
| 4 | **Featured Members** | `03-member-directory.md` §5 | Slow-changing (top-endorsed) |
| 5 | **Gallery** (Featured media — CO Base+) | This spec (§3.2.6) | As CO uploads |
| 6 | **Custom Sections** (CO-authored — CO Pro) | This spec (§3.2.6) | As CO writes |
| 7 | **About** (Description, traits, platforms) | This spec | Rarely changes |

The principle: show the community is *alive* before showing what it *is*. A guild with a fresh "Offering free estimates" notice is more compelling than one with only static skill lists.

**Reference wireframe** (one example — see `03-member-directory.md` §12 for full directory wireframes with diverse community types):

```
┌─────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░ banner (trail photo) ░░░░░░░░░░░░░░░░ │
├─────────────────────────────────────────────────────────┤
│ [img] Portland Trail Running                 Club        │
│       "Trail runners exploring the Pacific Northwest"    │
│                                                          │
│ 👥 210 members  •  📍 Portland, OR  •  All Levels        │
│ Tags: [trail running] [ultra] [hiking] [Pacific NW]      │
│                                                          │
│ [Join This Community]          [Share]                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ── What's Happening ────────────────────────── 10-notices │
│ (Up to 3 recent notices — see 10-notices.md §4.3)        │
│                                                          │
│ ── Community Pulse ───────────────────────────── §4.4    │
│ 8 new members this month • 5 introductions made          │
│ 3 notices posted this week                               │
│                                                          │
│ ── What Members Offer ──────────── 03-member-directory §5│
│ (Capability profile — top skills with counts)            │
│                                                          │
│ ── Featured Members ────────────── 03-member-directory §5│
│ (Top-endorsed members — 3-6 member cards)                │
│                                                          │
│ ── Gallery ──────────────────────────────── §3.2.6 (paid)│
│ [photo] [photo] [photo] [photo]  (CO Base+, if uploaded) │
│                                                          │
│ ── Our Story ────────────────────────────── §3.2.6 (Pro)│
│ (CO-authored markdown section — CO Pro only)             │
│                                                          │
│ ── About ──────────────────────────────────── this spec  │
│ Full description text...                                 │
│ Meeting Frequency: Saturdays 7am, rotating trailheads    │
│ Platforms: [Strava Club] [Discord] [Website]             │
└─────────────────────────────────────────────────────────┘
```

**Public directory link:** When `directory.access` is `'public'`, a prominent CTA appears above the fold. Label adapts to community type — guilds: "Find a Professional," clubs: "Meet Our Members," events: "See Who's Attending." See `03-member-directory.md` §12 for the full public directory spec.

### 4.4 Community Pulse

A lightweight activity summary computed from recent activity events. This section is unique to the public page (not re-used from other specs).

**What it shows:**
- "[N] new members this [week/month]"
- "[N] introductions facilitated"
- "[N] notices posted this week"
- "[N] endorsements given this month"
- Optionally: next event date (for event-type communities), meeting frequency

**What it is NOT:** A full activity feed. Aggregate stats only — no individual names or actions. See `06-activity-and-analytics.md` for the detailed activity system.

**When the community has no recent activity:** Show the most recent milestone: "Founded [date] • [N] members." Don't show an empty pulse — it signals a dead community.

### 4.5 Visibility Rules

| Public Presence | Public Page | Explore Listing | `/g/[slug]/directory` |
|----------------|------------|-----------------|----------------------|
| **Private** | 404 | Hidden | 404 |
| **Discoverable** | Basic info | Listed | 404 |
| **Full** (directory: members) | Rich page | Listed | Redirect to login → community dashboard |
| **Full** (directory: public) | Rich page + directory link | Listed | Public directory |

### 4.6 Server Actions Needed

```
getPublicCommunity(slug: string)        → Community data filtered by presence tier
getPublicCommunityPulse(communityId)    → Aggregate activity stats for display
```

Member-related actions for the public page (`getPublicCommunityMembers`, `getPublicCommunitySkills`) are defined in `03-member-directory.md` §5.2 and §12.8. Notice-related actions are defined in `10-notices.md` §7.

---

## 5. My Communities

### 5.1 Route

`/communities` — List of communities the user belongs to or manages

### 5.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│ My Communities                        [+ Create New]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ── Favorites ──────────────────────────────────────── │
│ [🏔️ Mill Valley MTB] [📸 Bay Area Photo]                │
│ (Quick-access bar — click to jump to community)         │
│                                                          │
│ ── Communities I Manage ────────────────────────────── │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [🏔️] Mill Valley MTB     ★    admin  •  142 members  │ │
│ │     Club  •  Last active: 2h ago                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [🔧] Tri-County Electrical    admin  •  95 members   │ │
│ │     Guild  •  Last active: 6h ago                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ── Communities I'm In ──────────────────────────────── │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [📸] Bay Area Photo       ★    member  •  85 members │ │
│ │     Club  •  Joined 3 months ago                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [🌊] Cascadia Watershed      member  •  340 members  │ │
│ │     Organization  •  Joined 1 month ago              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

The Favorites bar appears at the top as a horizontal row of icon+name chips — one click to jump to that community's dashboard. The ★ indicator appears on community cards that are favorited. See §2.6 for the favorite/star feature.

### 5.3 Server Actions Needed

```
listMyCommunities(userId: string) → {
  favorites: Community[]    // favorited communities (ordered by when favorited)
  managing: Community[]     // role is admin or steward
  memberOf: Community[]     // role is member
}
// Favorites are a subset of managing + memberOf, returned separately for the quick-access bar.
```

---

## 6. Embedding Generation

When community traits change, regenerate the community's embedding vector for semantic search.

**Trigger:** Any update to community name, description, tags, or traits.

**Process:**
1. Concatenate community name + description + tags + flattened trait values into a text block
2. Generate embedding via `text-embedding-3-small` (same as personas)
3. Update `communities.embedding`

**Server action (internal):**
```
regenerateCommunityEmbedding(communityId: string)
```

Called automatically after `updateCommunity()` or `updateCommunityTraits()`. Not exposed to the user.

---

## 7. Community Relationships

Communities can have explicit relationships with other communities. This replaces the old `parentCommunityId` column with a flexible, bidirectional relationship model.

### 7.1 Why Relationships?

Real-world communities don't exist in isolation:

- **Portland Photography** is a chapter of **PNW Photography Network**
- **React Portland** is affiliated with **React Community** (global)
- **Maplewood Block 4** is part of **Maplewood HOA**
- **CS50 2024 Cohort** is a cohort of **CS50 Alumni Network**
- Two trades guilds form a **referral partnership** — overflow work gets routed

Embedding similarity (spec 04 §2.2) finds *similar* communities automatically. Relationships model *intentional* connections — explicit affiliations that communities declare and manage.

### 7.2 Relationship Types

| Type | Direction | Meaning | Example |
|------|-----------|---------|---------|
| `chapter_of` | Directed (child → parent) | Local/regional branch of a larger community | Portland Photography → PNW Photography Network |
| `affiliated_with` | Bidirectional | Formal partnership, shared identity, independent governance | React Portland ↔ React Community |
| `referral_partner` | Bidirectional | Route overflow/specialized requests between communities | Plumbers Guild ↔ Electricians Guild |
| `cohort_of` | Directed (child → parent) | Time-bounded sub-group of an ongoing community | CS50 2024 → CS50 Alumni |

### 7.3 Schema

```typescript
export const communityRelationships = pgTable('community_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromCommunityId: uuid('from_community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  toCommunityId: uuid('to_community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),              // 'chapter_of' | 'affiliated_with' | 'referral_partner' | 'cohort_of'
  status: text('status').notNull().default('pending'),  // 'pending' | 'active' | 'dissolved'
  metadata: jsonb('metadata').notNull().default('{}'),   // Type-specific data
  initiatedByUserId: uuid('initiated_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_community_relationship')
    .on(table.fromCommunityId, table.toCommunityId, table.type),
  index('idx_relationships_from').on(table.fromCommunityId),
  index('idx_relationships_to').on(table.toCommunityId),
  index('idx_relationships_type').on(table.type),
]);
```

**Replaces** the old `communities.parentCommunityId` column. The `chapter_of` relationship type is the equivalent — but the relationship table is more flexible and supports bidirectional links, status lifecycle, and multiple relationship types per community pair.

**Bidirectional convention:** For `affiliated_with` and `referral_partner`, both directions are equivalent. We store one row per pair (lower UUID as `fromCommunityId`) and query both directions. For `chapter_of` and `cohort_of`, direction matters: `fromCommunityId` is the child, `toCommunityId` is the parent.

### 7.4 Where Relationships Appear

- **Community dashboard sidebar:** "Related Communities" section — shows communities this one has active relationships with, labeled by type ("Chapter of PNW Photography Network," "Referral partner: Eastside Electricians")
- **Public page (Discoverable + Full):** "Part of" badge for chapters, "Related Communities" section for other types
- **Explore page:** "Related Communities" link on community cards when relationships exist
- Distinct from "Similar Communities" (spec 04 §2.2) which is automatic/embedding-based

### 7.5 Tier Limits

| Feature | Free / Solo | CO Base | CO Pro |
|---------|------------|---------|--------|
| Accept relationship invitations | Yes | Yes | Yes |
| Initiate relationships | 1 active | Up to 5 | Unlimited |
| Referral routing between communities | — | — | Yes |
| Shared trait schema inheritance | — | Yes | Yes |
| Aggregated analytics across chapters | — | — | Yes |

### 7.6 Full Workflow

The complete relationship lifecycle — proposing, accepting, managing, dissolving, plus referral routing and trait schema inheritance — is defined in `12-community-relationships.md`.

---

## 8. Test Criteria

### Unit Tests

- `createCommunity` validates input with Zod, rejects invalid data
- `createCommunity` generates unique slugs (no collisions)
- `createCommunity` adds creator as admin member
- `updateCommunity` requires admin role, rejects unauthorized
- `updateCommunityTraits` validates traits against type schema
- `toggleCommunityFavorite` toggles on/off, respects max 10 limit
- `toggleCommunityFavorite` rejects non-members
- `listFavoriteCommunities` returns only favorited communities in order
- Action bar shows Post Notice only when user has permission (noticePolicy check)
- Action bar shows Invite only when user has permission (role + allowMemberInvites check)
- Share Link hidden for private communities
- `updateCommunityAppearance` accepts profile image, banner, tagline, accent color
- `updateCommunityAppearance` rejects theme/gallery/badges for free-tier communities
- `updateCommunityAppearance` enforces image count limits per tier (6 vs 12 featured media)
- Tagline validation: max 120 chars
- Accent color validation: valid hex format
- `updateMemberTraitSchema` enforces field count limits per pricing tier
- `transferCommunityOwnership` validates founding user, transfers to target admin
- Relationship initiation respects tier limits (free: 1, CO Base: 5, CO Pro: unlimited)
- Archive / close flows → tested in `11-community-closure.md`
- Relationship workflow tests → see `12-community-relationships.md`

### Integration Tests

- Create community → verify in database with correct defaults
- Update community traits → verify embedding regenerated
- Schema builder → add field → verify existing members unaffected
- Transfer ownership → verify founding user changes, old owner demoted
- Archive / close → tested in `11-community-closure.md`

### E2E Tests

- CO creates community via wizard → sees success screen → navigates to dashboard
- CO uploads profile image + banner → images appear on dashboard and public page
- CO sets tagline → shows on community cards and public page header
- CO edits community traits → saves → changes reflected on public page
- CO adds schema field → new member sees the field in join flow
- CO archives community → community disappears from Explore (see `11-community-closure.md`)
- Visitor views public community page → sees skills, members, join CTA
- CM opens community dashboard → sees action bar with Post Notice and Share Link
- CM clicks Post Notice → notice form opens → posts → notice appears in Notices tab
- CM clicks Share Link → popover with URL and social buttons → copies link
- CM stars community → appears in Favorites bar on My Communities page
- CM unstars community → removed from Favorites bar
- CM types in CX chat "who knows welding?" → sees inline member results
- CX chat suggests "Post a notice" when member says "I can help with X"
- Action bar hides Invite when `allowMemberInvites` is false and user is a regular member
- CO changes `noticePolicy` to stewards_and_admins → Post Notice hidden for regular members

---

## 9. Implementation Order

1. `listMyCommunities` server action + My Communities page
2. `getCommunity` server action + Community dashboard layout (tabbed)
3. Overview tab (stats, recent activity, top skills, recent notices)
4. Action bar component (role-aware, config-aware)
5. Share Link popover (Web Share API + clipboard + social buttons)
6. `community_favorites` schema + `toggleCommunityFavorite` + `listFavoriteCommunities`
7. Favorites bar on My Communities page + star toggle on dashboard header
8. General settings section (including `noticePolicy` and `allowMemberInvites`)
9. Community appearance settings — profile image, banner, tagline, accent color (free tier)
10. Image upload flow (presigned URLs, resize pipeline)
11. Community traits editor (dynamic from type schema)
12. Public community page (`/g/[slug]`) — render with appearance (banner, profile image, tagline, accent)
13. Member trait schema editor (context schema builder)
14. Transfer ownership flow (archive/close → see `11-community-closure.md`)
15. Embedding regeneration on trait changes
16. Paid appearance features — theme, featured media gallery, custom sections (CO Base/Pro)
17. Member badges (CO Pro) — schema, auto rules, display on member cards
18. Community CX Chat — collapsed bar + expanded panel + Community Coach agent scoping
19. CX Chat suggested prompts (contextual, role-aware)
