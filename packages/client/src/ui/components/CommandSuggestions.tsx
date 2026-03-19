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
}

export function CommandSuggestions({ suggestions, selectedIndex, visible }: CommandSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      {suggestions.map((cmd, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text inverse={isSelected}>
              {isSelected ? '> ' : '  '}
              {cmd.name}
            </Text>
            <Text inverse={isSelected} color={theme.text.secondary}>
              {' \u2014 '}{cmd.description}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
