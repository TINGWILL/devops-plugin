import { describe, it, expect } from 'vitest';
import {
  getUserPayload,
  getUserHeaders,
  isUserInfoValid,
  getUserDisplayName,
  getUserIdentifier,
} from '../userService';
import { FeishuUserInfo } from '../../hooks/useFeishuUser';

describe('userService', () => {
  const mockUser: FeishuUserInfo = {
    id: 'user-123',
    name: '测试用户',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.jpg',
    tenantId: 'tenant-456',
  };

  describe('getUserPayload', () => {
    it('应该正确格式化用户信息为 payload', () => {
      const payload = getUserPayload(mockUser);
      
      expect(payload).toEqual({
        userId: 'user-123',
        userName: '测试用户',
        userEmail: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg',
        tenantId: 'tenant-456',
      });
    });

    it('应该处理 null 用户', () => {
      const payload = getUserPayload(null);
      expect(payload).toBeNull();
    });

    it('应该处理部分字段缺失的用户', () => {
      const partialUser: FeishuUserInfo = {
        id: 'user-456',
        name: '部分用户',
      };
      
      const payload = getUserPayload(partialUser);
      
      expect(payload).toEqual({
        userId: 'user-456',
        userName: '部分用户',
        userEmail: undefined,
        avatar: undefined,
        tenantId: undefined,
      });
    });
  });

  describe('getUserHeaders', () => {
    it('应该正确生成请求头', () => {
      const headers = getUserHeaders(mockUser);
      
      expect(headers).toEqual({
        'X-User-Id': 'user-123',
        'X-User-Name': '测试用户',
        'X-Tenant-Id': 'tenant-456',
      });
    });

    it('应该处理 null 用户', () => {
      const headers = getUserHeaders(null);
      expect(headers).toEqual({});
    });

    it('应该只添加存在的字段', () => {
      const partialUser: FeishuUserInfo = {
        id: 'user-789',
      };
      
      const headers = getUserHeaders(partialUser);
      
      expect(headers).toEqual({
        'X-User-Id': 'user-789',
      });
    });
  });

  describe('isUserInfoValid', () => {
    it('应该验证有效用户信息', () => {
      expect(isUserInfoValid(mockUser)).toBe(true);
      expect(isUserInfoValid({ id: 'user-123' })).toBe(true);
      expect(isUserInfoValid({ name: '用户' })).toBe(true);
    });

    it('应该拒绝无效用户信息', () => {
      expect(isUserInfoValid(null)).toBe(false);
      expect(isUserInfoValid({})).toBe(false);
      expect(isUserInfoValid({ email: 'test@example.com' })).toBe(false);
    });
  });

  describe('getUserDisplayName', () => {
    it('应该返回用户名称', () => {
      expect(getUserDisplayName(mockUser)).toBe('测试用户');
    });

    it('应该在名称不存在时返回邮箱', () => {
      const user = { email: 'test@example.com' };
      expect(getUserDisplayName(user)).toBe('test@example.com');
    });

    it('应该在名称和邮箱都不存在时返回 ID', () => {
      const user = { id: 'user-123' };
      expect(getUserDisplayName(user)).toBe('user-123');
    });

    it('应该使用自定义回退文本', () => {
      expect(getUserDisplayName(null, '未登录')).toBe('未登录');
      expect(getUserDisplayName({}, '默认用户')).toBe('默认用户');
    });
  });

  describe('getUserIdentifier', () => {
    it('应该生成完整的用户标识符', () => {
      const identifier = getUserIdentifier(mockUser);
      expect(identifier).toContain('id:user-123');
      expect(identifier).toContain('name:测试用户');
      expect(identifier).toContain('email:test@example.com');
    });

    it('应该处理部分信息', () => {
      const identifier = getUserIdentifier({ id: 'user-123' });
      expect(identifier).toBe('id:user-123');
    });

    it('应该处理空用户', () => {
      expect(getUserIdentifier(null)).toBe('anonymous');
      expect(getUserIdentifier({})).toBe('unknown');
    });
  });
});

