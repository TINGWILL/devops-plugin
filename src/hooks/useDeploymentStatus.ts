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
  errorMessage?: string; // 错误信息（仅部署失败时有值）
  errorTime?: number; // 错误发生时间（仅部署失败时有值）
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
          // 生成错误信息
          const errorMessages = [
            `镜像拉取失败：Failed to pull image "registry.company.com/${task.appName}:${task.version}"\n错误详情：Error response from daemon: Get https://registry.company.com/v2/: net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)\n建议操作：\n1. 检查镜像仓库连接是否正常\n2. 确认镜像标签是否存在\n3. 检查网络连接或代理配置`,
            `Pod 启动失败：Failed to start container "${task.appName}"\n错误详情：Error: ImagePullBackOff - Back-off pulling image "registry.company.com/${task.appName}:${task.version}"\nPod状态：CrashLoopBackOff\n建议操作：\n1. 检查镜像是否存在或标签是否正确\n2. 查看 Pod 日志排查启动问题\n3. 检查资源配置是否充足`,
            `资源分配失败：Insufficient resources in cluster "${task.cluster}"\n错误详情：0/4 nodes are available: 4 Insufficient cpu, 4 Insufficient memory\n节点资源：CPU 0.5/2.0, Memory 1Gi/4Gi\n建议操作：\n1. 检查集群资源使用情况\n2. 尝试在其他命名空间部署\n3. 联系运维扩容节点资源`,
            `健康检查失败：Readiness probe failed for container "${task.appName}"\n错误详情：Get http://localhost:8080/health: dial tcp 127.0.0.1:8080: connect: connection refused\n检查时间：已连续失败 3 次，间隔 10 秒\n建议操作：\n1. 检查应用健康检查端点是否正常\n2. 查看容器日志排查应用启动问题\n3. 调整健康检查配置或超时时间`,
            `网络配置错误：Service endpoint creation failed\n错误详情：Failed to create service endpoint: network policy violation - pod label mismatch\n命名空间：${task.namespace}\n建议操作：\n1. 检查 Pod 标签是否匹配 Service 选择器\n2. 验证网络策略配置是否正确\n3. 确认命名空间的网络隔离策略`
          ];
          const errorIndex = Math.floor(Math.random() * errorMessages.length);
          const errorMessage = errorMessages[errorIndex];
          const errorTime = Date.now();
          
          // 更新状态并添加错误信息
          setTasks(prev => prev.map(t => {
            if (t.key === task.key) {
              return { ...t, taskStatus: DeploymentStatus.DEPLOYMENT_FAILED, errorMessage, errorTime };
            }
            return t;
          }));
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
          // 生成错误信息
          const errorMessages = [
            `回滚操作失败：Rollback failed for "${task.appName}"\n错误详情：Failed to rollback to previous version "${task.version}"\n原因：Previous deployment version not found or deployment history is corrupted\n建议操作：\n1. 检查部署历史记录\n2. 手动回滚到指定版本\n3. 联系运维人员协助处理`,
            `回滚失败：Rollback operation timeout\n错误详情：Rollback process exceeded maximum timeout (30 minutes)\n当前状态：部分 Pod 已回滚，部分 Pod 仍运行新版本\n建议操作：\n1. 检查 Pod 状态和日志\n2. 手动清理异常 Pod\n3. 重新执行回滚操作`,
          ];
          const errorIndex = Math.floor(Math.random() * errorMessages.length);
          const errorMessage = errorMessages[errorIndex];
          const errorTime = Date.now();
          
          // 更新状态并添加错误信息
          setTasks(prev => prev.map(t => {
            if (t.key === task.key) {
              return { ...t, taskStatus: DeploymentStatus.DEPLOYMENT_FAILED, errorMessage, errorTime };
            }
            return t;
          }));
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
