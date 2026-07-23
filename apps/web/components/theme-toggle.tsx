'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  // Everything theme-derived must be stable until mounted — otherwise the server
  // markup (no resolved theme) and the client markup disagree and React warns.
  const label = !mounted ? 'Toggle theme' : isDark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {mounted && isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
