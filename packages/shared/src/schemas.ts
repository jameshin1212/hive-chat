import { z } from 'zod';
import { AI_CLI_OPTIONS } from './types.js';

export const identitySchema = z.object({
  nickname: z.string().regex(/^[a-z0-9_-]{1,16}$/),
  tag: z.string().regex(/^[0-9A-F]{4}$/),
  aiCli: z.enum(AI_CLI_OPTIONS),
  schemaVersion: z.literal(1),
});

export const configSchema = z.object({
  identity: identitySchema.optional(),
});
