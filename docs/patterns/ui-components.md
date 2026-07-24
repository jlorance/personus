---
type: spec
title: Personus UI Component Architecture Guide
description: "Complete implementation guide for the Personus component system using Next.js 15, shadcn/ui, and TypeScript."
status: current
tags: [patterns]
---

# Personus UI Component Architecture Guide

Complete implementation guide for the Personus component system using Next.js 15, shadcn/ui, and TypeScript.

---

## Overview

The Personus UI is built on **metadata-driven rendering**, allowing dynamic trait display and editing without hard-coding every trait type. This architecture supports:

- **Flexible schema** - Add new trait types via database without code changes
- **Consistent UX** - All traits rendered with standard patterns
- **Type safety** - Full TypeScript coverage
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- **i18n ready** - Structured for multi-language support

---

## File Organization

```
src/
├── app/
│   ├── (authenticated)/              # Protected routes
│   │   ├── layout.tsx               # Application shell with sidebar
│   │   ├── home/page.tsx            # Dashboard
│   │   ├── personas/page.tsx        # Persona grid
│   │   ├── traits/page.tsx          # Traits editor
│   │   ├── discover/page.tsx        # Discovery chat
│   │   ├── inbox/page.tsx           # Contact requests
│   │   └── feed/page.tsx            # Activity feed
│   ├── (public)/                    # Public routes
│   │   ├── [handle]/page.tsx        # Public persona card
│   │   └── claim/[token]/page.tsx   # Shadow claim
│   └── onboarding/page.tsx          # Welcome flow
│
├── components/
│   ├── personas/
│   │   ├── persona-card.tsx         # Compact & full variants
│   │   ├── persona-grid.tsx         # Grid layout
│   │   └── persona-builder.tsx      # Split-screen builder
│   ├── traits/
│   │   ├── trait-section.tsx        # Dynamic renderer
│   │   ├── trait-editor.tsx         # Dynamic editor
│   │   ├── displays/                # Display components
│   │   │   ├── tag-list.tsx         # Skills display
│   │   │   ├── timeline.tsx         # Employment display
│   │   │   ├── pill-list.tsx        # OpenTo display
│   │   │   └── card-list.tsx        # Hobbies display
│   │   └── editors/                 # Edit components
│   │       ├── multi-item-form.tsx  # Complex repeated structures
│   │       ├── tag-input.tsx        # String arrays
│   │       └── combobox.tsx         # With suggestions
│   ├── discovery/
│   │   ├── chat-interface.tsx       # Conversation UI
│   │   ├── search-result-card.tsx   # Result display
│   │   └── scope-selector.tsx       # Community selection
│   ├── inbox/
│   │   ├── contact-request-card.tsx # Request with triage
│   │   └── contact-inbox.tsx        # Full inbox view
│   ├── coach/
│   │   ├── voice-coach.tsx          # Split-screen coach
│   │   ├── message-bubble.tsx       # Chat messages
│   │   └── persona-preview.tsx      # Live preview
│   ├── onboarding/
│   │   ├── frame-selection.tsx      # Step 1
│   │   ├── before-after.tsx         # Step 2
│   │   └── queryable.tsx            # Step 3
│   ├── activity/
│   │   ├── activity-feed.tsx        # Feed layout
│   │   └── activity-item.tsx        # Feed item
│   └── ui/                          # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
│
├── lib/
│   ├── trait-metadata.ts            # Metadata loading
│   ├── trait-display.tsx            # Render factory
│   └── utils.ts                     # Utilities
│
└── types/
    ├── persona.ts
    ├── trait.ts
    └── metadata.ts
```

---

## Core Concepts

### 1. Trait Metadata System

Every trait type has metadata that describes how to display and edit it:

```typescript
interface TraitMetadata {
  key: string; // "skills", "employment"
  displayName: string; // "Skills", "Work Experience"
  displayConfig: {
    type: 'tag_list' | 'timeline' | 'pill_list' | 'card_list';
    // Type-specific configuration
  };
  editConfig: {
    type: 'multi_item_form' | 'tag_input' | 'text_with_suggestions';
    // Type-specific configuration
  };
}
```

**How it works:**

1. Metadata stored in `trait_metadata` database table
2. Loaded once on app init, cached
3. Components read metadata to determine rendering
4. New trait types added via database, no code deploy

### 2. Dynamic Trait Rendering

