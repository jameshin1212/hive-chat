import React from 'react';
import { Box, Text } from 'ink';
import type { Identity } from '@hivechat/shared';
import { theme } from '../theme.js';
import type { Breakpoint } from '../../hooks/useTerminalSize.js';

const Y = '#EBC33C'; // body - golden yellow
const S = '#B8860B'; // stripe - dark gold
const W = '#A0BEE6'; // wings - light blue

/** Long separator string — Ink truncates to actual box width via wrap="truncate" */
const SEPARATOR_LONG = '\u2500'.repeat(300);

const HEIGHT_WITH_ART = 11;
const HEIGHT_WITHOUT_ART = 6;

/** Dynamic height based on breakpoint */
export function getWelcomeBoxHeight(breakpoint: Breakpoint): number {
  return breakpoint === 'compact' ? HEIGHT_WITHOUT_ART : HEIGHT_WITH_ART;
}

/** Memoized bee art — pure static component, never re-renders on resize */
const BeeArt = React.memo(function BeeArt() {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={Y}>{' \u2590\u259B\u2588\u2588\u2588\u259C\u258C '}</Text>
      <Text>
        <Text color={W} dimColor>{'\u2597'}</Text>
        <Text color={Y}>{'\u259C\u2588\u2588\u2588\u2588\u2588\u259B'}</Text>
        <Text color={W} dimColor>{'\u2596'}</Text>
      </Text>
      <Text color={S}>{' \u259D\u259C\u2588\u2588\u2588\u259B\u2598 '}</Text>
      <Text color={Y}>{'    \u2580    '}</Text>
    </Box>
  );
});

interface WelcomeBoxProps {
  identity: Identity;
  breakpoint: Breakpoint;
}

export function WelcomeBox({ identity, breakpoint }: WelcomeBoxProps) {
  const showArt = breakpoint !== 'compact';
  const welcomeText = 'Welcome back ' + identity.nickname + '!';
  const versionText = 'HiveChat v' + __APP_VERSION__;
  const identityText = identity.aiCli + ' User \u00b7 ' + identity.nickname + '#' + identity.tag;

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Text color={theme.ui.separator} wrap="truncate">{SEPARATOR_LONG}</Text>
      <Box justifyContent="center"><Text bold>{welcomeText}</Text></Box>
      <Text> </Text>
      {showArt && <BeeArt />}
      {showArt && <Text> </Text>}
      <Box justifyContent="center"><Text dimColor>{versionText}</Text></Box>
      <Box justifyContent="center"><Text dimColor>{identityText}</Text></Box>
      <Text color={theme.ui.separator} wrap="truncate">{SEPARATOR_LONG}</Text>
    </Box>
  );
}
