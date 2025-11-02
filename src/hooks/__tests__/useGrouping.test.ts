import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGrouping } from '../useGrouping';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus } from '../../constants/deploymentStatus';
import { STORAGE_KEYS } from '../../constants/storageKeys';

describe('useGrouping', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
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
        groupKey,
        deployTime: deployTime || Date.now(),
        version: 'v1.0.0',
        cluster: 'cluster1',
        namespace: 'default',
        envTag: 'prod',
        podStatus: 'running',
        deployer: 'user1',
        avatarBg: '#1890FF',
    });

    it('应该正确检测是否显示分组', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1'),
            createMockTask('2', 'group-1'),
            createMockTask('3'), // 无分组
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        expect(result.current.showGrouping).toBe(true);
    });

    it('当没有分组任务时，不应该显示分组', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1'),
            createMockTask('2'),
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        expect(result.current.showGrouping).toBe(false);
    });

    it('应该正确计算所有分组 keys', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1'),
            createMockTask('2', 'group-1'),
            createMockTask('3', 'group-2'),
            createMockTask('4'), // 默认分组
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        expect(result.current.allGroupKeys).toContain('group-1');
        expect(result.current.allGroupKeys).toContain('group-2');
        expect(result.current.allGroupKeys).toContain('0'); // 默认分组
    });

    it('应该正确构建分组信息映射', () => {
        const now = Date.now();
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1', now),
            createMockTask('2', 'group-1', now + 1000),
            createMockTask('3', 'group-2', now + 2000),
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        const groupInfo1 = result.current.groupInfoMap.get('group-1');
        expect(groupInfo1).toBeDefined();
        expect(groupInfo1?.taskCount).toBe(2);
        expect(groupInfo1?.groupNumber).toBe(1);
        expect(groupInfo1?.createTime).toBe(now);

        const groupInfo2 = result.current.groupInfoMap.get('group-2');
        expect(groupInfo2).toBeDefined();
        expect(groupInfo2?.taskCount).toBe(1);
        expect(groupInfo2?.groupNumber).toBe(2);
    });

    it('应该正确比较分组顺序', () => {
        const now = Date.now();
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1', now + 2000),
            createMockTask('2', 'group-2', now + 1000),
            createMockTask('3'), // 默认分组
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        const task1 = createMockTask('1', 'group-1', now + 2000);
        const task2 = createMockTask('2', 'group-2', now + 1000);
        const task3 = createMockTask('3');

        // group-2 应该在 group-1 之前（时间更早）
        expect(result.current.compareGroupOrder(task2, task1)).toBeLessThan(0);

        // 默认分组应该在最后
        expect(result.current.compareGroupOrder(task3, task1)).toBeGreaterThan(0);
        expect(result.current.compareGroupOrder(task3, task2)).toBeGreaterThan(0);

        // 同一分组内应该返回 0
        expect(result.current.compareGroupOrder(task1, task1)).toBe(0);
    });

    it('应该正确处理分组展开/收起', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1'),
            createMockTask('2', 'group-2'),
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        act(() => {
            result.current.handleExpandedRowsChange(['group-1', 'group-2']);
        });

        expect(result.current.expandedRowKeys).toContain('group-1');
        expect(result.current.expandedRowKeys).toContain('group-2');
    });

    it('应该正确获取分组标签颜色', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1'),
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        const color1 = result.current.getGroupTagColor(1);
        expect(color1.bg).toBe('#E6F4FF');
        expect(color1.text).toBe('#1890FF');

        const color2 = result.current.getGroupTagColor(2);
        expect(color2.bg).toBe('#FFF7E6');
        expect(color2.text).toBe('#FA8C16');

        // 循环使用颜色
        const color6 = result.current.getGroupTagColor(6);
        expect(color6.bg).toBe('#E6F4FF'); // 回到第一个颜色
    });

    it('应该正确构建表格数据源（按分组排序）', () => {
        const now = Date.now();
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1', now + 2000),
            createMockTask('2', 'group-2', now + 1000),
            createMockTask('3'), // 默认分组
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        // group-2 应该在 group-1 之前
        const group2Index = result.current.tableDataSource.findIndex(t => t.key === '2');
        const group1Index = result.current.tableDataSource.findIndex(t => t.key === '1');
        expect(group2Index).toBeLessThan(group1Index);

        // 默认分组应该在最后
        const defaultIndex = result.current.tableDataSource.findIndex(t => t.key === '3');
        expect(defaultIndex).toBeGreaterThan(group1Index);
        expect(defaultIndex).toBeGreaterThan(group2Index);
    });

    it('当用户手动收起所有分组后，重新加载时应保持收起状态', () => {
        // 模拟用户手动收起所有分组：在 localStorage 中保存空数组
        localStorage.setItem(STORAGE_KEYS.EXPANDED_GROUP_KEYS, JSON.stringify([]));
        
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1'),
            createMockTask('2', 'group-2'),
            createMockTask('3'), // 默认分组
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        // 应该保持收起状态（空数组），而不是自动展开所有分组
        expect(result.current.expandedRowKeys).toEqual([]);
    });

    it('当从未初始化时（localStorage 中没有数据），应该默认展开所有分组', () => {
        // 确保 localStorage 中没有该 key
        localStorage.removeItem(STORAGE_KEYS.EXPANDED_GROUP_KEYS);
        
        const tasks: DeploymentTask[] = [
            createMockTask('1', 'group-1'),
            createMockTask('2', 'group-2'),
            createMockTask('3'), // 默认分组
        ];

        const { result } = renderHook(() => useGrouping({ dataSource: tasks }));

        // 应该默认展开所有分组
        expect(result.current.expandedRowKeys).toContain('group-1');
        expect(result.current.expandedRowKeys).toContain('group-2');
        expect(result.current.expandedRowKeys).toContain('0'); // 默认分组
    });
});