```tsx
// Generic component that renders ANY trait
function TraitSection({ traitKey, value }) {
  const metadata = useTraitMetadata(traitKey);

  // Render based on display type from metadata
  switch (metadata.displayConfig.type) {
    case 'tag_list':
      return <TagListDisplay config={metadata.displayConfig} value={value} />;
    case 'timeline':
      return <TimelineDisplay config={metadata.displayConfig} value={value} />;
    // ... etc
  }
}
```

### 3. Layout Patterns

**Application Shell** (all authenticated pages):

```tsx
<AppShell>
  <Sidebar />
  <MainContent>{children}</MainContent>
</AppShell>
```

**Split-Screen** (Coach, Persona Builder):

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2">
  <InteractivePanel />
  <StickyPreviewPanel />
</div>
```

**Chat Interface** (Discovery):

```tsx
<div className="flex h-screen flex-col">
  <Header />
  <MessagesArea />
  <InputFooter />
</div>
```

---

## Key Component Examples

### Persona Card (Two Variants)

**Compact** - for grids:

```tsx
<PersonaCard persona={persona} variant="compact" />
```

**Full** - for detail view:

```tsx
<PersonaCard persona={persona} variant="full" />
```

Both use the same component, different rendering based on `variant` prop.

### Dynamic Trait Section

Automatically renders traits based on metadata:

```tsx
// Renders skills as tags, employment as timeline, etc.
<DynamicTraitSection traitKey="skills" value={persona.traits.skills} />
<DynamicTraitSection traitKey="employment" value={persona.traits.employment} />
```

### Multi-Item Form Editor

For complex repeated structures (skills, employment, certifications):

```tsx
<MultiItemFormEditor
  config={{
    type: 'multi_item_form',
    addButtonText: 'Add Skill',
    fields: [
      { key: 'name', label: 'Skill', type: 'text_with_suggestions' },
      { key: 'proficiency', label: 'Level', type: 'select' },
    ],
  }}
  value={skills}
  onChange={setSkills}
/>
```

### Tag Input Editor

For simple string arrays (openTo, values):

```tsx
<TagInputEditor
  config={{
    type: 'tag_input',
    placeholder: 'Add value...',
    suggestions: ['Consulting', 'Mentoring', 'Collaboration'],
  }}
  value={openTo}
  onChange={setOpenTo}
/>
```

### Commerce Trait Metadata Examples

Commerce traits follow the same metadata-driven rendering pattern as professional traits. Here are representative examples:

**Simple select trait:**
```json
{
  "key": "fitPreference",
  "displayName": "Fit Preference",
  "category": "commerce",
  "dataType": "string",
  "displayConfig": { "type": "prose", "privacyTier": "selective" },
  "editConfig": { "type": "select", "options": ["slim", "regular", "relaxed", "oversized"] }
}
```

**Structured object trait:**
```json
{
  "key": "shippingPreferences",
  "displayName": "Shipping & Delivery",
  "category": "commerce",
  "dataType": "object",
  "displayConfig": { "type": "card_list", "privacyTier": "selective" },
  "editConfig": {
    "type": "structured_form",
    "fields": [
      { "key": "addressToken", "label": "Address Token", "type": "text", "optional": true },
      { "key": "deliveryInstructions", "label": "Delivery Instructions", "type": "textarea", "optional": true },
      { "key": "speedPreference", "label": "Speed", "type": "select", "options": ["fastest", "cheapest", "sustainable"], "optional": true }
    ]
  }
}
```

**Agent-local trait (never shared via MCP):**
```json
{
  "key": "budgetPreferences",
  "displayName": "Budget & Spending",
  "category": "commerce",
  "dataType": "object",
  "displayConfig": { "type": "card_list", "privacyTier": "agent_local" },
  "editConfig": {
    "type": "structured_form",
    "fields": [
      { "key": "perItemMax", "label": "Per-Item Max ($)", "type": "number", "optional": true },
      { "key": "priceSensitivity", "label": "Price Sensitivity", "type": "select", "options": ["budget", "value", "premium", "luxury"], "optional": true }
    ]
  }
}
```

### Privacy Tier Badge Component

Commerce settings should display a privacy tier badge next to each trait section. The badge indicates the disclosure level:

| Tier | Color | Label | Icon |
|------|-------|-------|------|
| `public` | Green (`bg-green-100 text-green-800`) | Always Shared | Globe |
| `selective` | Blue (`bg-blue-100 text-blue-800`) | Per-Persona | Toggle |
| `gated` | Amber (`bg-amber-100 text-amber-800`) | ZK-Provable | Lock |
| `sensitive` | Red (`bg-red-100 text-red-800`) | Consent Required | Shield |
| `agent_local` | Purple (`bg-purple-100 text-purple-800`) | Agent-Only | Bot |

The `privacyTier` value is read from `displayConfig.privacyTier` on the trait metadata row. The badge is rendered alongside the trait's display name in both display and edit modes.

### Discovery Chat

Complete chat interface with AI responses and result cards:

```tsx
<DiscoveryChat />
```

Features:

- Real-time message streaming
- Embedded result cards
- Scope selector (my communities, specific community, all public)
- Request introduction action

### Contact Inbox

Inbox with AI triage notes:

```tsx
<ContactInbox requests={contactRequests} />
```

Features:

- AI analysis shown prominently
- Match score badge
- Trust chain visualization
- Approve/decline actions

### Voice Coach Interface

Split-screen coach with live preview:

```tsx
<VoiceCoachInterface />
```

Features:

- Voice/text input toggle
- Real-time trait extraction
- Live persona preview
- Completeness tracking
- Field mapping display

---

## Data Flow

### 1. Traits → Persona Creation

```
User's Traits (JSONB in database)
    ↓
