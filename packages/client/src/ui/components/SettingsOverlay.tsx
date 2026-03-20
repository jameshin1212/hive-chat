import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Identity, AiCli } from '@hivechat/shared';
import { NICKNAME_REGEX } from '@hivechat/shared';
import { updateIdentity } from '../../identity/IdentityManager.js';
import { formatIdentityDisplay } from '../../identity/IdentityManager.js';
import { IMETextInput } from './IMETextInput.js';
import { AiCliSelector } from './AiCliSelector.js';
import { theme } from '../theme.js';

type SubScreen = 'menu' | 'nickname' | 'ai-cli';

interface SettingsOverlayProps {
  identity: Identity;
  visible: boolean;
  onClose: () => void;
  onIdentityChange: (identity: Identity) => void;
}

const MENU_ITEMS = [
  { label: 'Change nickname', action: 'nickname' as const },
  { label: 'Change AI CLI', action: 'ai-cli' as const },
] as const;

export function SettingsOverlay({ identity, visible, onClose, onIdentityChange }: SettingsOverlayProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>('menu');
  const [menuIndex, setMenuIndex] = useState(0);
  const [nicknameError, setNicknameError] = useState('');

  useInput((_input, key) => {
    if (key.upArrow) {
      setMenuIndex(prev => prev <= 0 ? MENU_ITEMS.length - 1 : prev - 1);
    } else if (key.downArrow) {
      setMenuIndex(prev => prev >= MENU_ITEMS.length - 1 ? 0 : prev + 1);
    } else if (key.return) {
      const item = MENU_ITEMS[menuIndex];
      if (item) {
        setSubScreen(item.action);
      }
    } else if (key.escape) {
      onClose();
    }
  }, { isActive: visible && subScreen === 'menu' });

  // Esc in sub-screens returns to menu
  useInput((_input, key) => {
    if (key.escape) {
      setSubScreen('menu');
      setNicknameError('');
    }
  }, { isActive: visible && (subScreen === 'nickname' || subScreen === 'ai-cli') });

  const handleNicknameSubmit = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (!NICKNAME_REGEX.test(trimmed)) {
      setNicknameError('Invalid nickname. Use a-z, 0-9, -, _ (1-16 chars)');
      return;
    }
    try {
      const updated = updateIdentity({ nickname: trimmed });
      onIdentityChange(updated);
      setNicknameError('');
      onClose();
    } catch {
      setNicknameError('Failed to update nickname');
    }
  }, [onIdentityChange, onClose]);

  const handleAiCliSelect = useCallback((aiCli: AiCli) => {
    try {
      const updated = updateIdentity({ aiCli });
      onIdentityChange(updated);
      onClose();
    } catch {
      // Silently fail — should not happen with valid AI CLI options
    }
  }, [onIdentityChange, onClose]);

  if (!visible) return null;

  // Menu sub-screen
  if (subScreen === 'menu') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.text.primary}>Settings</Text>
          <Text color={theme.text.secondary}> (Esc to close)</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color={theme.text.secondary}>
            {formatIdentityDisplay(identity)} | AI CLI: </Text>
          <Text color={theme.badge[identity.aiCli]}>{identity.aiCli}</Text>
        </Box>
        {MENU_ITEMS.map((item, i) => {
          const isSelected = i === menuIndex;
          return (
            <Box key={item.action}>
              <Text inverse={isSelected}>
                {isSelected ? '> ' : '  '}{item.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  // Nickname sub-screen
  if (subScreen === 'nickname') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.text.primary}>Change Nickname</Text>
          <Text color={theme.text.secondary}> (Esc to cancel)</Text>
        </Box>
        <Text color={theme.text.secondary}>
          Current: {formatIdentityDisplay(identity)}
        </Text>
        {nicknameError ? <Text color={theme.text.error}>{nicknameError}</Text> : null}
        <IMETextInput
          onSubmit={handleNicknameSubmit}
          placeholder="new-nickname"
          isActive={visible && subScreen === 'nickname'}
        />
      </Box>
    );
  }

  // AI CLI sub-screen
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.text.primary}>Change AI CLI</Text>
        <Text color={theme.text.secondary}> (Esc to cancel)</Text>
      </Box>
      <Text color={theme.text.secondary}>
        Current: {identity.aiCli}
      </Text>
      <AiCliSelector onSelect={handleAiCliSelect} />
    </Box>
  );
}
