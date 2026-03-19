import crypto from 'node:crypto';
import { identitySchema, type Identity, type AiCli } from '@cling-talk/shared';
import { appConfig } from '../config/AppConfig.js';

export function generateTag(): string {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

export function saveIdentity(nickname: string, aiCli: AiCli): Identity {
  const identity: Identity = {
    nickname,
    tag: generateTag(),
    aiCli,
    schemaVersion: 1,
  };
  identitySchema.parse(identity);
  appConfig.set('identity', identity);
  return identity;
}

export function loadIdentity(): Identity | undefined {
  const raw = appConfig.get('identity');
  if (!raw) return undefined;
  return identitySchema.parse(raw);
}

export function clearIdentity(): void {
  appConfig.delete('identity');
}

export function formatIdentityDisplay(identity: Identity): string {
  return `${identity.nickname}#${identity.tag}`;
}
