import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DeploymentTask } from '../types/deployment';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { saveToStorage, loadFromStorage } from '../utils/storageUtils';

/**
 * 部署状态管理 Store
 * 统一管理部署任务、选中状态、分组展开状态等
 */
interface DeploymentStore {
  // 任务数据
  tasks: DeploymentTask[];
  setTasks: (tasks: DeploymentTask[] | ((prev: DeploymentTask[]) => DeploymentTask[])) => void;
  updateTask: (key: string, updates: Partial<DeploymentTask>) => void;
  deleteTask: (key: string) => void;
  addTasks: (tasks: DeploymentTask[]) => void;

  // 选中状态
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;

  // 分组展开状态
  expandedGroupKeys: string[];
  setExpandedGroupKeys: (keys: string[] | ((prev: string[]) => string[])) => void;

  // 重置所有状态（用于测试或清理）
  reset: () => void;
}

/**
 * 默认初始状态
 */
const defaultState = {
  tasks: [],
  selectedKeys: [],
  expandedGroupKeys: []
};

/**
 * 延迟保存任务数据到 localStorage 的辅助函数
 */
function scheduleSaveTasks(getState: () => DeploymentStore) {
  setTimeout(() => {
    try {
      saveToStorage(STORAGE_KEYS.TASKS_DATA, getState().tasks);
    } catch (error) {
      console.error('保存任务数据失败:', error);
    }
  }, 100);
}

/**
 * 创建部署状态 Store（带持久化）
 */
export const useDeploymentStore = create<DeploymentStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // 设置任务列表
      setTasks: (tasks) => {
        set((state) => ({
          tasks: typeof tasks === 'function' ? tasks(state.tasks) : tasks
        }));
        
        // 自动保存到 localStorage（延迟保存，避免频繁写入）
        scheduleSaveTasks(get);
      },

      // 更新单个任务
      updateTask: (key: string, updates: Partial<DeploymentTask>) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.key === key ? { ...task, ...updates } : task
          )
        }));
        
        // 自动保存
        scheduleSaveTasks(get);
      },

      // 删除任务
      deleteTask: (key: string) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.key !== key),
          selectedKeys: state.selectedKeys.filter((k) => k !== key)
        }));
        
        // 自动保存
        scheduleSaveTasks(get);
      },

      // 添加任务
      addTasks: (newTasks: DeploymentTask[]) => {
        set((state) => ({
          tasks: [...state.tasks, ...newTasks]
        }));
        
        // 自动保存
        scheduleSaveTasks(get);
      },

      // 设置选中的任务keys
      setSelectedKeys: (keys: string[] | ((prev: string[]) => string[])) => {
        set({ selectedKeys: typeof keys === 'function' ? keys(get().selectedKeys) : keys });
      },

      // 设置展开的分组keys
      setExpandedGroupKeys: (keys) => {
        set((state) => ({
          expandedGroupKeys: typeof keys === 'function' 
            ? keys(state.expandedGroupKeys) 
            : keys
        }));
        
        // 自动保存分组展开状态
        const currentKeys = typeof keys === 'function' 
          ? keys(get().expandedGroupKeys) 
          : keys;
        setTimeout(() => {
          try {
            saveToStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS, currentKeys);
          } catch (error) {
            console.error('保存分组展开状态失败:', error);
          }
        }, 100);
      },

      // 重置所有状态
      reset: () => {
        set(defaultState);
        try {
          saveToStorage(STORAGE_KEYS.TASKS_DATA, []);
          saveToStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS, []);
        } catch (error) {
          console.error('重置状态失败:', error);
        }
      }
    }),
    {
      name: 'deployment-storage',
      // 部分持久化：只持久化分组展开状态，任务数据通过手动保存
      partialize: (state) => ({
        expandedGroupKeys: state.expandedGroupKeys
      })
    }
  )
);

/**
 * 初始化 Store：从 localStorage 加载数据
 */
export function initDeploymentStore() {
  const storedTasks = loadFromStorage<DeploymentTask[]>(STORAGE_KEYS.TASKS_DATA);
  if (storedTasks && Array.isArray(storedTasks) && storedTasks.length > 0) {
    useDeploymentStore.getState().setTasks(storedTasks);
  }
  
  const storedExpandedKeys = loadFromStorage<string[]>(STORAGE_KEYS.EXPANDED_GROUP_KEYS);
  if (storedExpandedKeys && Array.isArray(storedExpandedKeys)) {
    useDeploymentStore.getState().setExpandedGroupKeys(storedExpandedKeys);
  }
}

