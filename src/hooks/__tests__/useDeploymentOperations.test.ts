import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeploymentOperations } from '../useDeploymentOperations';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus, OperationType } from '../../constants/deploymentStatus';
import { useDeploymentStore } from '../../stores/deploymentStore';
import { Toast } from '@douyinfe/semi-ui';

// Mock Toast
vi.mock('@douyinfe/semi-ui', () => ({
  Toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock store
vi.mock('../../stores/deploymentStore', () => ({
  useDeploymentStore: vi.fn(),
}));

describe('useDeploymentOperations', () => {
  const mockUpdateTask = vi.fn();
  const mockDeleteTask = vi.fn();

  const createMockTask = (status: DeploymentStatus): DeploymentTask => ({
    key: 'task-1',
    appName: 'Test App',
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
    vi.useFakeTimers();
    
    (useDeploymentStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => {
        if (selector.toString().includes('updateTask')) {
          return mockUpdateTask;
        }
        if (selector.toString().includes('deleteTask')) {
          return mockDeleteTask;
        }
        return undefined;
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('updateTaskStatus', () => {
    it('应该更新任务状态', () => {
      const { result } = renderHook(() => useDeploymentOperations());

      act(() => {
        result.current.updateTaskStatus('task-1', DeploymentStatus.DEPLOYING);
      });

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', {
        taskStatus: DeploymentStatus.DEPLOYING,
      });
    });
  });

  describe('handleDeploy', () => {
    it('应该成功执行部署并更新状态', async () => {
      const task = createMockTask(DeploymentStatus.PENDING);
      const onLoadingChange = vi.fn();

      // Mock Math.random 返回 0.5 (成功)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        const promise = result.current.handleOperation(
          OperationType.DEPLOY,
          task,
          false,
          onLoadingChange
        );
        vi.advanceTimersByTime(2000);
        await promise;
      });

      expect(onLoadingChange).toHaveBeenCalledWith(true);
      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.key,
        expect.objectContaining({ taskStatus: DeploymentStatus.DEPLOYING })
      );
      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.key,
        expect.objectContaining({ taskStatus: DeploymentStatus.DEPLOYED })
      );
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('开始执行部署')
      );
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('部署成功')
      );
      expect(onLoadingChange).toHaveBeenCalledWith(false);

      vi.spyOn(Math, 'random').mockRestore();
    });

    it('部署失败时应该更新错误状态', async () => {
      const task = createMockTask(DeploymentStatus.PENDING);
      const onLoadingChange = vi.fn();

      // Mock Math.random 返回 0.1 (失败)
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        const promise = result.current.handleOperation(
          OperationType.DEPLOY,
          task,
          false,
          onLoadingChange
        );
        vi.advanceTimersByTime(2000);
        await promise;
      });

      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.key,
        expect.objectContaining({
          taskStatus: DeploymentStatus.DEPLOYMENT_FAILED,
          errorMessage: expect.any(String),
          errorTime: expect.any(Number),
        })
      );
      expect(Toast.error).toHaveBeenCalledWith(
        expect.stringContaining('部署失败')
      );
      expect(onLoadingChange).toHaveBeenCalledWith(false);

      vi.spyOn(Math, 'random').mockRestore();
    });

    it('静默模式不应该显示 Toast', async () => {
      const task = createMockTask(DeploymentStatus.PENDING);
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        const promise = result.current.handleOperation(
          OperationType.DEPLOY,
          task,
          true // silent
        );
        vi.advanceTimersByTime(2000);
        await promise;
      });

      expect(Toast.success).not.toHaveBeenCalled();

      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('handleWhitelist', () => {
    it('应该更新状态并显示提示', async () => {
      const task = createMockTask(DeploymentStatus.PENDING);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        const promise = result.current.handleOperation(
          OperationType.WHITELIST,
          task
        );
        vi.advanceTimersByTime(1500);
        await promise;
      });

      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.key,
        expect.objectContaining({ taskStatus: DeploymentStatus.APPROVING })
      );
      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.key,
        expect.objectContaining({ taskStatus: DeploymentStatus.PENDING })
      );
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('开始申请加白')
      );
    });
  });

  describe('handleVerifyPass', () => {
    it('应该更新状态为部署结束', async () => {
      const task = createMockTask(DeploymentStatus.DEPLOYED);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        await result.current.handleOperation(OperationType.VERIFY_PASS, task);
      });

      expect(mockUpdateTask).toHaveBeenCalledWith(task.key, {
        taskStatus: DeploymentStatus.DEPLOYMENT_ENDED,
      });
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('验证通过')
      );
    });
  });

  describe('handleRollback', () => {
    it('应该更新状态并显示提示', async () => {
      const task = createMockTask(DeploymentStatus.DEPLOYMENT_FAILED);
      const onLoadingChange = vi.fn();

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        const promise = result.current.handleOperation(
          OperationType.ROLLBACK,
          task,
          false,
          onLoadingChange
        );
        vi.advanceTimersByTime(2000);
        await promise;
      });

      expect(onLoadingChange).toHaveBeenCalledWith(true);
      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.key,
        expect.objectContaining({ taskStatus: DeploymentStatus.ROLLING_BACK })
      );
      expect(mockUpdateTask).toHaveBeenCalledWith(
        task.key,
        expect.objectContaining({ taskStatus: DeploymentStatus.DEPLOYMENT_ENDED })
      );
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('回滚成功')
      );
      expect(onLoadingChange).toHaveBeenCalledWith(false);
    });
  });

  describe('handleOpsIntervention', () => {
    it('应该更新状态为部署结束', async () => {
      const task = createMockTask(DeploymentStatus.DEPLOYMENT_FAILED);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        await result.current.handleOperation(
          OperationType.OPS_INTERVENTION,
          task
        );
      });

      expect(mockUpdateTask).toHaveBeenCalledWith(task.key, {
        taskStatus: DeploymentStatus.DEPLOYMENT_ENDED,
      });
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('运维介入处理')
      );
    });
  });

  describe('handleDelete', () => {
    it('应该删除任务', async () => {
      const task = createMockTask(DeploymentStatus.PENDING);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        await result.current.handleOperation(OperationType.DELETE, task);
      });

      expect(mockDeleteTask).toHaveBeenCalledWith(task.key);
      expect(Toast.success).toHaveBeenCalledWith(
        expect.stringContaining('已删除')
      );
    });
  });

  describe('handleOperation', () => {
    it('当操作不适用时应该显示警告', async () => {
      const task = createMockTask(DeploymentStatus.DEPLOYED); // 已部署状态不能再次部署

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        await result.current.handleOperation(OperationType.DEPLOY, task);
      });

      expect(Toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('操作不适用于当前状态')
      );
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('静默模式下不适用操作不应该显示警告', async () => {
      const task = createMockTask(DeploymentStatus.DEPLOYED);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        await result.current.handleOperation(OperationType.DEPLOY, task, true);
      });

      expect(Toast.warning).not.toHaveBeenCalled();
    });

    it('未知操作应该显示警告', async () => {
      const task = createMockTask(DeploymentStatus.PENDING);

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        // @ts-expect-error - 测试未知操作
        await result.current.handleOperation('unknown', task);
      });

      expect(Toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('未知操作')
      );
    });

    it('操作执行失败时应该显示错误', async () => {
      const task = createMockTask(DeploymentStatus.PENDING);
      const error = new Error('Operation failed');
      
      mockUpdateTask.mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useDeploymentOperations());

      await act(async () => {
        try {
          await result.current.handleOperation(OperationType.DEPLOY, task);
        } catch (e) {
          // 错误会被重新抛出
        }
      });

      expect(Toast.error).toHaveBeenCalledWith('操作执行失败');
    });
  });
});

