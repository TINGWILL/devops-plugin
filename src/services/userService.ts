import { FeishuUserInfo } from '../hooks/useFeishuUser';

/**
 * 用户服务
 * 封装与后端交互的用户相关 API
 */

/**
 * 获取当前用户信息（用于向后端发送请求）
 * @param user 从 useFeishuUser Hook 获取的用户信息
 * @returns 格式化后的用户信息，用于 API 请求
 */
export function getUserPayload(user: FeishuUserInfo | null): {
  userId?: string;
  userName?: string;
  userEmail?: string;
  avatar?: string;
  tenantId?: string;
} | null {
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    avatar: user.avatar,
    tenantId: user.tenantId,
  };
}

/**
 * 获取请求头中的用户信息（用于向后端发送请求头）
 * @param user 从 useFeishuUser Hook 获取的用户信息
 * @returns 用于添加到请求头中的用户信息
 */
export function getUserHeaders(user: FeishuUserInfo | null): Record<string, string> {
  if (!user) {
    return {};
  }

  const headers: Record<string, string> = {};
  
  if (user.id) {
    headers['X-User-Id'] = user.id;
  }
  if (user.name) {
    headers['X-User-Name'] = user.name;
  }
  if (user.tenantId) {
    headers['X-Tenant-Id'] = user.tenantId;
  }
  
  return headers;
}

/**
 * 验证用户信息是否完整
 * @param user 用户信息
 * @returns 是否有效
 */
export function isUserInfoValid(user: FeishuUserInfo | null): boolean {
  if (!user) {
    return false;
  }
  
  // 至少需要 id 或 name 之一
  return !!(user.id || user.name);
}

/**
 * 获取用户显示名称
 * @param user 用户信息
 * @param fallback 如果用户信息不存在时的回退文本
 * @returns 用户显示名称
 */
export function getUserDisplayName(user: FeishuUserInfo | null, fallback = '未知用户'): string {
  if (!user) {
    return fallback;
  }
  
  return user.name || user.email || user.id || fallback;
}

/**
 * 构建用户标识符（用于日志、追踪等）
 * @param user 用户信息
 * @returns 用户标识符字符串
 */
export function getUserIdentifier(user: FeishuUserInfo | null): string {
  if (!user) {
    return 'anonymous';
  }
  
  const parts: string[] = [];
  if (user.id) parts.push(`id:${user.id}`);
  if (user.name) parts.push(`name:${user.name}`);
  if (user.email) parts.push(`email:${user.email}`);
  
  return parts.length > 0 ? parts.join('|') : 'unknown';
}

