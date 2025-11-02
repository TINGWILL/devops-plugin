import { DeploymentTask } from '../hooks/useDeploymentStatus';

/**
 * 生成分组标识符（Group Key）
 */
export function generateGroupKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `BATCH-${timestamp}-${random}`;
}

/**
 * 批次信息接口（保留用于兼容，实际使用 groupKey）
 * @deprecated 使用 groupKey 替代 batchId
 */
export interface BatchInfo {
  batchId: string;
  batchNumber: number;
  createTime: number;
  tasks: DeploymentTask[];
}

/**
 * 按分组标识符分组任务
 */
export function groupTasksByBatch(tasks: DeploymentTask[]): {
  batches: BatchInfo[];
  unbatchedTasks: DeploymentTask[];
} {
  const groupMap = new Map<string, DeploymentTask[]>();
  const unbatchedTasks: DeploymentTask[] = [];

  tasks.forEach(task => {
    // 使用 groupKey，如果没有则使用默认值 '0'
    const groupKey = task.groupKey || '0';
    if (groupKey !== '0') {
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(task);
    } else {
      unbatchedTasks.push(task);
    }
  });

  const batches: BatchInfo[] = Array.from(groupMap.entries())
    .map(([groupKey, groupTasks]) => {
      const createTime = Math.min(...groupTasks.map(t => t.deployTime));
      const sortedTasks = [...groupTasks].sort((a, b) => {
        const orderA = a.deployOrder ?? 999999;
        const orderB = b.deployOrder ?? 999999;
        return orderA - orderB;
      });

      return {
        batchId: groupKey, // 兼容旧接口
        batchNumber: 0,
        createTime,
        tasks: sortedTasks
      };
    })
    .sort((a, b) => a.createTime - b.createTime) // 按创建时间升序排序，确保先创建的分组号较小
    .map((batch, index) => ({
      ...batch,
      batchNumber: index + 1
    }));

  return { batches, unbatchedTasks };
}

