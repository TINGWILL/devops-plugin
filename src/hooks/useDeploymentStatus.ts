import { useState, useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { 
  DeploymentStatus, 
  OperationType, 
  getButtonConfig, 
  isOperationApplicable,
  getOperationTypeName 
} from '../constants/deploymentStatus';

export interface DeploymentTask {
  key: string;
  appName: string;
  taskStatus: DeploymentStatus;
  deployStatus: string;
  podStatus: string;
  version: string;
  cluster: string;
  namespace: string;
  envTag: string;
  deployTime: number;
  deployer: string;
  avatarBg: string;
  deployOrder?: number; // 部署顺序，可选字段
  groupKey?: string; // 所属分组标识符，可选字段，默认为 '0'（默认分组）
  paused?: boolean; // 是否已暂停，可选字段
}

export interface UseDeploymentStatusReturn {
  tasks: DeploymentTask[];
  setTasks: (tasks: DeploymentTask[] | ((prev: DeploymentTask[]) => DeploymentTask[])) => void;
  updateTaskStatus: (key: string, status: DeploymentStatus) => void;
  handleOperation: (operation: OperationType, task: DeploymentTask) => Promise<void>;
  getButtonConfig: (status: DeploymentStatus) => { first: any; second: any };
  isOperationApplicable: (status: DeploymentStatus, operation: OperationType) => boolean;
}

/**
 * 部署状态管理Hook
 * 根据流程图实现完整的状态流转逻辑
 */
export const useDeploymentStatus = (initialTasks: DeploymentTask[] = []): UseDeploymentStatusReturn => {
  const [tasks, setTasks] = useState<DeploymentTask[]>(initialTasks);

  // 更新任务状态（保留所有字段，包括 groupKey、deployOrder 等）
  // 注意：部署顺序不会因为状态变化而被清除，只有待部署状态时才能修改
  const updateTaskStatus = useCallback((key: string, status: DeploymentStatus) => {
    setTasks(prev => prev.map(task => {
      if (task.key === key) {
        // 保留所有原有字段，只更新 taskStatus
        return { ...task, taskStatus: status };
      }
      return task;
    }));
  }, []);

  // 处理部署操作
  const handleDeploy = useCallback(async (task: DeploymentTask) => {
    // 开始部署
    updateTaskStatus(task.key, DeploymentStatus.DEPLOYING);
    Toast.success(`${task.appName} 开始执行部署`);
    
    // 模拟部署过程
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // 模拟部署结果
        const isSuccess = Math.random() > 0.2; // 80% 成功率
        
        if (isSuccess) {
          updateTaskStatus(task.key, DeploymentStatus.DEPLOYED);
          Toast.success(`${task.appName} 部署成功`);
        } else {
          updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_FAILED);
          Toast.error(`${task.appName} 部署失败`);
        }
        
        resolve();
      }, 3000);
    });
  }, [updateTaskStatus]);

  // 处理申请加白操作
  const handleWhitelist = useCallback(async (task: DeploymentTask) => {
    updateTaskStatus(task.key, DeploymentStatus.APPROVING);
    Toast.info(`${task.appName} 申请加白已提交，等待审批`);
  }, [updateTaskStatus]);

  // 处理验证通过操作
  const handleVerifyPass = useCallback(async (task: DeploymentTask) => {
    updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_ENDED);
    Toast.success(`${task.appName} 验证通过，部署结束`);
  }, [updateTaskStatus]);

  // 处理回滚操作
  const handleRollback = useCallback(async (task: DeploymentTask) => {
    updateTaskStatus(task.key, DeploymentStatus.ROLLING_BACK);
    Toast.info(`${task.appName} 开始回滚`);
    
    // 模拟回滚过程
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1; // 90% 成功率
        
        if (isSuccess) {
          updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_ENDED);
          Toast.success(`${task.appName} 回滚成功，部署结束`);
        } else {
          // 回滚失败，需要运维介入
          Toast.error(`${task.appName} 回滚失败，需要运维介入`);
        }
        
        resolve();
      }, 2000);
    });
  }, [updateTaskStatus]);

  // 处理运维介入操作
  const handleOpsIntervention = useCallback(async (task: DeploymentTask) => {
    updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_ENDED);
    Toast.info(`${task.appName} 运维介入，部署结束`);
  }, [updateTaskStatus]);

  // 处理删除操作
  const handleDelete = useCallback(async (task: DeploymentTask) => {
    setTasks(prev => prev.filter(t => t.key !== task.key));
    Toast.success(`${task.appName} 已删除`);
  }, []);

  // 通用操作处理函数
  const handleOperation = useCallback(async (operation: OperationType, task: DeploymentTask) => {
    // 检查操作是否适用于当前状态
    if (!isOperationApplicable(task.taskStatus, operation)) {
      Toast.warning(`${getOperationTypeName(operation)}操作不适用于当前状态`);
      return;
    }

    try {
      switch (operation) {
        case OperationType.DEPLOY:
          await handleDeploy(task);
          break;
        case OperationType.WHITELIST:
          await handleWhitelist(task);
          break;
        case OperationType.VERIFY_PASS:
          await handleVerifyPass(task);
          break;
        case OperationType.ROLLBACK:
          await handleRollback(task);
          break;
        case OperationType.OPS_INTERVENTION:
          await handleOpsIntervention(task);
          break;
        case OperationType.DELETE:
          await handleDelete(task);
          break;
        default:
          Toast.warning('未知操作');
      }
    } catch (error) {
      console.error('操作执行失败:', error);
      Toast.error('操作执行失败');
    }
  }, [
    handleDeploy,
    handleWhitelist,
    handleVerifyPass,
    handleRollback,
    handleOpsIntervention,
    handleDelete
  ]);

  return {
    tasks,
    setTasks,
    updateTaskStatus,
    handleOperation,
    getButtonConfig,
    isOperationApplicable
  };
};
