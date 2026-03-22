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

/**
 * Command autocomplete dropdown — Claude Code style overlay.
 *
 * Scroll strategy: the selected item is ALWAYS visible.
 * The window slides to keep selectedIndex in view — no ref, no persistent state.
 * This is intentionally stateless to avoid sync issues with parent's selectedIndex.
 */
export function CommandSuggestions({ suggestions, selectedIndex, visible, maxVisible = 8 }: CommandSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  const total = suggestions.length;

  // Calculate max command name width for alignment
  const maxNameWidth = Math.max(...suggestions.map(s => s.name.length));

  const renderItem = (cmd: CommandSuggestion, isSelected: boolean) => {
    const paddedName = cmd.name.padEnd(maxNameWidth);
    const prefix = isSelected ? '> ' : '  ';
    return (
      <Box key={cmd.name}>
        <Text inverse={isSelected} bold={isSelected} color={isSelected ? undefined : theme.text.primary}>
          {prefix}{paddedName}
        </Text>
        <Text dimColor>{'  '}{cmd.description}</Text>
      </Box>
    );
  };

  // All items fit — no scrolling needed
  if (total <= maxVisible) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor={theme.text.info} paddingX={1}>
        {suggestions.map((cmd, i) => renderItem(cmd, i === selectedIndex))}
      </Box>
    );
  }

  // Scrolling needed: show a window around selectedIndex
  // Strategy: selectedIndex is always centered (or as close as possible)
  const half = Math.floor((maxVisible - 2) / 2); // -2 for scroll indicators
  const itemSlots = maxVisible - 2;

  let start = selectedIndex - half;
  start = Math.max(0, start);
  start = Math.min(start, total - itemSlots);
  start = Math.max(0, start); // clamp again after min

  const end = Math.min(start + itemSlots, total);
  const items = suggestions.slice(start, end);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.text.info} paddingX={1}>
      <Text dimColor>{start > 0 ? `  \u2191 ${start} more` : ' '}</Text>
      {items.map((cmd, i) => {
        const realIndex = start + i;
        return renderItem(cmd, realIndex === selectedIndex);
      })}
      <Text dimColor>{end < total ? `  \u2193 ${total - end} more` : ' '}</Text>
    </Box>
  );
}
