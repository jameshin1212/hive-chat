import React, { useState } from 'react';
import { Text, Box } from 'ink';
import { loadIdentity, formatIdentityDisplay } from '../identity/IdentityManager.js';
import { OnboardingScreen } from './screens/OnboardingScreen.js';
import { ChatScreen } from './screens/ChatScreen.js';
import type { Identity } from '@cling-talk/shared';

export function App() {
  const [identity, setIdentity] = useState<Identity | undefined>(() => loadIdentity());
  const [showWelcomeBack, setShowWelcomeBack] = useState(!!identity);

  // Welcome back message for returning users (per CONTEXT.md)
  if (showWelcomeBack && identity) {
    // Show briefly then transition to chat
    setTimeout(() => setShowWelcomeBack(false), 1500);
    return (
      <Box flexDirection="column">
        <Text color="green">
          Welcome back, {formatIdentityDisplay(identity)}
        </Text>
      </Box>
    );
  }

  if (!identity) {
    return (
      <OnboardingScreen
        onComplete={(newIdentity) => {
          setIdentity(newIdentity);
          setShowWelcomeBack(false);
        }}
      />
    );
  }

  return <ChatScreen identity={identity} />;
}
