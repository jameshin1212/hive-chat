import Conf from 'conf';
import type { Identity, FriendRecord } from '@hivechat/shared';

// HIVECHAT_PROFILE env allows multiple identities for testing
// Usage: HIVECHAT_PROFILE=test2 npm run dev:client
const profile = process.env['HIVECHAT_PROFILE'];
const projectName = profile ? `hivechat-${profile}` : 'hivechat';

export const appConfig = new Conf<{ identity?: Identity; friends?: FriendRecord[] }>({
  projectName,
});
