import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';

interface CommandSuggestion {
  name: string;
  description: string;
}

interface CommandSuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  visible: boolean;
  maxVisible?: number;
}

export function CommandSuggestions({ suggestions, selectedIndex, visible, maxVisible = 8 }: CommandSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  // Calculate visible window for scrolling
  const total = suggestions.length;
  let startIndex = 0;
  if (total > maxVisible) {
    // Keep selected item visible within the window
    startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), total - maxVisible));
  }
  const endIndex = Math.min(startIndex + maxVisible, total);
  const visibleSuggestions = suggestions.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" paddingX={1}>
      {startIndex > 0 && (
        <Text dimColor>  ↑ more</Text>
      )}
      {visibleSuggestions.map((cmd, index) => {
        const actualIndex = startIndex + index;
        const isSelected = actualIndex === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text inverse={isSelected} bold={isSelected}>
              {isSelected ? '▸ ' : '  '}
              {cmd.name}
            </Text>
            <Text dimColor>
              {' — '}{cmd.description}
            </Text>
          </Box>
        );
      })}
      {endIndex < total && (
        <Text dimColor>  ↓ more</Text>
      )}
    </Box>
  );
}
