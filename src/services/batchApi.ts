import { DeploymentTask } from '../types/deployment';
import { BatchInfo, sortTasksByDeployOrder } from '../utils/batchUtils';

/**
 * 批次分组API响应接口
 */
export interface BatchGroupResponse {
  batches: BatchInfo[];
  unbatchedTasks: DeploymentTask[];
}

/**
 * 本地存储Key
 */
const STORAGE_KEY = 'devops_batch_data';

/**
 * 从本地存储获取批次数据
 */
function getStoredBatchData(): DeploymentTask[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('读取本地存储批次数据失败:', error);
  }
  return [];
}

/**
 * 保存批次数据到本地存储
 */
function saveBatchData(tasks: DeploymentTask[]): void {
  try {
    // 只保存有分组标识的任务，用于持久化
    const batchTasks = tasks.filter(task => task.groupKey && task.groupKey !== '0');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batchTasks));
  } catch (error) {
    console.error('保存批次数据到本地存储失败:', error);
  }
}

/**
 * 获取批次分组数据（Mock - 模拟真实API，支持数据持久化）
 * @param tasks 所有部署任务
 * @returns 批次分组数据
 */
export async function getBatchGroups(tasks: DeploymentTask[]): Promise<BatchGroupResponse> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // 从本地存储恢复批次信息（模拟从服务器获取历史批次数据）
  const storedBatchTasks = getStoredBatchData();
  
  // 合并当前任务和存储的批次数据
  // 如果当前任务有 groupKey，使用当前任务；否则尝试从存储中恢复
  const taskMap = new Map<string, DeploymentTask>();
  
  // 先添加当前任务（优先级高）
  tasks.forEach(task => {
    taskMap.set(task.key, task);
  });
  
  // 再从存储中恢复批次信息（如果任务不存在或没有分组标识）
  storedBatchTasks.forEach(storedTask => {
    const currentTask = taskMap.get(storedTask.key);
    if (currentTask) {
      // 如果当前任务已经有 groupKey，保持不变；否则使用存储的 groupKey
      if ((!currentTask.groupKey || currentTask.groupKey === '0') && storedTask.groupKey && storedTask.groupKey !== '0') {
        taskMap.set(storedTask.key, { ...currentTask, groupKey: storedTask.groupKey });
      }
    } else {
      // 如果任务不存在但存储中有，使用存储的数据（仅用于恢复批次信息）
      taskMap.set(storedTask.key, storedTask);
    }
  });
  
  // 将任务列表转换回数组
  const mergedTasks = Array.from(taskMap.values());
  
  // 保存当前批次数据到本地存储（模拟持久化）
  saveBatchData(mergedTasks);
  
  // Mock数据：按批次分组任务
  const batchMap = new Map<string, DeploymentTask[]>();
  const unbatchedTasks: DeploymentTask[] = [];

  mergedTasks.forEach(task => {
    const groupKey = task.groupKey;
    if (groupKey && groupKey !== '0') {
      if (!batchMap.has(groupKey)) {
        batchMap.set(groupKey, []);
      }
      batchMap.get(groupKey)!.push(task);
    } else {
      unbatchedTasks.push(task);
    }
  });

  const batches: BatchInfo[] = Array.from(batchMap.entries())
    .map(([groupKey, batchTasks]) => {
      const createTime = Math.min(...batchTasks.map(t => t.deployTime || Date.now()));
      const sortedTasks = sortTasksByDeployOrder(batchTasks);

      return {
        batchId: groupKey, // 兼容旧接口，使用 groupKey 作为 batchId
        batchNumber: 0,
        createTime,
        tasks: sortedTasks
      };
    })
    .sort((a, b) => a.createTime - b.createTime) // 按创建时间升序排序，确保先创建的批次号较小
    .map((batch, index) => ({
      ...batch,
      batchNumber: index + 1
    }));

  return {
    batches,
    unbatchedTasks
  };
}

/**
 * 清除本地存储的批次数据（用于测试或重置）
 */
export function clearStoredBatchData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清除本地存储批次数据失败:', error);
  }
}

