import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import type { Identity, AiCli } from '@hivechat/shared';
import { NICKNAME_REGEX } from '@hivechat/shared';
import { saveIdentity } from '../../identity/IdentityManager.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { AsciiBanner } from '../components/AsciiBanner.js';
import { IMETextInput } from '../components/IMETextInput.js';
import { AiCliSelector } from '../components/AiCliSelector.js';
import { theme } from '../theme.js';

type OnboardingStep = 'nickname' | 'ai-cli';

interface OnboardingScreenProps {
  onComplete: (identity: Identity) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<OnboardingStep>('nickname');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const { breakpoint } = useTerminalSize();

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

  const totalSteps = 2;
  const currentStep = step === 'nickname' ? 1 : 2;

  // Nickname step
  if (step === 'nickname') {
    return (
      <Box flexDirection="column">
        <AsciiBanner breakpoint={breakpoint} />
        <Text dimColor>Step {currentStep}/{totalSteps}</Text>
        <Box
          borderStyle="single"
          borderColor={theme.text.info}
          flexDirection="column"
          paddingX={1}
        >
          <Text color={theme.text.primary}>
            Choose a nickname (a-z, 0-9, -, _, 1-16 chars):
          </Text>
          {error ? <Text color={theme.text.error}>{error}</Text> : null}
          <IMETextInput
            onSubmit={handleNicknameSubmit}
            placeholder="your-nickname"
          />
        </Box>
      </Box>
    );
  }

  // AI CLI selection step
  return (
    <Box flexDirection="column">
      <AsciiBanner breakpoint={breakpoint} />
      <Text dimColor>Step {currentStep}/{totalSteps}</Text>
      <Box
        borderStyle="single"
        borderColor={theme.text.info}
        flexDirection="column"
        paddingX={1}
      >
        <Text color={theme.text.primary}>
          Select your AI CLI tool:
        </Text>
        <AiCliSelector onSelect={handleAiCliSelect} isActive={step === 'ai-cli'} />
      </Box>
    </Box>
  );
}
