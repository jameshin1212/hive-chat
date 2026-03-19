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

export function updateIdentity(updates: { nickname?: string; aiCli?: AiCli }): Identity {
  const current = loadIdentity();
  if (!current) throw new Error('No identity to update');
  const updated: Identity = {
    ...current,
    ...(updates.nickname !== undefined ? { nickname: updates.nickname } : {}),
    ...(updates.aiCli !== undefined ? { aiCli: updates.aiCli } : {}),
  };
  identitySchema.parse(updated);
  appConfig.set('identity', updated);
  return updated;
}

export function formatIdentityDisplay(identity: Identity): string {
  return `${identity.nickname}#${identity.tag}`;
}
