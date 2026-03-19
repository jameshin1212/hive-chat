import React, { useState } from 'react';
import { Text, Box } from 'ink';
import { loadIdentity, formatIdentityDisplay } from '../identity/IdentityManager.js';
import { OnboardingScreen } from './screens/OnboardingScreen.js';
import { ChatScreen } from './screens/ChatScreen.js';
import { AsciiBanner } from './components/AsciiBanner.js';
import type { Identity } from '@cling-talk/shared';
import { theme } from './theme.js';

export function App() {
  const [identity, setIdentity] = useState<Identity | undefined>(() => loadIdentity());
  const [showWelcomeBack, setShowWelcomeBack] = useState(!!identity);

  // Welcome back screen for returning users
  if (showWelcomeBack && identity) {
    setTimeout(() => setShowWelcomeBack(false), 1500);
    return (
      <Box flexDirection="column">
        <AsciiBanner />
        <Box>
          <Text color={theme.ui.transition}>
            {'\u2550'.repeat(10)} Welcome back, {formatIdentityDisplay(identity)} {'\u2550'.repeat(10)}
          </Text>
        </Box>
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

  return <ChatScreen identity={identity} onIdentityChange={setIdentity} />;
}
