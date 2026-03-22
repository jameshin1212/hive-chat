import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { AI_CLI_OPTIONS, type AiCli } from '@hivechat/shared';
import { theme } from '../theme.js';

interface AiCliSelectorProps {
  onSelect: (aiCli: AiCli) => void;
  isActive?: boolean;
}

export function AiCliSelector({ onSelect, isActive = true }: AiCliSelectorProps) {
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
  }, { isActive });

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
