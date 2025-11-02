import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeishuTheme } from '../useFeishuTheme';

describe('useFeishuTheme', () => {
  beforeEach(() => {
    // 清理 DOM
    document.body.className = '';
    document.body.removeAttribute('data-theme');
    document.body.removeAttribute('theme-mode');
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('theme-mode');
    
    // 清理 localStorage
    localStorage.clear();
    
    // 清理 app 容器
    const app = document.getElementById('app');
    if (app) {
      app.removeAttribute('theme-mode');
    }
    
    // Mock getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      backgroundColor: 'rgb(255, 255, 255)',
    } as CSSStyleDeclaration);
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('应该检测到 body 的 dark class', () => {
    document.body.classList.add('dark');
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
    expect(document.body.getAttribute('theme-mode')).toBe('dark');
  });

  it('应该检测到 html 的 dark class', () => {
    document.documentElement.classList.add('dark');
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('应该检测到 data-theme="dark" 属性', () => {
    document.body.setAttribute('data-theme', 'dark');
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('应该检测到 theme-mode="dark" 属性', () => {
    document.body.setAttribute('theme-mode', 'dark');
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('应该检测到暗色背景色', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      backgroundColor: 'rgb(31, 31, 31)',
    } as CSSStyleDeclaration);
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('应该检测到 #1f1f1f 背景色', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      backgroundColor: '#1f1f1f',
    } as CSSStyleDeclaration);
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('应该检测到 localStorage 中的 dark 主题', () => {
    localStorage.setItem('theme', 'dark');
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('应该检测到 localStorage 中的 theme-mode', () => {
    localStorage.setItem('theme-mode', 'dark');
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('应该检测到 localStorage 中的 feishu-theme', () => {
    localStorage.setItem('feishu-theme', 'dark');
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(true);
  });

  it('默认应该是浅色模式', () => {
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(result.current).toBe(false);
    expect(document.body.getAttribute('theme-mode')).toBeNull();
  });

  it('应该定期检查主题变化', () => {
    const { result } = renderHook(() => useFeishuTheme());
    
    expect(result.current).toBe(false);
    
    // 等待初始检测
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(false);
    
    // 改变主题
    document.body.classList.add('dark');
    
    // 等待定时器触发（2秒）
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    // 主题应该被更新
    expect(result.current).toBe(true);
    expect(document.body.getAttribute('theme-mode')).toBe('dark');
  });

  it('应该更新 app 容器的 theme-mode 属性', () => {
    // 创建 app 容器
    const app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
    
    document.body.classList.add('dark');
    
    renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    expect(app.getAttribute('theme-mode')).toBe('dark');
    
    // 清理
    document.body.removeChild(app);
  });

  it('应该处理 localStorage 访问错误', () => {
    // Mock localStorage.getItem 抛出错误
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    
    const { result } = renderHook(() => useFeishuTheme());
    
    vi.advanceTimersByTime(100);
    
    // 应该不抛出错误，返回 false（默认浅色）
    expect(result.current).toBe(false);
    
    getItemSpy.mockRestore();
  });

  it('应该清理定时器', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() => useFeishuTheme());
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    clearIntervalSpy.mockRestore();
  });
});

