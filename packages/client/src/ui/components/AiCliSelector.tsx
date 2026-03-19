import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { AI_CLI_OPTIONS, type AiCli } from '@cling-talk/shared';
import { theme } from '../theme.js';

interface AiCliSelectorProps {
  onSelect: (aiCli: AiCli) => void;
}

export function AiCliSelector({ onSelect }: AiCliSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(AI_CLI_OPTIONS.length - 1, prev + 1));
      return;
    }
    if (key.return) {
      onSelect(AI_CLI_OPTIONS[selectedIndex]!);
      return;
    }
  });

  return (
    <Box flexDirection="column">
      {AI_CLI_OPTIONS.map((option, index) => {
        const isSelected = index === selectedIndex;
        const badgeColor = theme.badge[option];
        const indicator = isSelected ? '> ' : '  ';

        return (
          <Box key={option}>
            <Text color={isSelected ? theme.text.primary : undefined}>
              {indicator}
            </Text>
            <Text color={badgeColor}>{option}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