User selects traits for persona
    ↓
Traits COPIED to persona (denormalized)
    ↓
Persona published with selected traits
```

### 2. Dynamic Rendering

```
Persona loaded from database
    ↓
For each trait in persona.traits:
    ↓
Load trait metadata
    ↓
Render based on displayConfig.type
```

### 3. Coach Session

```
User speaks/types
    ↓
AI extracts structured data
    ↓
Fields mapped to traits
    ↓
Traits added to pool
    ↓
Selected traits published to persona
    ↓
Live preview updates
```

---

## Styling System

### Design Tokens

```css
/* Colors */
--primary: /* shadcn primary */ --persona-person: 142 76% 36%; /* Green */
--persona-org: 213 94% 68%; /* Blue */
--persona-shadow: 239 84% 77%; /* Purple */
--accent-gold: 38 78% 60%; /* Personus gold */

/* Typography */
--font-display: 'Fraunces', Georgia, serif;
--font-body: 'Outfit', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Component Variants

Using `cva` (class-variance-authority) from shadcn:

```tsx
const cardVariants = cva('rounded-lg border bg-card', {
  variants: {
    variant: {
      default: '',
      outline: 'border-2',
      elevated: 'shadow-lg',
    },
  },
});
```

### Responsive Patterns

```tsx
// Grid: 1 col mobile, 2 col tablet, 3 col desktop
className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

// Split screen: stacked mobile, side-by-side desktop
className = 'grid grid-cols-1 lg:grid-cols-2';

// Sidebar: hidden mobile, visible desktop
className = 'hidden lg:block';
```

---

## State Management

### Server State (Database)

Use React Server Components + Server Actions:

```tsx
// app/personas/page.tsx (Server Component)
export default async function PersonasPage() {
  const personas = await db.personas.findMany({
    where: { userId: auth.userId },
  });

  return <PersonaGrid personas={personas} />;
}
```

### Client State (UI)

Use React hooks for UI state:

```tsx
// components/discovery/chat-interface.tsx (Client Component)
'use client';

export function DiscoveryChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // ...
}
```

### Form State

Use React Hook Form:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(skillSchema),
  defaultValues: { name: '', proficiency: 'intermediate' },
});
```

---

## Accessibility

### Keyboard Navigation

All interactive elements support:

- `Tab` to focus
- `Enter` to activate
- `Escape` to close modals/dropdowns
- `Arrow keys` for navigation within components

### Screen Readers

```tsx
<Button aria-label="Request introduction to Maya Chen">
  <MessageSquare aria-hidden="true" />
  Request Introduction
</Button>
```

### Focus Management

```tsx
// Auto-focus input after modal opens
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (isOpen) {
    inputRef.current?.focus();
  }
}, [isOpen]);
```

---

## i18n Support

All user-facing strings in `apps/web` are authored through `next-intl` (v4). English is the only shipped locale for the first six months; additional locales are added by dropping a new `messages/<code>.json` file and updating the request config when the product commits to a second language. Baking it in from the start prevents a costly retrofit.

### Wiring (already in place)

- Config: [apps/web/i18n/request.ts](../../apps/web/i18n/request.ts) — returns `locale: 'en'`, `timeZone: 'UTC'`, and loaded messages
- Plugin: `createNextIntlPlugin()` in [apps/web/next.config.ts](../../apps/web/next.config.ts)
- Provider: `<NextIntlClientProvider>` wraps the app in [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx) — inherits locale/timeZone/messages from the request config
- Messages: [apps/web/messages/en.json](../../apps/web/messages/en.json)

### Using translations

**Client Components** (and non-async Server Components) use `useTranslations`:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function PersonaCard({ persona }: { persona: Persona }) {
  const t = useTranslations('Personas');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{persona.displayName}</CardTitle>
        <Button>{t('requestIntroduction')}</Button>
      </CardHeader>
    </Card>
  );
}
```

