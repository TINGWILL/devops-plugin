import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getBatchGroups, clearStoredBatchData } from '../batchApi';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus } from '../../constants/deploymentStatus';

describe('batchApi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockTask = (
    key: string,
    groupKey?: string,
    deployTime?: number
  ): DeploymentTask => ({
    key,
    appName: `App ${key}`,
    taskStatus: DeploymentStatus.PENDING,
    deployStatus: DeploymentStatus.PENDING,
    podStatus: 'running',
    version: 'v1.0.0',
    cluster: 'cluster1',
    namespace: 'default',
    envTag: 'prod',
    deployTime: deployTime || Date.now(),
    deployer: 'user1',
    avatarBg: '#1890FF',
    groupKey,
  });

  describe('getBatchGroups', () => {
    it('应该返回批次分组数据和未分组任务', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-1', 1000),
        createMockTask('2', 'group-1', 2000),
        createMockTask('3', 'group-2', 3000),
        createMockTask('4'), // 未分组
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result.batches).toHaveLength(2);
      expect(result.unbatchedTasks).toHaveLength(1);
      expect(result.unbatchedTasks[0].key).toBe('4');
    });

    it('应该按创建时间排序批次', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-2', 2000), // 后创建
        createMockTask('2', 'group-1', 1000), // 先创建
        createMockTask('3', 'group-1', 1500),
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result.batches).toHaveLength(2);
      expect(result.batches[0].batchId).toBe('group-1'); // 先创建的在前
      expect(result.batches[1].batchId).toBe('group-2');
    });

    it('应该为批次分配批次号', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-1', 1000),
        createMockTask('2', 'group-2', 2000),
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      expect(result.batches[0].batchNumber).toBe(1);
      expect(result.batches[1].batchNumber).toBe(2);
    });

    it('应该从 localStorage 恢复批次信息', async () => {
      const storedTasks: DeploymentTask[] = [
        createMockTask('1', 'group-stored', 1000),
      ];
      localStorage.setItem('devops_batch_data', JSON.stringify(storedTasks));

      const tasks: DeploymentTask[] = [
        createMockTask('1'), // 当前没有 groupKey
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      // 应该从存储中恢复 groupKey
      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].batchId).toBe('group-stored');
    });

    it('应该优先使用当前任务的 groupKey', async () => {
      const storedTasks: DeploymentTask[] = [
        createMockTask('1', 'group-stored', 1000),
      ];
      localStorage.setItem('devops_batch_data', JSON.stringify(storedTasks));

      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-current', 2000), // 当前有 groupKey
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      // 应该使用当前的 groupKey，而不是存储的
      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].batchId).toBe('group-current');
    });

    it('应该保存批次数据到 localStorage', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-1'),
        createMockTask('2', 'group-2'),
        createMockTask('3'), // 未分组，不应该保存
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      await promise;

      const stored = localStorage.getItem('devops_batch_data');
      expect(stored).toBeTruthy();
      
      const storedTasks = JSON.parse(stored!);
      expect(storedTasks).toHaveLength(2);
      expect(storedTasks.some((t: DeploymentTask) => t.groupKey === 'group-1')).toBe(true);
      expect(storedTasks.some((t: DeploymentTask) => t.groupKey === 'group-2')).toBe(true);
    });

    it('应该过滤掉 groupKey 为 "0" 的任务', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-1'),
        createMockTask('2', '0'), // 不应该保存
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      await promise;

      const stored = localStorage.getItem('devops_batch_data');
      const storedTasks = JSON.parse(stored!);
      expect(storedTasks).toHaveLength(1);
      expect(storedTasks[0].groupKey).toBe('group-1');
    });

    it('应该处理 localStorage 读取错误', async () => {
      // Mock localStorage.getItem 抛出错误
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-1'),
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      // 应该不抛出错误，正常返回结果
      expect(result.batches).toHaveLength(1);
      
      getItemSpy.mockRestore();
    });

    it('应该处理 localStorage 保存错误', async () => {
      // Mock localStorage.setItem 抛出错误
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-1'),
      ];

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      // 应该不抛出错误，正常返回结果
      expect(result.batches).toHaveLength(1);
      
      setItemSpy.mockRestore();
    });

    it('应该按部署顺序排序批次内的任务', async () => {
      const tasks: DeploymentTask[] = [
        createMockTask('1', 'group-1'),
        createMockTask('2', 'group-1'),
        createMockTask('3', 'group-1'),
      ];
      
      // 设置部署顺序
      tasks[0].deployOrder = 3;
      tasks[1].deployOrder = 1;
      tasks[2].deployOrder = 2;

      const promise = getBatchGroups(tasks);
      vi.advanceTimersByTime(200);
      const result = await promise;

      const batch = result.batches.find(b => b.batchId === 'group-1');
      expect(batch).toBeDefined();
      expect(batch!.tasks[0].key).toBe('2'); // 顺序 1
      expect(batch!.tasks[1].key).toBe('3'); // 顺序 2
      expect(batch!.tasks[2].key).toBe('1'); // 顺序 3
    });
  });

  describe('clearStoredBatchData', () => {
    it('应该清除 localStorage 中的批次数据', () => {
      localStorage.setItem('devops_batch_data', JSON.stringify([createMockTask('1', 'group-1')]));
      
      clearStoredBatchData();
      
      expect(localStorage.getItem('devops_batch_data')).toBeNull();
    });

    it('应该处理清除错误', () => {
      // Mock localStorage.removeItem 抛出错误
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // 应该不抛出错误
      expect(() => clearStoredBatchData()).not.toThrow();
      
      removeItemSpy.mockRestore();
    });
  });
});

