import type { Metadata } from 'next';
import { Hanken_Grotesk, Instrument_Serif, Space_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import '@copilotkit/react-ui/styles.css';
import './globals.css';
import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { ThemeProvider } from '@/components/theme-provider';

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});
const body = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Personus — the register of the capable',
  description: 'Your value is what you can do, not what you post.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SiteNav />
          {children}
          <footer className="shell mt-8 flex justify-between border-t border-border py-8 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-muted-foreground">
            <span>Personus</span>
            <span>Capability, indexed</span>
            <Link href="/coach" className="hover:text-foreground">
              Build your persona →
            </Link>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
