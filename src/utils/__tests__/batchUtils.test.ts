import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateGroupKey,
  sortTasksByDeployOrder,
  groupTasksByBatch,
} from '../batchUtils';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus } from '../../constants/deploymentStatus';

describe('batchUtils', () => {
  const createMockTask = (
    key: string,
    deployOrder?: number,
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
    deployOrder,
    groupKey,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateGroupKey', () => {
    it('应该生成格式正确的分组标识符', () => {
      const key = generateGroupKey();

      expect(key).toMatch(/^BATCH-\d+-[a-z0-9]+$/);
    });

    it('应该生成唯一的分组标识符', () => {
      const key1 = generateGroupKey();
      // 等待一毫秒确保时间戳不同
      vi.advanceTimersByTime(1);
      const key2 = generateGroupKey();

      expect(key1).not.toBe(key2);
    });

    it('生成的标识符应该包含时间戳', () => {
      const before = Date.now();
      const key = generateGroupKey();
      const after = Date.now();

      const timestamp = parseInt(key.match(/BATCH-(\d+)-/)?.[1] || '0');
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('sortTasksByDeployOrder', () => {
    it('应该按部署顺序排序任务', () => {
      const tasks = [
        createMockTask('1', 3),
        createMockTask('2', 1),
        createMockTask('3', 2),
      ];

      const sorted = sortTasksByDeployOrder(tasks);

      expect(sorted.map(t => t.key)).toEqual(['2', '3', '1']);
    });

    it('没有部署顺序的任务应该排在最后', () => {
      const tasks = [
        createMockTask('1', 2),
        createMockTask('2'), // 无 deployOrder
        createMockTask('3', 1),
      ];

      const sorted = sortTasksByDeployOrder(tasks);

      expect(sorted.map(t => t.key)).toEqual(['3', '1', '2']);
    });

    it('所有任务都没有部署顺序时应该保持原顺序', () => {
      const tasks = [
        createMockTask('1'),
        createMockTask('2'),
        createMockTask('3'),
      ];

      const sorted = sortTasksByDeployOrder(tasks);

      expect(sorted.map(t => t.key)).toEqual(['1', '2', '3']);
    });

    it('空数组应该返回空数组', () => {
      const sorted = sortTasksByDeployOrder([]);

      expect(sorted).toEqual([]);
    });

    it('单个任务应该保持不变', () => {
      const tasks = [createMockTask('1', 1)];

      const sorted = sortTasksByDeployOrder(tasks);

      expect(sorted).toEqual(tasks);
    });
  });

  describe('groupTasksByBatch', () => {
    it('应该按 groupKey 分组任务', () => {
      const tasks = [
        createMockTask('1', undefined, 'group-1'),
        createMockTask('2', undefined, 'group-1'),
        createMockTask('3', undefined, 'group-2'),
      ];

      const result = groupTasksByBatch(tasks);

      expect(result.batches).toHaveLength(2);
      expect(result.unbatchedTasks).toHaveLength(0);
      expect(result.batches[0].tasks).toHaveLength(2);
      expect(result.batches[1].tasks).toHaveLength(1);
    });

    it('没有 groupKey 的任务应该归为未分组', () => {
      const tasks = [
        createMockTask('1', undefined, 'group-1'),
        createMockTask('2'), // 无 groupKey
        createMockTask('3'), // 无 groupKey
      ];

      const result = groupTasksByBatch(tasks);

      expect(result.batches).toHaveLength(1);
      expect(result.unbatchedTasks).toHaveLength(2);
      expect(result.unbatchedTasks.map(t => t.key)).toEqual(['2', '3']);
    });

    it('groupKey 为 "0" 的任务应该归为未分组', () => {
      const tasks = [
        createMockTask('1', undefined, 'group-1'),
        createMockTask('2', undefined, '0'),
      ];

      const result = groupTasksByBatch(tasks);

      expect(result.batches).toHaveLength(1);
      expect(result.unbatchedTasks).toHaveLength(1);
      expect(result.unbatchedTasks[0].key).toBe('2');
    });

    it('应该按创建时间排序批次', () => {
      const now = Date.now();
      const tasks = [
        createMockTask('1', undefined, 'group-2', now + 2000), // 后创建
        createMockTask('2', undefined, 'group-1', now + 1000), // 先创建
        createMockTask('3', undefined, 'group-2', now + 2000),
      ];

      const result = groupTasksByBatch(tasks);

      expect(result.batches).toHaveLength(2);
      expect(result.batches[0].batchNumber).toBe(1); // group-1 先创建
      expect(result.batches[1].batchNumber).toBe(2); // group-2 后创建
    });

    it('应该为每个批次生成批次号', () => {
      const tasks = [
        createMockTask('1', undefined, 'group-1'),
        createMockTask('2', undefined, 'group-2'),
        createMockTask('3', undefined, 'group-3'),
      ];

      const result = groupTasksByBatch(tasks);

      expect(result.batches).toHaveLength(3);
      expect(result.batches[0].batchNumber).toBe(1);
      expect(result.batches[1].batchNumber).toBe(2);
      expect(result.batches[2].batchNumber).toBe(3);
    });

    it('应该对批次内的任务按部署顺序排序', () => {
      const tasks = [
        createMockTask('1', 3, 'group-1'),
        createMockTask('2', 1, 'group-1'),
        createMockTask('3', 2, 'group-1'),
      ];

      const result = groupTasksByBatch(tasks);

      expect(result.batches[0].tasks.map(t => t.key)).toEqual(['2', '3', '1']);
    });

    it('空数组应该返回空结果', () => {
      const result = groupTasksByBatch([]);

      expect(result.batches).toEqual([]);
      expect(result.unbatchedTasks).toEqual([]);
    });

    it('所有任务都未分组时应该返回空批次列表', () => {
      const tasks = [
        createMockTask('1'),
        createMockTask('2'),
      ];

      const result = groupTasksByBatch(tasks);

      expect(result.batches).toEqual([]);
      expect(result.unbatchedTasks).toHaveLength(2);
    });
  });
});

