import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';

interface ConfirmOverlayProps {
  message: string;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmOverlay({ message, visible, onConfirm, onCancel }: ConfirmOverlayProps) {
  const [selected, setSelected] = useState(1); // 0=Yes, 1=No (default No)

  useInput((_input, key) => {
    if (!visible) return;
    if (key.leftArrow || key.rightArrow) {
      setSelected(prev => prev === 0 ? 1 : 0);
    }
    if (key.return) {
      if (selected === 0) onConfirm();
      else onCancel();
    }
    if (key.escape) {
      onCancel();
    }
  }, { isActive: visible });

  if (!visible) return null;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} flexShrink={0}>
      <Text color={theme.text.primary}>{message}</Text>
      <Box gap={2} marginTop={0}>
        <Text inverse={selected === 0} bold={selected === 0} color={selected === 0 ? 'green' : undefined}>
          {selected === 0 ? ' Yes ' : '  Yes  '}
        </Text>
        <Text inverse={selected === 1} bold={selected === 1} color={selected === 1 ? 'red' : undefined}>
          {selected === 1 ? ' No ' : '  No  '}
        </Text>
        <Text dimColor>  (← → to select, Enter to confirm)</Text>
      </Box>
    </Box>
  );
}
