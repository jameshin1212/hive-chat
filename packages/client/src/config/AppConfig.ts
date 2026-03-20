import Conf from 'conf';
import type { Identity, FriendRecord } from '@hivechat/shared';

// CLING_TALK_PROFILE env allows multiple identities for testing
// Usage: CLING_TALK_PROFILE=test2 npm run dev:client
const profile = process.env['CLING_TALK_PROFILE'];
const projectName = profile ? `cling-talk-${profile}` : 'cling-talk';

export const appConfig = new Conf<{ identity?: Identity; friends?: FriendRecord[] }>({
  projectName,
});
