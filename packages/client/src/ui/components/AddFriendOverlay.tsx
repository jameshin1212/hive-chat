import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';

interface AddFriendOverlayProps {
  visible: boolean;
  onSubmit: (nickTag: string) => void;
  onClose: () => void;
}

export function AddFriendOverlay({ visible, onSubmit, onClose }: AddFriendOverlayProps) {
  const [input, setInput] = useState('');

  useInput((char, key) => {
    if (!visible) return;
    if (key.escape) {
      setInput('');
      onClose();
      return;
    }
    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
      }
      return;
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }
    // Only accept printable characters (nick#TAG is ASCII)
    if (char && !key.ctrl && !key.meta) {
      setInput(prev => prev + char);
    }
  }, { isActive: visible });

  if (!visible) return null;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.text.info} paddingX={1} flexShrink={0}>
      <Box>
        <Text bold color={theme.text.primary}>Add Friend</Text>
        <Text color={theme.text.secondary}> (Esc to cancel)</Text>
      </Box>
      <Box>
        <Text color={theme.text.secondary}>  nick#TAG: </Text>
        <Text color={theme.text.primary}>{input}</Text>
        <Text color={theme.text.info}>{'█'}</Text>
      </Box>
    </Box>
  );
}
