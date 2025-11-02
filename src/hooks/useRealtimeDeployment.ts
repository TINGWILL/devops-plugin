import { useEffect, useRef, useCallback, useState } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import { DeploymentTask } from './useDeploymentStatus';
import { DeploymentApiService, getDeploymentApiService, TaskStatusUpdate } from '../services/deploymentApi';

/**
 * 实时部署数据Hook配置
 */
export interface UseRealtimeDeploymentConfig {
  enabled?: boolean; // 是否启用实时更新，默认true
  mode?: 'polling' | 'websocket' | 'both'; // 更新模式，默认'polling'
  pollingInterval?: number; // 轮询间隔（毫秒），默认5秒
  enableWebSocket?: boolean; // 是否启用WebSocket，默认false
  onTasksUpdate?: (tasks: DeploymentTask[]) => void; // 任务列表更新回调
  onTaskStatusUpdate?: (update: TaskStatusUpdate) => void; // 单个任务状态更新回调
  onError?: (error: Error) => void; // 错误回调
  onlyUpdateInProgress?: boolean; // 仅更新进行中的任务（待部署、审批中、部署中、回滚中），默认true
}

/**
 * 实时部署数据Hook返回值
 */
export interface UseRealtimeDeploymentReturn {
  isConnected: boolean; // WebSocket连接状态（仅WebSocket模式）
  error: Error | null; // 错误信息
  lastUpdateTime: number | null; // 最后更新时间戳
}

/**
 * 实时部署数据获取Hook
 * 
 * 支持两种模式：
 * 1. 轮询（polling）：定期向后端请求最新数据
 * 2. WebSocket：实时接收后端推送的状态更新
 * 
 * @param config 配置选项
 * @returns Hook返回值
 */
