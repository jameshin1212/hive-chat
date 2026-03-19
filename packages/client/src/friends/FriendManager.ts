import { appConfig } from '../config/AppConfig.js';
import type { FriendRecord } from '@cling-talk/shared';

export function getFriends(): FriendRecord[] {
  return appConfig.get('friends') ?? [];
}

export function addFriend(nickname: string, tag: string): FriendRecord {
  const friends = getFriends();
  const record: FriendRecord = { nickname, tag, addedAt: new Date().toISOString() };
  appConfig.set('friends', [...friends, record]);
  return record;
}

export function removeFriend(nickname: string, tag: string): boolean {
  const friends = getFriends();
  const filtered = friends.filter(f => !(f.nickname === nickname && f.tag === tag));
  if (filtered.length === friends.length) return false;
  appConfig.set('friends', filtered);
  return true;
}

export function isFriend(nickname: string, tag: string): boolean {
  return getFriends().some(f => f.nickname === nickname && f.tag === tag);
}
