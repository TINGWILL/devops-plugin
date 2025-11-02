import { useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { DeploymentTask } from '../types/deployment';
import { DeploymentStatus } from '../constants/deploymentStatus';

interface UseDeployOrderProps {
    dataSource: DeploymentTask[];
    selectedRowKeys: string[];
    onDataChange: (updater: (prev: DeploymentTask[]) => DeploymentTask[]) => void;
}

/**
 * 部署顺序管理 Hook
 * 处理部署顺序的分配、修改、交换等逻辑
 */
export const useDeployOrder = ({
    dataSource,
    selectedRowKeys,
    onDataChange
}: UseDeployOrderProps) => {
    // 重新分配选中任务的部署顺序，确保顺序唯一且连续
    const reorderSelectedTasks = useCallback((tasks: DeploymentTask[], selectedKeys: string[]) => {
        // 找出所有已选中且为待部署状态的任务
        const selectedPendingTasks = tasks
            .filter(task => 
                selectedKeys.includes(task.key) && 
                task.taskStatus === DeploymentStatus.PENDING
            )
            .sort((a, b) => {
                // 先按当前部署顺序排序（undefined排在最后）
                const orderA = a.deployOrder ?? 999999;
                const orderB = b.deployOrder ?? 999999;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                // 如果顺序相同或都是undefined，保持原有顺序
                return tasks.indexOf(a) - tasks.indexOf(b);
            });
        
        // 重新分配顺序：1, 2, 3, ...
        return tasks.map(item => {
            if (selectedPendingTasks.some(task => task.key === item.key)) {
                // 选中的待部署任务，分配顺序
                const index = selectedPendingTasks.findIndex(task => task.key === item.key);
                return { ...item, deployOrder: index + 1 };
            } else if (item.taskStatus === DeploymentStatus.PENDING) {
                // 未选中的待部署任务，清除部署顺序
                return { ...item, deployOrder: undefined };
            } else {
                // 非待部署状态的任务，保持部署顺序不变（已提交部署的任务顺序锁定）
                return item;
            }
        });
    }, []);

    // 处理部署顺序变更
    const handleDeployOrderChange = useCallback((key: string, value: string) => {
        // 检查当前任务是否为待部署状态
        const currentTask = dataSource.find(task => task.key === key);
        if (!currentTask || currentTask.taskStatus !== DeploymentStatus.PENDING) {
            Toast.warning('只有待部署状态的任务才能设置部署顺序');
            return;
        }
        
        // 如果输入为空，清除部署顺序
        if (value.trim() === '') {
            onDataChange(prev => {
                const updatedTasks = prev.map(item => 
                    item.key === key ? { ...item, deployOrder: undefined } : item
                );
                return reorderSelectedTasks(updatedTasks, selectedRowKeys);
            });
            return;
        }
        
        const newOrder = parseInt(value, 10);
        
        if (isNaN(newOrder) || newOrder < 1) {
            Toast.warning('部署顺序必须是大于0的整数');
            return;
        }
        
        onDataChange(prev => {
            // 检查新顺序是否已被其他任务占用
            const existingTask = prev.find(task => 
                task.key !== key && 
                task.deployOrder === newOrder &&
                selectedRowKeys.includes(task.key) &&
                task.taskStatus === DeploymentStatus.PENDING
            );
            
            // 如果顺序已被占用，交换顺序
            if (existingTask) {
                const currentOldOrder = currentTask.deployOrder;
                const swappedTasks = prev.map(item => {
                    if (item.key === key) {
                        return { ...item, deployOrder: newOrder };
                    } else if (item.key === existingTask.key) {
                        return { ...item, deployOrder: currentOldOrder };
                    }
                    return item;
                });
                return reorderSelectedTasks(swappedTasks, selectedRowKeys);
            }
            
            // 更新当前任务的顺序
            const updatedTasks = prev.map(item => 
                item.key === key ? { ...item, deployOrder: newOrder } : item
            );
            
            return reorderSelectedTasks(updatedTasks, selectedRowKeys);
        });
    }, [dataSource, selectedRowKeys, reorderSelectedTasks, onDataChange]);

    return {
        reorderSelectedTasks,
        handleDeployOrderChange
    };
};

