import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@copilotkit/react-ui/styles.css';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Personus',
  description: 'AI-native capability-discovery network',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
