import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setTaskLoading', () => {
    it('应该设置任务加载状态为 true', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(true);
    });

    it('应该设置任务加载状态为 false', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true);
        result.current.setTaskLoading('task-1', false);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(false);
    });

    it('应该支持多个任务同时加载', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true);
        result.current.setTaskLoading('task-2', true);
        result.current.setTaskLoading('task-3', true);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(true);
      expect(result.current.isTaskLoading('task-2')).toBe(true);
      expect(result.current.isTaskLoading('task-3')).toBe(true);
    });

    it('应该在超时后自动清除加载状态', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true, 1000);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(false);
    });

    it('清除加载状态时应该清理超时定时器', () => {
      const { result } = renderHook(() => useLoadingState());
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      act(() => {
        result.current.setTaskLoading('task-1', true, 1000);
        result.current.setTaskLoading('task-1', false);
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('自定义超时时间应该生效', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true, 5000);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(false);
    });
  });

  describe('isTaskLoading', () => {
    it('任务未加载时应该返回 false', () => {
      const { result } = renderHook(() => useLoadingState());

      expect(result.current.isTaskLoading('task-1')).toBe(false);
    });

    it('任务加载时应该返回 true', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(true);
    });
  });

  describe('setOperationLoading', () => {
    it('应该设置操作加载状态为 true', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setOperationLoading('op-1', true);
      });

      expect(result.current.isOperationLoading('op-1')).toBe(true);
    });

    it('应该设置操作加载状态为 false', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setOperationLoading('op-1', true);
        result.current.setOperationLoading('op-1', false);
      });

      expect(result.current.isOperationLoading('op-1')).toBe(false);
    });

    it('应该支持多个操作同时加载', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setOperationLoading('op-1', true);
        result.current.setOperationLoading('op-2', true);
      });

      expect(result.current.isOperationLoading('op-1')).toBe(true);
      expect(result.current.isOperationLoading('op-2')).toBe(true);
    });
  });

  describe('isOperationLoading', () => {
    it('操作未加载时应该返回 false', () => {
      const { result } = renderHook(() => useLoadingState());

      expect(result.current.isOperationLoading('op-1')).toBe(false);
    });

    it('操作加载时应该返回 true', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setOperationLoading('op-1', true);
      });

      expect(result.current.isOperationLoading('op-1')).toBe(true);
    });
  });

  describe('setBatchTaskLoading', () => {
    it('应该批量设置多个任务的加载状态', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setBatchTaskLoading(['task-1', 'task-2', 'task-3'], true);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(true);
      expect(result.current.isTaskLoading('task-2')).toBe(true);
      expect(result.current.isTaskLoading('task-3')).toBe(true);
    });

    it('应该批量清除多个任务的加载状态', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setBatchTaskLoading(['task-1', 'task-2'], true);
        result.current.setBatchTaskLoading(['task-1', 'task-2'], false);
      });

      expect(result.current.isTaskLoading('task-1')).toBe(false);
      expect(result.current.isTaskLoading('task-2')).toBe(false);
    });

    it('空数组不应该出错', () => {
      const { result } = renderHook(() => useLoadingState());

      expect(() => {
        act(() => {
          result.current.setBatchTaskLoading([], true);
        });
      }).not.toThrow();
    });
  });

  describe('clearAllLoading', () => {
    it('应该清除所有任务和操作的加载状态', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true);
        result.current.setTaskLoading('task-2', true);
        result.current.setOperationLoading('op-1', true);
        result.current.clearAllLoading();
      });

      expect(result.current.isTaskLoading('task-1')).toBe(false);
      expect(result.current.isTaskLoading('task-2')).toBe(false);
      expect(result.current.isOperationLoading('op-1')).toBe(false);
    });

    it('应该清除所有超时定时器', () => {
      const { result } = renderHook(() => useLoadingState());
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      act(() => {
        result.current.setTaskLoading('task-1', true, 1000);
        result.current.setTaskLoading('task-2', true, 2000);
        result.current.clearAllLoading();
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('内存泄漏预防', () => {
    it('组件卸载时应该清理所有定时器', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const { result, unmount } = renderHook(() => useLoadingState());

      act(() => {
        result.current.setTaskLoading('task-1', true, 1000);
        result.current.setTaskLoading('task-2', true, 2000);
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('多次设置和清除不应该导致内存泄漏', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        // 多次设置和清除
        for (let i = 0; i < 10; i++) {
          result.current.setTaskLoading(`task-${i}`, true);
          result.current.setTaskLoading(`task-${i}`, false);
        }
        result.current.clearAllLoading();
      });

      // 验证所有任务都已清除
      for (let i = 0; i < 10; i++) {
        expect(result.current.isTaskLoading(`task-${i}`)).toBe(false);
      }
    });
  });
});

