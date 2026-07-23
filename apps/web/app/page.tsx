'use client';

import { CopilotSidebar } from '@copilotkit/react-ui';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem',
        maxWidth: 820,
        margin: '0 auto',
      }}
    >
      <p style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6, fontSize: 12 }}>
        Personus · foundation
      </p>
      <h1 style={{ fontSize: '2.75rem', lineHeight: 1.1, margin: '0.5rem 0 1rem' }}>
        Your value is what you can <span style={{ color: 'var(--accent)' }}>do</span>.
      </h1>
      <p style={{ fontSize: '1.1rem', opacity: 0.8, maxWidth: 560 }}>
        This is the fresh Personus monorepo — Next.js 16, Mastra 1.51, Drizzle V1, CopilotKit
        agentic UI, CASL authorization, and pluggable Auth &amp; feature-flag providers. Open the
        coach on the right and start building your persona.
      </p>

      <CopilotSidebar
        defaultOpen
        labels={{
          title: 'Persona Coach',
          initial:
            "Hi! I'm your Persona Coach. Tell me about yourself and I'll help you build your profile — let's start with one sentence on what you do.",
        }}
      />
    </main>
  );
}
