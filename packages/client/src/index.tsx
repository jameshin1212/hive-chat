import React from 'react';
import { render } from 'ink';
import { App } from './ui/App.js';

// Restore cursor on exit (safety net for abnormal exit)
process.on('exit', () => {
  process.stdout.write('\x1b[?25h');
});

render(<App />);
