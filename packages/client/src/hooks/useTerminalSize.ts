import { useState, useEffect } from 'react';
import { useStdout } from 'ink';
import {
  COMPACT_MAX_WIDTH,
  WIDE_MIN_WIDTH,
  DEFAULT_TERMINAL_WIDTH,
  DEFAULT_TERMINAL_ROWS,
} from '@hivechat/shared';

export type Breakpoint = 'compact' | 'standard' | 'wide';

export interface TerminalSize {
  columns: number;
  rows: number;
  breakpoint: Breakpoint;
}

export function getBreakpoint(columns: number): Breakpoint {
  if (columns < COMPACT_MAX_WIDTH) return 'compact';
  if (columns >= WIDE_MIN_WIDTH) return 'wide';
  return 'standard';
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  const [size, setSize] = useState({
    columns: stdout?.columns ?? DEFAULT_TERMINAL_WIDTH,
    rows: stdout?.rows ?? DEFAULT_TERMINAL_ROWS,
  });

  useEffect(() => {
    if (!stdout) return;

    const handler = () => {
      setSize({
        columns: stdout.columns,
        rows: stdout.rows,
      });
    };

    stdout.on('resize', handler);
    return () => {
      stdout.off('resize', handler);
    };
  }, [stdout]);

  return {
    columns: size.columns,
    rows: size.rows,
    breakpoint: getBreakpoint(size.columns),
  };
}
