import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import type { Identity, AiCli } from '@hivechat/shared';
import { NICKNAME_REGEX } from '@hivechat/shared';
import { saveIdentity } from '../../identity/IdentityManager.js';
import { AsciiBanner } from '../components/AsciiBanner.js';
import { IMETextInput } from '../components/IMETextInput.js';
import { AiCliSelector } from '../components/AiCliSelector.js';
import { theme } from '../theme.js';

type OnboardingStep = 'welcome' | 'nickname' | 'ai-cli';

interface OnboardingScreenProps {
  onComplete: (identity: Identity) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleNicknameSubmit = useCallback((input: string) => {
    const trimmed = input.trim().toLowerCase();
    if (!NICKNAME_REGEX.test(trimmed)) {
      setError('Invalid nickname. Use a-z, 0-9, -, _ (1-16 chars)');
      return;
    }
    setNickname(trimmed);
    setError('');
    setStep('ai-cli');
  }, []);

  const handleAiCliSelect = useCallback((aiCli: AiCli) => {
    const identity = saveIdentity(nickname, aiCli);
    onComplete(identity);
  }, [nickname, onComplete]);

  // Welcome step: show banner, then advance to nickname on any input
  if (step === 'welcome') {
    return (
      <Box flexDirection="column">
        <AsciiBanner />
        <Text color={theme.text.primary}>{'\n'}Welcome to HiveChat!</Text>
        <Text dimColor>Press Enter to continue...</Text>
        <IMETextInput
          onSubmit={() => setStep('nickname')}
          placeholder=""
          allowEmpty
          showCursor={false}
        />
      </Box>
    );
  }

  // Nickname step
  if (step === 'nickname') {
    return (
      <Box flexDirection="column">
        <AsciiBanner />
        <Text color={theme.text.primary}>
          Choose a nickname (a-z, 0-9, -, _, 1-16 chars):
        </Text>
        {error ? <Text color={theme.text.error}>{error}</Text> : null}
        <IMETextInput
          onSubmit={handleNicknameSubmit}
          placeholder="your-nickname"
        />
      </Box>
    );
  }

  // AI CLI selection step
  return (
    <Box flexDirection="column">
      <AsciiBanner />
      <Text color={theme.text.primary}>
        Select your AI CLI tool:
      </Text>
      <AiCliSelector onSelect={handleAiCliSelect} />
    </Box>
  );
}
