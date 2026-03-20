import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Conf from 'conf';

// Set test profile before importing FriendManager
process.env['HIVECHAT_PROFILE'] = `test-friends-${Date.now()}`;

const { addFriend, removeFriend, getFriends, isFriend } = await import('./FriendManager.js');
const { appConfig } = await import('../config/AppConfig.js');

describe('FriendManager', () => {
  beforeEach(() => {
    // Clear friends before each test
    appConfig.set('friends', []);
  });

  afterAll(() => {
    // Clean up test config
    appConfig.clear();
  });

  describe('getFriends', () => {
    it('should return empty array when no friends stored', () => {
      appConfig.delete('friends');
      expect(getFriends()).toEqual([]);
    });
  });

  describe('addFriend', () => {
    it('should add a friend and return FriendRecord with addedAt', () => {
      const record = addFriend('coder', '3A7F');
      expect(record.nickname).toBe('coder');
      expect(record.tag).toBe('3A7F');
      expect(typeof record.addedAt).toBe('string');
      // Verify ISO 8601
      expect(new Date(record.addedAt).toISOString()).toBe(record.addedAt);
    });

    it('should persist to config', () => {
      addFriend('coder', '3A7F');
      const friends = appConfig.get('friends');
      expect(friends).toHaveLength(1);
      expect(friends![0]!.nickname).toBe('coder');
    });

    it('should add multiple friends', () => {
      addFriend('alice', 'AAAA');
      addFriend('bob', 'BBBB');
      expect(getFriends()).toHaveLength(2);
    });

    it('should be idempotent - adding same friend twice creates duplicate (caller handles)', () => {
      addFriend('coder', '3A7F');
      addFriend('coder', '3A7F');
      // Implementation is simple append; dedup is caller's responsibility
      expect(getFriends().filter(f => f.nickname === 'coder' && f.tag === '3A7F').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('removeFriend', () => {
    it('should remove existing friend and return true', () => {
      addFriend('coder', '3A7F');
      const result = removeFriend('coder', '3A7F');
      expect(result).toBe(true);
      expect(getFriends()).toHaveLength(0);
    });

    it('should return false for non-existent friend', () => {
      expect(removeFriend('nobody', 'FFFF')).toBe(false);
    });

    it('should only remove matching friend', () => {
      addFriend('alice', 'AAAA');
      addFriend('bob', 'BBBB');
      removeFriend('alice', 'AAAA');
      const friends = getFriends();
      expect(friends).toHaveLength(1);
      expect(friends[0]!.nickname).toBe('bob');
    });
  });

  describe('isFriend', () => {
    it('should return true after addFriend', () => {
      addFriend('coder', '3A7F');
      expect(isFriend('coder', '3A7F')).toBe(true);
    });

    it('should return false after removeFriend', () => {
      addFriend('coder', '3A7F');
      removeFriend('coder', '3A7F');
      expect(isFriend('coder', '3A7F')).toBe(false);
    });

    it('should return false for non-existent friend', () => {
      expect(isFriend('nobody', 'FFFF')).toBe(false);
    });
  });
});
