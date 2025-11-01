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
  handleOperation: (operation: OperationType, task: DeploymentTask, silent?: boolean) => Promise<void>;
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
  // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
  const handleDeploy = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    // 只有非批量操作时才显示 toast 提示
    if (!silent) {
      Toast.success(`${task.appName} 开始执行部署`);
    }
    // 状态更新
    updateTaskStatus(task.key, DeploymentStatus.DEPLOYING);
    
    // 模拟部署过程
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // 模拟部署结果
        const isSuccess = Math.random() > 0.2; // 80% 成功率
        
        if (isSuccess) {
          // 部署成功 - 状态更新，无需 toast（状态变化不提示）
          updateTaskStatus(task.key, DeploymentStatus.DEPLOYED);
        } else {
          // 部署失败 - 状态更新，无需 toast（状态变化不提示）
          updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_FAILED);
        }
        
        resolve();
      }, 3000);
    });
  }, [updateTaskStatus]);

  // 处理申请加白操作
  // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
  const handleWhitelist = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    // 只有非批量操作时才显示 toast 提示
    if (!silent) {
      Toast.info(`${task.appName} 申请加白已提交，等待审批`);
    }
    // 状态更新
    updateTaskStatus(task.key, DeploymentStatus.APPROVING);
  }, [updateTaskStatus]);

  // 处理验证通过操作
  // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
  const handleVerifyPass = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    // 只有非批量操作时才显示 toast 提示
    if (!silent) {
      Toast.success(`${task.appName} 验证通过，部署结束`);
    }
    // 状态更新
    updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_ENDED);
  }, [updateTaskStatus]);

  // 处理回滚操作
  // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
  const handleRollback = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    // 只有非批量操作时才显示 toast 提示
    if (!silent) {
      Toast.info(`${task.appName} 开始回滚`);
    }
    // 状态更新
    updateTaskStatus(task.key, DeploymentStatus.ROLLING_BACK);
    
    // 模拟回滚过程
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1; // 90% 成功率
        
        if (isSuccess) {
          // 回滚成功 - 状态更新，无需 toast（状态变化不提示）
          updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_ENDED);
        } else {
          // 回滚失败 - 状态更新，无需 toast（状态变化不提示）
          updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_FAILED);
        }
        
        resolve();
      }, 2000);
    });
  }, [updateTaskStatus]);

  // 处理运维介入操作
  // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
  const handleOpsIntervention = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    // 只有非批量操作时才显示 toast 提示
    if (!silent) {
      Toast.info(`${task.appName} 运维介入，部署结束`);
    }
    // 状态更新
    updateTaskStatus(task.key, DeploymentStatus.DEPLOYMENT_ENDED);
  }, [updateTaskStatus]);

  // 处理删除操作
  const handleDelete = useCallback(async (task: DeploymentTask) => {
    setTasks(prev => prev.filter(t => t.key !== task.key));
    Toast.success(`${task.appName} 已删除`);
  }, []);

  // 通用操作处理函数
  // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
  const handleOperation = useCallback(async (operation: OperationType, task: DeploymentTask, silent: boolean = false) => {
    // 检查操作是否适用于当前状态
    if (!isOperationApplicable(task.taskStatus, operation)) {
      if (!silent) {
        Toast.warning(`${getOperationTypeName(operation)}操作不适用于当前状态`);
      }
      return;
    }

    try {
      switch (operation) {
        case OperationType.DEPLOY:
          await handleDeploy(task, silent);
          break;
        case OperationType.WHITELIST:
          await handleWhitelist(task, silent);
          break;
        case OperationType.VERIFY_PASS:
          await handleVerifyPass(task, silent);
          break;
        case OperationType.ROLLBACK:
          await handleRollback(task, silent);
          break;
        case OperationType.OPS_INTERVENTION:
          await handleOpsIntervention(task, silent);
          break;
        case OperationType.DELETE:
          await handleDelete(task);
          break;
        default:
          if (!silent) {
            Toast.warning('未知操作');
          }
      }
    } catch (error) {
      console.error('操作执行失败:', error);
      if (!silent) {
        Toast.error('操作执行失败');
      }
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
