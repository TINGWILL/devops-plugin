import { useState, useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { DeploymentStatus, OperationType, isOperationApplicable, getOperationTypeName } from '../constants/deploymentStatus';
import { DeploymentTask } from './useDeploymentStatus';

export interface BatchOperationResult {
  applicable: DeploymentTask[];
  notApplicable: DeploymentTask[];
}

export interface UseBatchOperationsReturn {
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;
  getBatchApplicability: (tasks: DeploymentTask[], operation: OperationType) => BatchOperationResult;
  handleBatchOperation: (operation: OperationType, tasks: DeploymentTask[], onOperation: (operation: OperationType, task: DeploymentTask, silent?: boolean) => Promise<void>, onSuccess?: () => void) => Promise<void>;
  canPerformBatchOperation: (tasks: DeploymentTask[], operation: OperationType) => boolean;
}

/**
 * 批量操作管理Hook
 * 处理批量部署、批量操作等逻辑
 */
export const useBatchOperations = (): UseBatchOperationsReturn => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // 获取批量操作适用性
  const getBatchApplicability = useCallback((tasks: DeploymentTask[], operation: OperationType): BatchOperationResult => {
    const selectedTasks = tasks.filter(task => selectedKeys.includes(task.key));
    
    const applicable = selectedTasks.filter(task => 
      isOperationApplicable(task.taskStatus, operation)
    );
    
    const notApplicable = selectedTasks.filter(task => 
      !isOperationApplicable(task.taskStatus, operation)
    );
    
    return { applicable, notApplicable };
  }, [selectedKeys]);

  // 检查是否可以执行批量操作
  const canPerformBatchOperation = useCallback((tasks: DeploymentTask[], operation: OperationType): boolean => {
    if (selectedKeys.length === 0) {
      return false;
    }
    
    const { applicable } = getBatchApplicability(tasks, operation);
    return applicable.length > 0;
  }, [selectedKeys, getBatchApplicability]);

  // 处理批量操作
  const handleBatchOperation = useCallback(async (
    operation: OperationType, 
    tasks: DeploymentTask[], 
    onOperation: (operation: OperationType, task: DeploymentTask, silent?: boolean) => Promise<void>,
    onSuccess?: () => void
  ) => {
    if (selectedKeys.length === 0) {
      Toast.warning('请先选择要操作的任务');
      return;
    }

    const { applicable, notApplicable } = getBatchApplicability(tasks, operation);
    
    if (applicable.length === 0) {
      const operationName = getOperationTypeName(operation);
      let message = `选中的任务中没有可以${operationName}的任务：\n`;
      
      if (notApplicable.length > 0) {
        message += `• ${notApplicable.length} 个任务状态不符合要求\n`;
      }
      
      message += `\n只有特定状态的任务可以执行${operationName}操作。`;
      Toast.warning(message);
      return;
    }

    const operationName = getOperationTypeName(operation);
    
    try {
      // 对于批量部署，不等待执行结果，立即调用接口即可
      if (operation === OperationType.DEPLOY) {
        // 批量部署：立即调用接口，不等待结果
        // 使用静默模式，不显示单个任务的 Toast 提示
        applicable.forEach((task) => {
          // 不等待 Promise，立即触发接口调用
          // 传递 silent: true 参数，让 handleOperation 静默执行（不显示单个任务的提示）
          onOperation(operation, task, true).catch((error) => {
            console.error(`任务 ${task.key} 部署接口调用失败:`, error);
          });
        });
        
        // 显示批量部署提示（仅显示批量级别的提示）
        Toast.success(`提交批量部署任务成功，共 ${applicable.length} 个任务`);
        
        // 立即返回，不等待执行结果
        // 清空选中状态
        setSelectedKeys([]);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // 其他批量操作（申请加白、验证通过等）：等待执行结果
        // 使用静默模式，不显示单个任务的 Toast 提示
        const promises = applicable.map(async (task) => {
          // 传递 silent: true 参数，让 handleOperation 静默执行（不显示单个任务的提示）
          await onOperation(operation, task, true);
        });
        
        await Promise.all(promises);
        
        // 显示批量操作成功提示（仅显示批量级别的提示，不显示单个任务的提示）
        Toast.success(`批量${operationName}成功，共处理 ${applicable.length} 个任务`);
        
        // 清空选中状态
        setSelectedKeys([]);
        
        if (onSuccess) {
          onSuccess();
        }
      }
      
    } catch (error) {
      console.error('批量操作失败:', error);
      Toast.error(`批量${operationName}失败`);
    }
  }, [selectedKeys, getBatchApplicability]);

  return {
    selectedKeys,
    setSelectedKeys,
    getBatchApplicability,
    handleBatchOperation,
    canPerformBatchOperation
  };
};
