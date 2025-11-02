import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeishuUser } from '../useFeishuUser';

describe('useFeishuUser', () => {
  const mockJSSDK = {
    Context: {
      load: vi.fn(),
    },
    getUserInfo: vi.fn(),
  };

  beforeEach(() => {
    // Mock window.JSSDK
    (window as any).JSSDK = mockJSSDK;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).JSSDK;
  });

  it('应该在 SDK 未加载时返回错误', async () => {
    delete (window as any).JSSDK;

    const { result } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.user).toBeNull();
  });

  it('应该从 Context.user 获取用户信息', async () => {
    const mockContext = {
      user: {
        id: 'user-123',
        name: '测试用户',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg',
        unionId: 'union-123',
        openId: 'open-123',
      },
      watch: vi.fn(() => () => {}), // 返回 unwatch 函数
    };

    mockJSSDK.Context.load = vi.fn().mockResolvedValue(mockContext);

    const { result } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({
      id: 'user-123',
      name: '测试用户',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
      unionId: 'union-123',
      openId: 'open-123',
    });
    expect(result.current.error).toBeNull();
  });

  it('应该从 Context.currentUser 获取用户信息', async () => {
    const mockContext = {
      currentUser: {
        id: 'user-456',
        name: '当前用户',
        email: 'current@example.com',
      },
      watch: vi.fn(() => () => {}),
    };

    mockJSSDK.Context.load = vi.fn().mockResolvedValue(mockContext);

    const { result } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toMatchObject({
      id: 'user-456',
      name: '当前用户',
      email: 'current@example.com',
    });
  });

  it('应该在 Context 中没有用户信息时返回 null', async () => {
    const mockContext = {
      watch: vi.fn(() => () => {}),
    };

    mockJSSDK.Context.load = vi.fn().mockResolvedValue(mockContext);
    mockJSSDK.getUserInfo = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('应该处理 Context.load 失败的情况', async () => {
    const error = new Error('加载 Context 失败');
    mockJSSDK.Context.load = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.user).toBeNull();
  });

  it('应该监听 Context 变化并更新用户信息', async () => {
    const mockWatch = vi.fn();
    const mockUnwatch = vi.fn();
    mockWatch.mockReturnValue(mockUnwatch);

    const mockContext = {
      user: {
        id: 'user-1',
        name: '用户1',
      },
      watch: mockWatch,
    };

    mockJSSDK.Context.load = vi.fn().mockResolvedValue(mockContext);

    const { result, unmount } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockWatch).toHaveBeenCalled();
    expect(result.current.user?.id).toBe('user-1');

    // 模拟 Context 变化
    const newContext = {
      user: {
        id: 'user-2',
        name: '用户2',
      },
    };
    const watchCallback = mockWatch.mock.calls[0][0];
    watchCallback(newContext);

    await waitFor(() => {
      expect(result.current.user?.id).toBe('user-2');
    });

    // 卸载时应该调用 unwatch
    unmount();
    expect(mockUnwatch).toHaveBeenCalled();
  });

  it('应该从 _originContext.loginUser 获取用户信息', async () => {
    const mockContext = {
      _originContext: {
        loginUser: {
          id: 'user-789',
          name: '登录用户',
          email: 'login@example.com',
          avatar: 'https://example.com/avatar.jpg',
          tenantId: 'tenant-123',
        },
      },
      watch: vi.fn(() => () => {}),
    };

    mockJSSDK.Context.load = vi.fn().mockResolvedValue(mockContext);

    const { result } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({
      id: 'user-789',
      name: '登录用户',
      email: 'login@example.com',
      avatar: 'https://example.com/avatar.jpg',
      tenantId: 'tenant-123',
    });
  });

  it('应该监听 Context 变化并更新 loginUser 信息', async () => {
    const mockWatch = vi.fn();
    const mockUnwatch = vi.fn();
    mockWatch.mockReturnValue(mockUnwatch);

    const mockContext = {
      _originContext: {
        loginUser: {
          id: 'user-initial',
          name: '初始用户',
        },
      },
      watch: mockWatch,
    };

    mockJSSDK.Context.load = vi.fn().mockResolvedValue(mockContext);

    const { result, unmount } = renderHook(() => useFeishuUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user?.id).toBe('user-initial');

    // 模拟 Context 变化
    const newContext = {
      _originContext: {
        loginUser: {
          id: 'user-updated',
          name: '更新后的用户',
          email: 'updated@example.com',
        },
      },
    };
    const watchCallback = mockWatch.mock.calls[0][0];
    watchCallback(newContext);

    await waitFor(() => {
      expect(result.current.user?.id).toBe('user-updated');
      expect(result.current.user?.name).toBe('更新后的用户');
    });

    // 卸载时应该调用 unwatch
    unmount();
    expect(mockUnwatch).toHaveBeenCalled();
  });
});