**Async Server Components** use `getTranslations` (see [apps/web/app/page.tsx](../../apps/web/app/page.tsx) for the reference implementation):

```tsx
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}
```

### Messages file structure

Namespaces group strings by feature area. Keep keys flat within a namespace when possible.

```json
// apps/web/messages/en.json
{
  "HomePage": {
    "title": "Personus.ai",
    "tagline": "AI-native social network for capability-based discovery",
    "getStarted": "Get Started"
  },
  "Personas": {
    "requestIntroduction": "Request Introduction",
    "edit": "Edit",
    "share": "Share"
  }
}
```

### Rules

- Every user-facing string in `apps/web` MUST be authored through `useTranslations` or `getTranslations` — no hardcoded strings in JSX text content or button labels.
- Metadata strings (page `<title>`, `description`) can remain hardcoded in English while the product is single-locale; localize when adding a second locale.
- Keep namespaces aligned with routes/features (one namespace per major area).

---

## Performance Optimizations

### Code Splitting

```tsx
// Lazy load heavy components
const VoiceCoach = dynamic(() => import('@/components/coach/voice-coach'), {
  loading: () => <Skeleton />,
});
```

### Image Optimization

```tsx
import Image from 'next/image';

<Image src={persona.avatar} width={80} height={80} alt={persona.displayName} />;
```

### Virtualization

For long lists (>100 items):

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
});
```

---

## Testing

### Unit Tests (Vitest)

```tsx
import { render, screen } from '@testing-library/react';
import { PersonaCard } from './persona-card';

test('displays persona name', () => {
  render(<PersonaCard persona={mockPersona} />);
  expect(screen.getByText('Maya Chen')).toBeInTheDocument();
});
```

### Integration Tests

```tsx
test('trait editor updates persona', async () => {
  render(<PersonaBuilder />);

  // Select skill
  await userEvent.click(screen.getByText('Rust'));

  // Verify preview updates
  expect(screen.getByText('Rust')).toBeInTheDocument();
});
```

---

## Common Patterns

### Loading States

```tsx
{
  isLoading ? <PersonaCardSkeleton /> : <PersonaCard persona={persona} />;
}
```

### Empty States

```tsx
{
  personas.length === 0 ? (
    <EmptyState
      icon={User}
      title="No personas yet"
      description="Create your first persona to get started"
      actions={[{ label: 'Create Persona', primary: true, onClick: onCreate }]}
    />
  ) : (
    <PersonaGrid personas={personas} />
  );
}
```

### Error Boundaries

```tsx
<ErrorBoundary fallback={<ErrorState />}>
  <PersonaGrid personas={personas} />
</ErrorBoundary>
```

---

## Implementation Checklist

### Phase 1: Core Components

- [ ] Application shell with sidebar
- [ ] Persona card (compact & full)
- [ ] Dynamic trait sections
- [ ] Traits editor
- [ ] Persona grid

### Phase 2: Discovery & Inbox

- [ ] Discovery chat interface
- [ ] Search result cards
- [ ] Contact inbox
- [ ] AI triage display

### Phase 3: Coach & Onboarding

- [ ] Voice coach interface
- [ ] Live preview panel
- [ ] Onboarding welcome screens
- [ ] Persona builder

### Phase 4: Activity & Social

- [ ] Activity feed
- [ ] Community directory
- [ ] Community admin panel
- [ ] Analytics charts

---

## Next Steps

1. **Set up shadcn/ui**: `npx shadcn-ui@latest init`
2. **Install dependencies**: See `package.json` in examples
3. **Copy base components**: Start with `component_examples.tsx`
4. **Implement layouts**: Application shell, split-screen, etc.
5. **Connect to database**: Server components + Server Actions
6. **Add metadata loading**: `useTraitMetadata` hook
7. **Test with real data**: Seed database with trait metadata

---

## Resources

- [shadcn/ui docs](https://ui.shadcn.com)
- [Next.js 15 docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [React Flow](https://reactflow.dev)
- [Framer Motion](https://www.framer.com/motion)
