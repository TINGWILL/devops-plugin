import { useCallback } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { 
  DeploymentStatus, 
  OperationType, 
  getButtonConfig, 
  isOperationApplicable,
  getOperationTypeName 
} from '../constants/deploymentStatus';
import { useDeploymentStore } from '../stores/deploymentStore';
import { DeploymentTask } from '../types/deployment';

/**
 * 部署操作逻辑 Hook
 * 纯操作逻辑层，不包含状态管理
 * 状态通过 Store 直接访问
 */
export const useDeploymentOperations = () => {
  const updateTask = useDeploymentStore((state) => state.updateTask);
  const deleteTask = useDeploymentStore((state) => state.deleteTask);

  // 更新任务状态
  const updateTaskStatus = useCallback((key: string, status: DeploymentStatus) => {
    updateTask(key, { taskStatus: status });
  }, [updateTask]);

  // 处理部署操作
  const handleDeploy = useCallback(async (
    task: DeploymentTask, 
    silent: boolean = false,
    onLoadingChange?: (loading: boolean) => void
  ) => {
    if (!silent) {
      Toast.success(`${task.appName} 开始执行部署`);
    }
    
    onLoadingChange?.(true);
    updateTaskStatus(task.key, DeploymentStatus.DEPLOYING);
    
    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const isSuccess = Math.random() > 0.2;
          
          if (isSuccess) {
            updateTaskStatus(task.key, DeploymentStatus.DEPLOYED);
            if (!silent) {
              Toast.success(`${task.appName} 部署成功`);
            }
          } else {
            const errorMessages = [
              `镜像拉取失败：Failed to pull image "registry.company.com/${task.appName}:${task.version}"`,
              `Pod 启动失败：Failed to start container "${task.appName}"`,
              `资源分配失败：Insufficient resources in cluster "${task.cluster}"`,
              `健康检查失败：Readiness probe failed for container "${task.appName}"`,
              `网络配置错误：Service endpoint creation failed`
            ];
            const errorIndex = Math.floor(Math.random() * errorMessages.length);
            updateTask(task.key, {
              taskStatus: DeploymentStatus.DEPLOYMENT_FAILED,
              errorMessage: errorMessages[errorIndex],
              errorTime: Date.now()
            });
            if (!silent) {
              Toast.error(`${task.appName} 部署失败`);
            }
          }
          resolve();
        }, 2000);
      });
    } finally {
      onLoadingChange?.(false);
    }
  }, [updateTaskStatus, updateTask]);

  // 处理申请加白操作
  const handleWhitelist = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    if (!silent) {
      Toast.success(`${task.appName} 开始申请加白`);
    }
    updateTaskStatus(task.key, DeploymentStatus.APPROVING);
    
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        updateTaskStatus(task.key, DeploymentStatus.PENDING);
        if (!silent) {
          Toast.success(`${task.appName} 申请加白成功，已返回待部署状态`);
        }
        resolve();
      }, 1500);
    });
  }, [updateTaskStatus]);

  // 处理验证通过操作
  const handleVerifyPass = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    if (!silent) {
      Toast.success(`${task.appName} 验证通过`);
    }
    updateTask(task.key, { taskStatus: DeploymentStatus.DEPLOYMENT_ENDED });
  }, [updateTask]);

  // 处理回滚操作
  const handleRollback = useCallback(async (
    task: DeploymentTask, 
    silent: boolean = false,
    onLoadingChange?: (loading: boolean) => void
  ) => {
    if (!silent) {
      Toast.success(`${task.appName} 开始回滚`);
    }
    
    onLoadingChange?.(true);
    updateTaskStatus(task.key, DeploymentStatus.ROLLING_BACK);
    
    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          updateTask(task.key, { taskStatus: DeploymentStatus.DEPLOYMENT_ENDED });
          if (!silent) {
            Toast.success(`${task.appName} 回滚成功`);
          }
          resolve();
        }, 2000);
      });
    } finally {
      onLoadingChange?.(false);
    }
  }, [updateTaskStatus, updateTask]);

  // 处理运维介入操作
  const handleOpsIntervention = useCallback(async (task: DeploymentTask, silent: boolean = false) => {
    if (!silent) {
      Toast.success(`${task.appName} 运维介入处理`);
    }
    updateTask(task.key, { taskStatus: DeploymentStatus.DEPLOYMENT_ENDED });
  }, [updateTask]);

  // 处理删除操作
  const handleDelete = useCallback(async (task: DeploymentTask) => {
    deleteTask(task.key);
    Toast.success(`${task.appName} 已删除`);
  }, [deleteTask]);

  // 通用操作处理函数
  const handleOperation = useCallback(async (
    operation: OperationType, 
    task: DeploymentTask, 
    silent: boolean = false,
    onLoadingChange?: (loading: boolean) => void
  ) => {
    if (!isOperationApplicable(task.taskStatus, operation)) {
      if (!silent) {
        Toast.warning(`${getOperationTypeName(operation)}操作不适用于当前状态`);
      }
      return;
    }

    try {
      switch (operation) {
        case OperationType.DEPLOY:
          await handleDeploy(task, silent, onLoadingChange);
          break;
        case OperationType.WHITELIST:
          await handleWhitelist(task, silent);
          break;
        case OperationType.VERIFY_PASS:
          await handleVerifyPass(task, silent);
          break;
        case OperationType.ROLLBACK:
          await handleRollback(task, silent, onLoadingChange);
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
      throw error;
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
    handleOperation,
    updateTaskStatus,
    getButtonConfig,
    isOperationApplicable
  };
};