export function useRealtimeDeployment(
  config: UseRealtimeDeploymentConfig = {}
): UseRealtimeDeploymentReturn {
  const {
    enabled = true,
    mode = 'polling',
    pollingInterval = 5000,
    enableWebSocket = false,
    onTasksUpdate,
    onTaskStatusUpdate,
    onError,
    onlyUpdateInProgress = true
  } = config;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiServiceRef = useRef<DeploymentApiService | null>(null);
  const lastTasksRef = useRef<DeploymentTask[]>([]);
  const updateCallbacksRef = useRef({
    onTasksUpdate,
    onTaskStatusUpdate,
    onError
  });

  // 更新回调函数引用（避免闭包问题）
  useEffect(() => {
    updateCallbacksRef.current = {
      onTasksUpdate,
      onTaskStatusUpdate,
      onError
    };
  }, [onTasksUpdate, onTaskStatusUpdate, onError]);

  /**
   * 判断任务是否处于进行中状态
   */
  const isTaskInProgress = useCallback((task: DeploymentTask): boolean => {
    const inProgressStatuses = [
      'PENDING',
      'APPROVING',
      'DEPLOYING',
      'ROLLING_BACK'
    ];
    return inProgressStatuses.includes(task.taskStatus);
  }, []);

  /**
   * 更新任务状态（合并更新，保留本地修改的字段如 deployOrder）
   */
  const mergeTaskUpdate = useCallback((
    currentTasks: DeploymentTask[],
    update: TaskStatusUpdate | DeploymentTask
  ): DeploymentTask[] => {
    return currentTasks.map(task => {
      if (task.key === (update as any).taskKey || task.key === (update as any).key) {
        // 合并更新：保留原有字段，只更新状态相关字段
        const updatedTask: DeploymentTask = {
          ...task,
          taskStatus: (update as any).taskStatus || task.taskStatus,
          deployStatus: (update as any).deployStatus !== undefined 
            ? (update as any).deployStatus 
            : task.deployStatus,
          podStatus: (update as any).podStatus !== undefined 
            ? (update as any).podStatus 
            : task.podStatus,
        };

        // 如果有错误信息，添加错误字段
        if ((update as any).errorMessage) {
          updatedTask.errorMessage = (update as any).errorMessage;
          updatedTask.errorTime = (update as any).errorTime || Date.now();
        } else if (updatedTask.taskStatus !== 'DEPLOYMENT_FAILED') {
          // 如果状态不是失败，清除错误信息
          delete updatedTask.errorMessage;
          delete updatedTask.errorTime;
        }

        return updatedTask;
      }
      return task;
    });
  }, []);

  /**
   * 处理任务列表更新
   */
  const handleTasksUpdate = useCallback(async () => {
    try {
      if (!apiServiceRef.current) {
        apiServiceRef.current = getDeploymentApiService({
          pollingInterval,
          enableWebSocket: mode === 'websocket' || mode === 'both'
        });
      }

      const response = await apiServiceRef.current.fetchTasks();
      
      if (response.tasks && response.tasks.length > 0) {
        // 如果设置了仅更新进行中的任务，过滤出进行中的任务
        let tasksToUpdate = response.tasks;
        if (onlyUpdateInProgress) {
          // 合并：更新进行中的任务，保留已完成的任务
          const currentTasks = lastTasksRef.current;
          const inProgressTaskKeys = new Set(
            response.tasks
              .filter(isTaskInProgress)
              .map(t => t.key)
          );
          
          // 保留已完成的任务（不在进行中列表中的）
          const completedTasks = currentTasks.filter(
            task => !inProgressTaskKeys.has(task.key)
          );
          
          // 合并进行中的任务（使用后端最新数据）
          const updatedTasks = [
            ...completedTasks,
            ...response.tasks.filter(isTaskInProgress)
          ];
          
          tasksToUpdate = updatedTasks;
        }

        lastTasksRef.current = tasksToUpdate;
        setLastUpdateTime(Date.now());
        
        if (updateCallbacksRef.current.onTasksUpdate) {
          updateCallbacksRef.current.onTasksUpdate(tasksToUpdate);
        }
      }
      
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (updateCallbacksRef.current.onError) {
        updateCallbacksRef.current.onError(error);
      }
    }
  }, [pollingInterval, mode, onlyUpdateInProgress, isTaskInProgress]);

  /**
   * 处理单个任务状态更新（WebSocket推送）
   */
  const handleTaskStatusUpdate = useCallback((update: TaskStatusUpdate) => {
    const currentTasks = lastTasksRef.current;
    
    // 如果设置了仅更新进行中的任务，检查该任务是否应该被更新
    if (onlyUpdateInProgress) {
      const task = currentTasks.find(t => t.key === update.taskKey);
      if (task && !isTaskInProgress(task)) {
        // 任务已完成，不更新
        return;
      }
    }
    
    // 合并更新
    const updatedTasks = mergeTaskUpdate(currentTasks, update);
    lastTasksRef.current = updatedTasks;
    setLastUpdateTime(Date.now());
    
    if (updateCallbacksRef.current.onTasksUpdate) {
      updateCallbacksRef.current.onTasksUpdate(updatedTasks);
    }
    
    if (updateCallbacksRef.current.onTaskStatusUpdate) {
      updateCallbacksRef.current.onTaskStatusUpdate(update);
    }
  }, [onlyUpdateInProgress, isTaskInProgress, mergeTaskUpdate]);

  /**
   * 初始化API服务
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 初始化API服务
    apiServiceRef.current = getDeploymentApiService({
      pollingInterval,
      enableWebSocket: mode === 'websocket' || mode === 'both'
    });

    return () => {
      // 清理：断开WebSocket连接
      if (apiServiceRef.current) {
        apiServiceRef.current.disconnectWebSocket();
      }
    };
  }, [enabled, pollingInterval, mode]);

  /**
   * 轮询模式：定期获取最新数据
   */
  useEffect(() => {
    if (!enabled || (mode !== 'polling' && mode !== 'both')) {
      return;
    }

    // 立即执行一次
    handleTasksUpdate();

    // 设置定时轮询
    pollingTimerRef.current = setInterval(() => {
      handleTasksUpdate();
    }, pollingInterval);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [enabled, mode, pollingInterval, handleTasksUpdate]);

  /**
   * WebSocket模式：连接并接收实时更新
   */
  useEffect(() => {
    if (!enabled || (mode !== 'websocket' && mode !== 'both')) {
      return;
    }

    if (!apiServiceRef.current) {
      return;
    }

    // 连接WebSocket
    apiServiceRef.current.connectWebSocket(
      (update) => {
        if ('taskKey' in update) {
          // 状态更新
          handleTaskStatusUpdate(update as TaskStatusUpdate);
        } else {
          // 新任务添加
          const newTask = update as DeploymentTask;
          const currentTasks = lastTasksRef.current;
          const taskExists = currentTasks.some(t => t.key === newTask.key);
          
          if (!taskExists) {
            lastTasksRef.current = [...currentTasks, newTask];
            setLastUpdateTime(Date.now());
            
            if (updateCallbacksRef.current.onTasksUpdate) {
              updateCallbacksRef.current.onTasksUpdate(lastTasksRef.current);
            }
          }
        }
      },
      (wsError) => {
        setError(new Error('WebSocket连接错误'));
        setIsConnected(false);
      }
    );

    // 监听连接状态
    const checkInterval = setInterval(() => {
      if (apiServiceRef.current) {
        const state = apiServiceRef.current.getWebSocketState();
        setIsConnected(state === 'OPEN');
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      if (apiServiceRef.current) {
        apiServiceRef.current.disconnectWebSocket();
      }
      setIsConnected(false);
    };
  }, [enabled, mode, handleTaskStatusUpdate]);

  return {
    isConnected,
    error,
    lastUpdateTime
  };
}

