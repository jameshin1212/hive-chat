import React from 'react';
import { Box, Text } from 'ink';

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

  const total = suggestions.length;

  // No scrolling needed if all fit
  if (total <= maxVisible) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {suggestions.map((cmd, index) => {
          const isSelected = index === selectedIndex;
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
      </Box>
    );
  }

  // Scrolling: reserve lines for ↑↓ indicators
  const hasUp = selectedIndex > 0;
  const hasDown = selectedIndex < total - 1;
  const itemSlots = maxVisible - (hasUp ? 1 : 0) - (hasDown ? 1 : 0);

  // Keep selected item visible
  let startIndex: number;
  if (selectedIndex === 0) {
    startIndex = 0;
  } else if (selectedIndex === total - 1) {
    startIndex = total - itemSlots;
  } else {
    // Center selected item in available slots
    startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(itemSlots / 2), total - itemSlots));
  }
  const endIndex = Math.min(startIndex + itemSlots, total);
  const visibleSuggestions = suggestions.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" paddingX={1}>
      {hasUp && startIndex > 0 && (
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
      {hasDown && endIndex < total && (
        <Text dimColor>  ↓ more</Text>
      )}
    </Box>
  );
}
