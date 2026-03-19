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

/**
 * Command autocomplete dropdown.
 *
 * Scroll strategy: the selected item is ALWAYS visible.
 * The window slides to keep selectedIndex in view — no ref, no persistent state.
 * This is intentionally stateless to avoid sync issues with parent's selectedIndex.
 */
export function CommandSuggestions({ suggestions, selectedIndex, visible, maxVisible = 8 }: CommandSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  const total = suggestions.length;

  // All items fit — no scrolling needed
  if (total <= maxVisible) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {suggestions.map((cmd, i) => (
          <Box key={cmd.name}>
            <Text inverse={i === selectedIndex} bold={i === selectedIndex}>
              {i === selectedIndex ? '▸ ' : '  '}{cmd.name}
            </Text>
            <Text dimColor>{' — '}{cmd.description}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  // Scrolling needed: show a window around selectedIndex
  // Strategy: selectedIndex is always centered (or as close as possible)
  const half = Math.floor((maxVisible - 2) / 2); // -2 for ↑↓ indicators
  const itemSlots = maxVisible - 2;

  let start = selectedIndex - half;
  start = Math.max(0, start);
  start = Math.min(start, total - itemSlots);
  start = Math.max(0, start); // clamp again after min

  const end = Math.min(start + itemSlots, total);
  const items = suggestions.slice(start, end);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text dimColor>{start > 0 ? `  ↑ ${start} more` : ' '}</Text>
      {items.map((cmd, i) => {
        const realIndex = start + i;
        const isSelected = realIndex === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text inverse={isSelected} bold={isSelected}>
              {isSelected ? '▸ ' : '  '}{cmd.name}
            </Text>
            <Text dimColor>{' — '}{cmd.description}</Text>
          </Box>
        );
      })}
      <Text dimColor>{end < total ? `  ↓ ${total - end} more` : ' '}</Text>
    </Box>
  );
}
