import { useEffect, useState } from 'react';
import { Context } from '@lark-project/js-sdk';

/**
 * 飞书用户信息接口
 */
export interface FeishuUserInfo {
  /** 用户 ID */
  id?: string;
  /** 用户名称 */
  name?: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户头像 URL */
  avatar?: string;
  /** 用户 Union ID */
  unionId?: string;
  /** 用户 Open ID */
  openId?: string;
  /** 租户 ID */
  tenantId?: string;
}

/**
 * 飞书项目系统用户信息 Hook
 * 获取当前登录用户的信息
 */
export function useFeishuUser(): {
  user: FeishuUserInfo | null;
  loading: boolean;
  error: Error | null;
  context: Context | undefined;
} {
  const [user, setUser] = useState<FeishuUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [context, setContext] = useState<Context | undefined>();

  useEffect(() => {
    // 检查是否在飞书环境中
    if (typeof window === 'undefined' || !window.JSSDK) {
      setError(new Error('飞书 SDK 未加载，请确保在飞书项目环境中运行'));
      setLoading(false);
      return;
    }

    let unwatch: (() => void) | undefined;

    const loadUserInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const sdk = window.JSSDK;
        const ctx = await sdk.Context.load();
        setContext(ctx);

        // 从 Context 中提取用户信息
        // 用户信息在 context._originContext.loginUser 中
        const userInfo: FeishuUserInfo = {};

        // 方式1: 从 ctx._originContext.loginUser 获取（飞书项目 SDK 实际路径）
        const originContext = (ctx as any)._originContext;
        if (originContext?.loginUser) {
          const loginUser = originContext.loginUser;
          userInfo.id = loginUser.id;
          userInfo.name = loginUser.name;
          userInfo.email = loginUser.email;
          userInfo.avatar = loginUser.avatar;
          userInfo.unionId = loginUser.unionId;
          userInfo.openId = loginUser.openId;
          // 保存 tenantId（如果需要的话）
          if (loginUser.tenantId) {
            (userInfo as any).tenantId = loginUser.tenantId;
          }
        }

        // 方式2: 从 ctx.user 获取（备用方案）
        if (!userInfo.id && (ctx as any).user) {
          const ctxUser = (ctx as any).user;
          userInfo.id = ctxUser.id;
          userInfo.name = ctxUser.name;
          userInfo.email = ctxUser.email;
          userInfo.avatar = ctxUser.avatar;
          userInfo.unionId = ctxUser.unionId;
          userInfo.openId = ctxUser.openId;
        }

        // 方式3: 从 ctx.currentUser 获取（备用方案）
        if (!userInfo.id && (ctx as any).currentUser) {
          const currentUser = (ctx as any).currentUser;
          userInfo.id = userInfo.id || currentUser.id;
          userInfo.name = userInfo.name || currentUser.name;
          userInfo.email = userInfo.email || currentUser.email;
          userInfo.avatar = userInfo.avatar || currentUser.avatar;
          userInfo.unionId = userInfo.unionId || currentUser.unionId;
          userInfo.openId = userInfo.openId || currentUser.openId;
        }

        setUser(userInfo.id || userInfo.name ? userInfo : null);

        // 监听 Context 变化
        unwatch = ctx.watch((nextCtx) => {
          setContext(nextCtx);
          
          // 从新的 Context 中提取用户信息
          const nextUserInfo: FeishuUserInfo = {};
          const nextOriginContext = (nextCtx as any)._originContext;
          
          if (nextOriginContext?.loginUser) {
            const loginUser = nextOriginContext.loginUser;
            nextUserInfo.id = loginUser.id;
            nextUserInfo.name = loginUser.name;
            nextUserInfo.email = loginUser.email;
            nextUserInfo.avatar = loginUser.avatar;
            nextUserInfo.unionId = loginUser.unionId;
            nextUserInfo.openId = loginUser.openId;
            if (loginUser.tenantId) {
              (nextUserInfo as any).tenantId = loginUser.tenantId;
            }
            setUser(nextUserInfo);
          } else if ((nextCtx as any).user) {
            const ctxUser = (nextCtx as any).user;
            setUser({
              id: ctxUser.id,
              name: ctxUser.name,
              email: ctxUser.email,
              avatar: ctxUser.avatar,
              unionId: ctxUser.unionId,
              openId: ctxUser.openId,
            });
          }
        });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        console.error('获取飞书用户信息失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();

    return () => {
      if (unwatch) {
        unwatch();
      }
    };
  }, []);

  return { user, loading, error, context };
}

