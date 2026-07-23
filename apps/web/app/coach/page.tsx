'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AGENTS = {
  'persona-coach': {
    label: 'Persona Coach',
    desc: 'Build your persona through a short conversation — the coach draws out what you do and how you do it.',
    initial:
      "Hi! I'm your Persona Coach. In one sentence, how would you describe what you do to a friend?",
  },
  discovery: {
    label: 'Discovery',
    desc: 'Search your trust networks in plain language and draft a mediated introduction.',
    initial: 'Who are you looking for? Describe the capability and any constraints.',
  },
  recommender: {
    label: 'Recommender',
    desc: 'Vouch for someone you trust — even if they’re not on Personus yet.',
    initial: 'Who would you like to recommend? Tell me their name and what they’re great at.',
  },
} as const;

type AgentKey = keyof typeof AGENTS;

export default function CoachPage() {
  const [agent, setAgent] = useState<AgentKey>('persona-coach');
  const runtimeUrl = process.env.NEXT_PUBLIC_COPILOT_RUNTIME_URL ?? '/api/copilotkit';
  const active = AGENTS[agent];

  return (
    <main className="shell py-14">
      <p className="eyebrow">Work with an agent</p>
      <h1 className="display mt-3 mb-6 text-4xl md:text-5xl">The workshop</h1>

      <Tabs value={agent} onValueChange={(v) => setAgent(v as AgentKey)}>
        <TabsList>
          {(Object.keys(AGENTS) as AgentKey[]).map((k) => (
            <TabsTrigger key={k} value={k}>
              {AGENTS[k].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="mt-5 mb-5 max-w-[60ch] text-muted-foreground">{active.desc}</p>

      <div className="h-[68vh] min-h-[460px] overflow-hidden rounded-lg border border-border">
        {/* Re-mount CopilotKit per agent so the runtime targets the selected one. */}
        <CopilotKit key={agent} runtimeUrl={runtimeUrl} agent={agent}>
          <div className="copilot-scope">
            <CopilotChat
              className="h-full"
              labels={{ title: active.label, initial: active.initial }}
            />
          </div>
        </CopilotKit>
      </div>
    </main>
  );
}
