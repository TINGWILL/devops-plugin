import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchOperations } from '../useBatchOperations';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus, OperationType } from '../../constants/deploymentStatus';
import { Toast } from '@douyinfe/semi-ui';

// Mock Toast
vi.mock('@douyinfe/semi-ui', () => ({
  Toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useBatchOperations', () => {
  const createMockTask = (
    key: string,
    status: DeploymentStatus
  ): DeploymentTask => ({
    key,
    appName: `App ${key}`,
    taskStatus: status,
    deployStatus: status,
    podStatus: 'running',
    version: 'v1.0.0',
    cluster: 'cluster1',
    namespace: 'default',
    envTag: 'prod',
    deployTime: Date.now(),
    deployer: 'user1',
    avatarBg: '#1890FF',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('selectedKeys', () => {
    it('应该初始化空选中列表', () => {
      const { result } = renderHook(() => useBatchOperations());

      expect(result.current.selectedKeys).toEqual([]);
    });

    it('应该可以设置选中keys', () => {
      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['key1', 'key2']);
      });

      expect(result.current.selectedKeys).toEqual(['key1', 'key2']);
    });
  });

  describe('getBatchApplicability', () => {
    it('应该正确分离适用和不适用的任务', () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING), // 可部署
        createMockTask('2', DeploymentStatus.DEPLOYED), // 不可部署
        createMockTask('3', DeploymentStatus.PENDING), // 可部署
      ];

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1', '2', '3']);
      });

      const applicability = result.current.getBatchApplicability(
        tasks,
        OperationType.DEPLOY
      );

      expect(applicability.applicable).toHaveLength(2);
      expect(applicability.applicable.map(t => t.key)).toEqual(['1', '3']);
      expect(applicability.notApplicable).toHaveLength(1);
      expect(applicability.notApplicable[0].key).toBe('2');
    });

    it('当没有选中任务时应该返回空结果', () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
      ];

      const { result } = renderHook(() => useBatchOperations());

      const applicability = result.current.getBatchApplicability(
        tasks,
        OperationType.DEPLOY
      );

      expect(applicability.applicable).toHaveLength(0);
      expect(applicability.notApplicable).toHaveLength(0);
    });

    it('应该只考虑选中的任务', () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
        createMockTask('2', DeploymentStatus.PENDING),
        createMockTask('3', DeploymentStatus.PENDING),
      ];

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1']);
      });

      const applicability = result.current.getBatchApplicability(
        tasks,
        OperationType.DEPLOY
      );

      expect(applicability.applicable).toHaveLength(1);
      expect(applicability.applicable[0].key).toBe('1');
    });
  });

  describe('canPerformBatchOperation', () => {
    it('当有适用任务时应该返回 true', () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
      ];

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1']);
      });

      const canPerform = result.current.canPerformBatchOperation(
        tasks,
        OperationType.DEPLOY
      );

      expect(canPerform).toBe(true);
    });

    it('当没有选中任务时应该返回 false', () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
      ];

      const { result } = renderHook(() => useBatchOperations());

      const canPerform = result.current.canPerformBatchOperation(
        tasks,
        OperationType.DEPLOY
      );

      expect(canPerform).toBe(false);
    });

    it('当所有选中任务都不适用时应该返回 false', () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.DEPLOYED),
      ];

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1']);
      });

      const canPerform = result.current.canPerformBatchOperation(
        tasks,
        OperationType.DEPLOY
      );

      expect(canPerform).toBe(false);
    });
  });

  describe('handleBatchOperation', () => {
    it('当没有选中任务时应该显示警告', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
      ];
      const mockOnOperation = vi.fn();

      const { result } = renderHook(() => useBatchOperations());

      await act(async () => {
        await result.current.handleBatchOperation(
          OperationType.DEPLOY,
          tasks,
          mockOnOperation
        );
      });

      expect(Toast.warning).toHaveBeenCalledWith('请先选择要操作的任务');
      expect(mockOnOperation).not.toHaveBeenCalled();
    });

    it('当没有适用任务时应该显示警告', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.DEPLOYED),
      ];
      const mockOnOperation = vi.fn();

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1']);
      });

      await act(async () => {
        await result.current.handleBatchOperation(
          OperationType.DEPLOY,
          tasks,
          mockOnOperation
        );
      });

      expect(Toast.warning).toHaveBeenCalled();
      expect(mockOnOperation).not.toHaveBeenCalled();
    });

    it('批量部署应该立即调用接口并清空选中状态', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
        createMockTask('2', DeploymentStatus.PENDING),
      ];
      const mockOnOperation = vi.fn(() => Promise.resolve());
      vi.useFakeTimers();

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1', '2']);
      });

      await act(async () => {
        await result.current.handleBatchOperation(
          OperationType.DEPLOY,
          tasks,
          mockOnOperation
        );
        vi.advanceTimersByTime(100);
      });

      // 批量部署应该立即调用接口（不等待）
      expect(mockOnOperation).toHaveBeenCalledTimes(2);
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('提交批量部署任务成功')
      );
      // 检查选中状态已清空
      expect(result.current.selectedKeys).toEqual([]);
      
      vi.useRealTimers();
    });

    it('其他批量操作应该等待执行完成', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
      ];
      const mockOnOperation = vi.fn(() => Promise.resolve());

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1']);
      });

      await act(async () => {
        await result.current.handleBatchOperation(
          OperationType.WHITELIST,
          tasks,
          mockOnOperation
        );
      });

      expect(mockOnOperation).toHaveBeenCalledWith(
        OperationType.WHITELIST,
        tasks[0],
        true // silent mode
      );
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('批量')
      );
      expect(result.current.selectedKeys).toEqual([]);
    });

    it('应该调用 onSuccess 回调', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
      ];
      const mockOnOperation = vi.fn(() => Promise.resolve());
      const mockOnSuccess = vi.fn();

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1']);
      });

      await act(async () => {
        await result.current.handleBatchOperation(
          OperationType.WHITELIST,
          tasks,
          mockOnOperation,
          mockOnSuccess
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('当操作失败时应该显示错误提示', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', DeploymentStatus.PENDING),
      ];
      const mockOnOperation = vi.fn(() => Promise.reject(new Error('Failed')));

      const { result } = renderHook(() => useBatchOperations());

      act(() => {
        result.current.setSelectedKeys(['1']);
      });

      await act(async () => {
        await result.current.handleBatchOperation(
          OperationType.WHITELIST,
          tasks,
          mockOnOperation
        );
      });

      expect(Toast.error).toHaveBeenCalled();
    });
  });
});

