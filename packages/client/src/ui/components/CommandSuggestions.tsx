import React, { useRef } from 'react';
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

function renderItem(cmd: CommandSuggestion, isSelected: boolean) {
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
}

export function CommandSuggestions({ suggestions, selectedIndex, visible, maxVisible = 8 }: CommandSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  const total = suggestions.length;
  const scrollTopRef = useRef(0);

  // No scrolling needed
  if (total <= maxVisible) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {suggestions.map((cmd, i) => renderItem(cmd, i === selectedIndex))}
      </Box>
    );
  }

  // Fixed item slots (reserve 2 lines for ↑↓ indicators when in middle)
  const itemSlots = maxVisible - 2; // always reserve both indicators for stable layout

  // Stable scroll: only move window when selected goes out of visible range
  let scrollTop = scrollTopRef.current;

  // Clamp scrollTop to valid range
  scrollTop = Math.max(0, Math.min(scrollTop, total - itemSlots));

  // Adjust if selected is outside visible window
  if (selectedIndex < scrollTop) {
    scrollTop = selectedIndex;
  } else if (selectedIndex >= scrollTop + itemSlots) {
    scrollTop = selectedIndex - itemSlots + 1;
  }

  // Edge cases: at very start or very end, reclaim indicator line
  scrollTop = Math.max(0, Math.min(scrollTop, total - itemSlots));
  scrollTopRef.current = scrollTop;

  const endIndex = Math.min(scrollTop + itemSlots, total);
  const visibleSuggestions = suggestions.slice(scrollTop, endIndex);
  const showUp = scrollTop > 0;
  const showDown = endIndex < total;

  return (
    <Box flexDirection="column" paddingX={1}>
      {showUp ? (
        <Text dimColor>  ↑ {scrollTop} more</Text>
      ) : (
        <Text> </Text>
      )}
      {visibleSuggestions.map((cmd, i) => renderItem(cmd, scrollTop + i === selectedIndex))}
      {showDown ? (
        <Text dimColor>  ↓ {total - endIndex} more</Text>
      ) : (
        <Text> </Text>
      )}
    </Box>
  );
}
