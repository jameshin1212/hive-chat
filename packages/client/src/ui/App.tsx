import React, { useState } from 'react';
import { loadIdentity } from '../identity/IdentityManager.js';
import { OnboardingScreen } from './screens/OnboardingScreen.js';
import { ChatScreen } from './screens/ChatScreen.js';
import type { Identity } from '@hivechat/shared';

export function App() {
  const [identity, setIdentity] = useState<Identity | undefined>(() => loadIdentity());

  if (!identity) {
    return (
      <OnboardingScreen
        onComplete={(newIdentity) => {
          setIdentity(newIdentity);
        }}
      />
    );
  }

  return <ChatScreen identity={identity} onIdentityChange={setIdentity} />;
}
