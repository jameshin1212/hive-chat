import { useApp } from 'ink';
import { useCallback } from 'react';

export function useGracefulExit() {
  const { exit } = useApp();

  const handleExit = useCallback(() => {
    exit();
    // Force exit after 2s if cleanup hangs
    setTimeout(() => {
      process.stdout.write('\x1b[?25h'); // restore cursor
      process.exit(0);
    }, 2000).unref();
  }, [exit]);

  return handleExit;
}
