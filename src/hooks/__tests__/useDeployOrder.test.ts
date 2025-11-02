import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeployOrder } from '../useDeployOrder';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus } from '../../constants/deploymentStatus';

describe('useDeployOrder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockTask = (
        key: string,
        taskStatus: DeploymentStatus = DeploymentStatus.PENDING,
        deployOrder?: number
    ): DeploymentTask => ({
        key,
        appName: `App ${key}`,
        taskStatus,
        deployStatus: taskStatus,
        deployOrder,
        deployTime: Date.now(),
        version: 'v1.0.0',
        cluster: 'cluster1',
        namespace: 'default',
        envTag: 'prod',
        podStatus: 'running',
        deployer: 'user1',
        avatarBg: '#1890FF',
    });

    it('应该正确重新分配选中任务的部署顺序', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', DeploymentStatus.PENDING),
            createMockTask('2', DeploymentStatus.PENDING),
            createMockTask('3', DeploymentStatus.PENDING),
            createMockTask('4', DeploymentStatus.DEPLOYED, 1), // 已部署，顺序锁定
        ];

        const mockOnDataChange = vi.fn();
        const { result } = renderHook(() =>
            useDeployOrder({
                dataSource: tasks,
                selectedRowKeys: ['1', '2', '3'],
                onDataChange: mockOnDataChange,
            })
        );

        const reordered = result.current.reorderSelectedTasks(tasks, ['1', '2', '3']);

        expect(reordered.find(t => t.key === '1')?.deployOrder).toBe(1);
        expect(reordered.find(t => t.key === '2')?.deployOrder).toBe(2);
        expect(reordered.find(t => t.key === '3')?.deployOrder).toBe(3);
        expect(reordered.find(t => t.key === '4')?.deployOrder).toBe(1); // 已部署任务顺序不变
    });

    it('应该清除未选中任务的部署顺序（仅待部署状态）', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', DeploymentStatus.PENDING, 1),
            createMockTask('2', DeploymentStatus.PENDING, 2),
            createMockTask('3', DeploymentStatus.DEPLOYED, 3), // 已部署，顺序保持
        ];

        const { result } = renderHook(() =>
            useDeployOrder({
                dataSource: tasks,
                selectedRowKeys: ['1'],
                onDataChange: vi.fn(),
            })
        );

        const reordered = result.current.reorderSelectedTasks(tasks, ['1']);

        expect(reordered.find(t => t.key === '1')?.deployOrder).toBe(1);
        expect(reordered.find(t => t.key === '2')?.deployOrder).toBeUndefined();
        expect(reordered.find(t => t.key === '3')?.deployOrder).toBe(3); // 已部署任务顺序不变
    });

    it('应该保持已部署任务的顺序不变', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', DeploymentStatus.PENDING),
            createMockTask('2', DeploymentStatus.DEPLOYED, 5), // 已部署，顺序锁定
            createMockTask('3', DeploymentStatus.DEPLOYED, 10), // 已部署，顺序锁定
        ];

        const { result } = renderHook(() =>
            useDeployOrder({
                dataSource: tasks,
                selectedRowKeys: ['1'],
                onDataChange: vi.fn(),
            })
        );

        const reordered = result.current.reorderSelectedTasks(tasks, ['1']);

        expect(reordered.find(t => t.key === '1')?.deployOrder).toBe(1);
        expect(reordered.find(t => t.key === '2')?.deployOrder).toBe(5); // 保持不变
        expect(reordered.find(t => t.key === '3')?.deployOrder).toBe(10); // 保持不变
    });

    it('应该正确处理部署顺序变更', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', DeploymentStatus.PENDING, 1),
            createMockTask('2', DeploymentStatus.PENDING, 2),
            createMockTask('3', DeploymentStatus.PENDING, 3),
        ];

        let updatedTasks = tasks;
        const mockOnDataChange = vi.fn((updater) => {
            updatedTasks = updater(updatedTasks);
        });

        const { result } = renderHook(() =>
            useDeployOrder({
                dataSource: tasks,
                selectedRowKeys: ['1', '2', '3'],
                onDataChange: mockOnDataChange,
            })
        );

        act(() => {
            result.current.handleDeployOrderChange('1', '3');
        });

        expect(mockOnDataChange).toHaveBeenCalled();
        
        // 检查顺序交换逻辑（需要通过实际调用验证）
        const finalTasks = mockOnDataChange.mock.calls[0]?.[0](tasks);
        if (finalTasks) {
            // 应该重新分配顺序，确保连续
            const task1 = finalTasks.find(t => t.key === '1');
            const task2 = finalTasks.find(t => t.key === '2');
            const task3 = finalTasks.find(t => t.key === '3');
            
            // 确保所有选中任务的顺序是连续的
            const orders = [task1, task2, task3]
                .filter(t => t?.taskStatus === DeploymentStatus.PENDING)
                .map(t => t!.deployOrder)
                .filter((o): o is number => o !== undefined)
                .sort();
            
            expect(orders.length).toBe(3);
            expect(orders[0]).toBe(1);
            expect(orders[1]).toBe(2);
            expect(orders[2]).toBe(3);
        }
    });

    it('应该拒绝非待部署状态的任务修改部署顺序', async () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', DeploymentStatus.DEPLOYED, 1),
        ];

        const { Toast } = await import('@douyinfe/semi-ui');
        const mockOnDataChange = vi.fn();

        const { result } = renderHook(() =>
            useDeployOrder({
                dataSource: tasks,
                selectedRowKeys: ['1'],
                onDataChange: mockOnDataChange,
            })
        );

        act(() => {
            result.current.handleDeployOrderChange('1', '2');
        });

        expect(Toast.warning).toHaveBeenCalledWith('只有待部署状态的任务才能设置部署顺序');
        expect(mockOnDataChange).not.toHaveBeenCalled();
    });

    it('应该拒绝无效的部署顺序值', async () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', DeploymentStatus.PENDING),
        ];

        const { Toast } = await import('@douyinfe/semi-ui');
        const mockOnDataChange = vi.fn();

        const { result } = renderHook(() =>
            useDeployOrder({
                dataSource: tasks,
                selectedRowKeys: ['1'],
                onDataChange: mockOnDataChange,
            })
        );

        act(() => {
            result.current.handleDeployOrderChange('1', '0'); // 无效值
        });

        expect(Toast.warning).toHaveBeenCalledWith('部署顺序必须是大于0的整数');
        expect(mockOnDataChange).not.toHaveBeenCalled();
    });

    it('应该正确处理空值（清除部署顺序）', () => {
        const tasks: DeploymentTask[] = [
            createMockTask('1', DeploymentStatus.PENDING, 1),
            createMockTask('2', DeploymentStatus.PENDING, 2),
        ];

        let updatedTasks = tasks;
        const mockOnDataChange = vi.fn((updater) => {
            updatedTasks = updater(updatedTasks);
        });

        const { result } = renderHook(() =>
            useDeployOrder({
                dataSource: tasks,
                selectedRowKeys: ['1', '2'],
                onDataChange: mockOnDataChange,
            })
        );

        act(() => {
            result.current.handleDeployOrderChange('1', '');
        });

        expect(mockOnDataChange).toHaveBeenCalled();
    });
});

