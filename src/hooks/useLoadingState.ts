import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 加载状态管理 Hook
 * 用于跟踪异步操作的加载状态
 */
export function useLoadingState() {
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [loadingOperations, setLoadingOperations] = useState<Set<string>>(new Set());
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * 设置任务加载状态
   */
  const setTaskLoading = useCallback((taskKey: string, loading: boolean, timeout = 30000) => {
    if (loading) {
      setLoadingTasks((prev) => new Set(prev).add(taskKey));
      
      // 设置超时，防止状态卡住
      const timeoutId = setTimeout(() => {
        setLoadingTasks((prev) => {
          const next = new Set(prev);
          next.delete(taskKey);
          return next;
        });
        timeoutRefs.current.delete(taskKey);
      }, timeout);
      
      timeoutRefs.current.set(taskKey, timeoutId);
    } else {
      setLoadingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskKey);
        return next;
      });
      
      // 清除超时定时器
      const timeoutId = timeoutRefs.current.get(taskKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutRefs.current.delete(taskKey);
      }
    }
  }, []);

  /**
   * 检查任务是否正在加载
   */
  const isTaskLoading = useCallback((taskKey: string) => {
    return loadingTasks.has(taskKey);
  }, [loadingTasks]);

  /**
   * 设置操作加载状态
   */
  const setOperationLoading = useCallback((operationKey: string, loading: boolean) => {
    setLoadingOperations((prev) => {
      const next = new Set(prev);
      if (loading) {
        next.add(operationKey);
      } else {
        next.delete(operationKey);
      }
      return next;
    });
  }, []);

  /**
   * 检查操作是否正在加载
   */
  const isOperationLoading = useCallback((operationKey: string) => {
    return loadingOperations.has(operationKey);
  }, [loadingOperations]);

  /**
   * 批量设置任务加载状态
   */
  const setBatchTaskLoading = useCallback((taskKeys: string[], loading: boolean) => {
    taskKeys.forEach((key) => setTaskLoading(key, loading));
  }, [setTaskLoading]);

  /**
   * 清除所有加载状态
   */
  const clearAllLoading = useCallback(() => {
    setLoadingTasks(new Set());
    setLoadingOperations(new Set());
    
    // 清除所有超时定时器
    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  return {
    loadingTasks,
    loadingOperations,
    setTaskLoading,
    isTaskLoading,
    setOperationLoading,
    isOperationLoading,
    setBatchTaskLoading,
    clearAllLoading
  };
}

