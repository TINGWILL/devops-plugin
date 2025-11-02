import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useDeploymentStore, initDeploymentStore } from '../deploymentStore';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus } from '../../constants/deploymentStatus';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import * as storageUtils from '../../utils/storageUtils';

// Mock storageUtils
vi.mock('../../utils/storageUtils', () => ({
  saveToStorage: vi.fn(),
  loadFromStorage: vi.fn(),
}));

describe('deploymentStore', () => {
  const createMockTask = (key: string): DeploymentTask => ({
    key,
    appName: `App ${key}`,
    taskStatus: DeploymentStatus.PENDING,
    deployStatus: DeploymentStatus.PENDING,
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
    
    // 重置 store 到初始状态
    useDeploymentStore.getState().reset();
    
    // Mock loadFromStorage 返回 null
    vi.mocked(storageUtils.loadFromStorage).mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setTasks', () => {
    it('应该设置任务列表', () => {
      const tasks = [createMockTask('1'), createMockTask('2')];

      act(() => {
        useDeploymentStore.getState().setTasks(tasks);
      });

      expect(useDeploymentStore.getState().tasks).toEqual(tasks);
    });

    it('应该支持函数式更新', () => {
      const tasks = [createMockTask('1')];

      act(() => {
        useDeploymentStore.getState().setTasks(tasks);
        useDeploymentStore.getState().setTasks((prev) => [...prev, createMockTask('2')]);
      });

      expect(useDeploymentStore.getState().tasks).toHaveLength(2);
    });

    it('应该自动保存到 localStorage', () => {
      const tasks = [createMockTask('1')];

      act(() => {
        useDeploymentStore.getState().setTasks(tasks);
        vi.advanceTimersByTime(100);
      });

      expect(storageUtils.saveToStorage).toHaveBeenCalledWith(
        STORAGE_KEYS.TASKS_DATA,
        tasks
      );
    });
  });

  describe('updateTask', () => {
    it('应该更新指定任务', () => {
      const task = createMockTask('1');

      act(() => {
        useDeploymentStore.getState().setTasks([task]);
        useDeploymentStore.getState().updateTask('1', {
          taskStatus: DeploymentStatus.DEPLOYING,
        });
      });

      const updatedTask = useDeploymentStore.getState().tasks[0];
      expect(updatedTask.taskStatus).toBe(DeploymentStatus.DEPLOYING);
      expect(updatedTask.key).toBe('1'); // 其他字段保持不变
    });

    it('不存在的任务不应该被更新', () => {
      act(() => {
        useDeploymentStore.getState().setTasks([createMockTask('1')]);
        useDeploymentStore.getState().updateTask('non-existent', {
          taskStatus: DeploymentStatus.DEPLOYING,
        });
      });

      expect(useDeploymentStore.getState().tasks[0].taskStatus).toBe(
        DeploymentStatus.PENDING
      );
    });

    it('应该自动保存到 localStorage', () => {
      const task = createMockTask('1');

      act(() => {
        useDeploymentStore.getState().setTasks([task]);
        useDeploymentStore.getState().updateTask('1', {
          taskStatus: DeploymentStatus.DEPLOYING,
        });
        vi.advanceTimersByTime(100);
      });

      expect(storageUtils.saveToStorage).toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('应该删除指定任务', () => {
      const tasks = [createMockTask('1'), createMockTask('2')];

      act(() => {
        useDeploymentStore.getState().setTasks(tasks);
        useDeploymentStore.getState().deleteTask('1');
      });

      const remainingTasks = useDeploymentStore.getState().tasks;
      expect(remainingTasks).toHaveLength(1);
      expect(remainingTasks[0].key).toBe('2');
    });

    it('删除任务时应该同时清除选中状态', () => {
      act(() => {
        useDeploymentStore.getState().setTasks([
          createMockTask('1'),
          createMockTask('2'),
        ]);
        useDeploymentStore.getState().setSelectedKeys(['1', '2']);
        useDeploymentStore.getState().deleteTask('1');
      });

      expect(useDeploymentStore.getState().selectedKeys).toEqual(['2']);
    });

    it('应该自动保存到 localStorage', () => {
      act(() => {
        useDeploymentStore.getState().setTasks([createMockTask('1')]);
        useDeploymentStore.getState().deleteTask('1');
        vi.advanceTimersByTime(100);
      });

      expect(storageUtils.saveToStorage).toHaveBeenCalled();
    });
  });

  describe('addTasks', () => {
    it('应该添加新任务到列表', () => {
      const existingTasks = [createMockTask('1')];
      const newTasks = [createMockTask('2'), createMockTask('3')];

      act(() => {
        useDeploymentStore.getState().setTasks(existingTasks);
        useDeploymentStore.getState().addTasks(newTasks);
      });

      expect(useDeploymentStore.getState().tasks).toHaveLength(3);
      expect(useDeploymentStore.getState().tasks.map(t => t.key)).toEqual([
        '1',
        '2',
        '3',
      ]);
    });

    it('应该自动保存到 localStorage', () => {
      act(() => {
        useDeploymentStore.getState().setTasks([createMockTask('1')]);
        useDeploymentStore.getState().addTasks([createMockTask('2')]);
        vi.advanceTimersByTime(100);
      });

      expect(storageUtils.saveToStorage).toHaveBeenCalled();
    });
  });

  describe('setSelectedKeys', () => {
    it('应该设置选中的keys', () => {
      act(() => {
        useDeploymentStore.getState().setSelectedKeys(['1', '2']);
      });

      expect(useDeploymentStore.getState().selectedKeys).toEqual(['1', '2']);
    });

    it('应该支持函数式更新', () => {
      act(() => {
        useDeploymentStore.getState().setSelectedKeys(['1']);
        useDeploymentStore.getState().setSelectedKeys((prev) => [...prev, '2']);
      });

      expect(useDeploymentStore.getState().selectedKeys).toEqual(['1', '2']);
    });
  });

  describe('setExpandedGroupKeys', () => {
    it('应该设置展开的分组keys', () => {
      act(() => {
        useDeploymentStore.getState().setExpandedGroupKeys(['group-1']);
      });

      expect(useDeploymentStore.getState().expandedGroupKeys).toEqual(['group-1']);
    });

    it('应该支持函数式更新', () => {
      act(() => {
        useDeploymentStore.getState().setExpandedGroupKeys(['group-1']);
        useDeploymentStore.getState().setExpandedGroupKeys((prev) => [
          ...prev,
          'group-2',
        ]);
      });

      expect(useDeploymentStore.getState().expandedGroupKeys).toEqual([
        'group-1',
        'group-2',
      ]);
    });

    it('应该自动保存到 localStorage', () => {
      act(() => {
        useDeploymentStore.getState().setExpandedGroupKeys(['group-1']);
        vi.advanceTimersByTime(100);
      });

      expect(storageUtils.saveToStorage).toHaveBeenCalledWith(
        STORAGE_KEYS.EXPANDED_GROUP_KEYS,
        ['group-1']
      );
    });
  });

  describe('reset', () => {
    it('应该重置所有状态', () => {
      act(() => {
        useDeploymentStore.getState().setTasks([createMockTask('1')]);
        useDeploymentStore.getState().setSelectedKeys(['1']);
        useDeploymentStore.getState().setExpandedGroupKeys(['group-1']);
        useDeploymentStore.getState().reset();
      });

      expect(useDeploymentStore.getState().tasks).toEqual([]);
      expect(useDeploymentStore.getState().selectedKeys).toEqual([]);
      expect(useDeploymentStore.getState().expandedGroupKeys).toEqual([]);
    });

    it('应该清除 localStorage', () => {
      act(() => {
        useDeploymentStore.getState().reset();
      });

      expect(storageUtils.saveToStorage).toHaveBeenCalledWith(
        STORAGE_KEYS.TASKS_DATA,
        []
      );
      expect(storageUtils.saveToStorage).toHaveBeenCalledWith(
        STORAGE_KEYS.EXPANDED_GROUP_KEYS,
        []
      );
    });
  });

  describe('initDeploymentStore', () => {
    it('应该从 localStorage 加载任务数据', () => {
      const storedTasks = [createMockTask('1'), createMockTask('2')];
      vi.mocked(storageUtils.loadFromStorage).mockImplementation((key) => {
        if (key === STORAGE_KEYS.TASKS_DATA) {
          return storedTasks;
        }
        return null;
      });

      initDeploymentStore();

      expect(useDeploymentStore.getState().tasks).toEqual(storedTasks);
    });

    it('应该从 localStorage 加载展开的分组keys', () => {
      const storedKeys = ['group-1', 'group-2'];
      vi.mocked(storageUtils.loadFromStorage).mockImplementation((key) => {
        if (key === STORAGE_KEYS.EXPANDED_GROUP_KEYS) {
          return storedKeys;
        }
        return null;
      });

      initDeploymentStore();

      expect(useDeploymentStore.getState().expandedGroupKeys).toEqual(storedKeys);
    });

    it('当存储数据无效时应该忽略', () => {
      vi.mocked(storageUtils.loadFromStorage).mockReturnValue(null);

      initDeploymentStore();

      expect(useDeploymentStore.getState().tasks).toEqual([]);
      expect(useDeploymentStore.getState().expandedGroupKeys).toEqual([]);
    });

    it('当存储数据不是数组时应该忽略', () => {
      vi.mocked(storageUtils.loadFromStorage).mockImplementation((key) => {
        if (key === STORAGE_KEYS.TASKS_DATA) {
          return { invalid: 'data' } as any;
        }
        return null;
      });

      initDeploymentStore();

      expect(useDeploymentStore.getState().tasks).toEqual([]);
    });
  });
});
