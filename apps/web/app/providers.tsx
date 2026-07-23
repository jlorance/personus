'use client';

import { CopilotKit } from '@copilotkit/react-core';
import type { ReactNode } from 'react';

/**
 * Client-side CopilotKit provider. `runtimeUrl` points at our AG-UI endpoint;
 * `agent` binds the default surface to the Persona Coach Mastra agent.
 */
export function Providers({ children }: { children: ReactNode }) {
  const runtimeUrl = process.env.NEXT_PUBLIC_COPILOT_RUNTIME_URL ?? '/api/copilotkit';
  return (
    <CopilotKit runtimeUrl={runtimeUrl} agent="persona-coach">
      {children}
    </CopilotKit>
  );
}
