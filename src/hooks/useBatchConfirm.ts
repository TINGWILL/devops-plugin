import { useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { DeploymentTask } from '../types/deployment';
import { DeploymentStatus, OperationType } from '../constants/deploymentStatus';
import { generateGroupKey } from '../utils/batchUtils';
import { UseBatchOperationsReturn } from './useBatchOperations';

interface UseBatchConfirmProps {
  dataSource: DeploymentTask[];
  selectedRowKeys: string[];
  setData: (tasks: DeploymentTask[] | ((prev: DeploymentTask[]) => DeploymentTask[])) => void;
  handleBatchOperation: UseBatchOperationsReturn['handleBatchOperation'];
  handleOperation: (operation: OperationType, task: DeploymentTask, silent?: boolean) => Promise<void>;
  onClose: () => void;
  setExpandedGroupKeys?: (keys: string[] | ((prev: string[]) => string[])) => void;
}

/**
 * 批量操作确认 Hook
 * 封装批量操作确认逻辑，包括批量部署、分组创建等
 */
export const useBatchConfirm = ({
  dataSource,
  selectedRowKeys,
  setData,
  handleBatchOperation,
  handleOperation,
  onClose,
  setExpandedGroupKeys
}: UseBatchConfirmProps) => {
  const confirmBatchOperation = useCallback(async (operation: OperationType) => {
    if (operation === OperationType.DEPLOY) {
      // 批量部署时创建批次
      const selectedTasks = dataSource.filter(task => 
        selectedRowKeys.includes(task.key) && 
        task.taskStatus === DeploymentStatus.PENDING &&
        task.deployOrder !== undefined
      );
      
      if (selectedTasks.length === 0) {
        Toast.warning('请选择有部署顺序的待部署任务');
        onClose();
        return;
      }
      
      // 生成分组标识符（Group Key）
      const groupKey = generateGroupKey();
      const groupCreateTime = Date.now();
      
      // 为选中任务分配分组标识符，并更新数据源
      const updatedDataSource = dataSource.map(task => {
        if (selectedTasks.some(t => t.key === task.key)) {
          return { ...task, groupKey, deployTime: groupCreateTime };
        }
        return task;
      });
      
      // 更新状态
      setData(updatedDataSource);
      
      // 展开新创建的分组
      if (setExpandedGroupKeys) {
        setExpandedGroupKeys((prevKeys) => {
          if (!prevKeys.includes(groupKey)) {
            return [...prevKeys, groupKey];
          }
          return prevKeys;
        });
      }
      
      // 立即调用接口，但不等待结果
      handleBatchOperation(operation, updatedDataSource, handleOperation).catch(() => {
        Toast.error('批量部署接口调用失败');
      });
      
      // 立即关闭弹窗
      onClose();
    } else {
      // 其他批量操作需要等待结果
      await handleBatchOperation(operation, dataSource, handleOperation);
      onClose();
    }
  }, [dataSource, selectedRowKeys, handleBatchOperation, handleOperation, setData, onClose, setExpandedGroupKeys]);

  return { confirmBatchOperation };
};

