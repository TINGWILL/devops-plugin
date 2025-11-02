/**
 * 本地存储工具函数
 */

/**
 * 从 localStorage 加载字符串数组
 */
export function loadArrayFromStorage(key: string): string[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    }
  } catch (error) {
    // 读取失败，返回空数组
  }
  return [];
}

/**
 * 保存字符串数组到 localStorage
 */
export function saveArrayToStorage(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // 保存失败，忽略错误
  }
}

/**
 * 从 localStorage 加载数据
 */
export function loadFromStorage<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed as T;
    }
  } catch (error) {
    // 读取失败，返回 null
  }
  return null;
}

/**
 * 保存数据到 localStorage
 */
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // 保存失败，忽略错误
  }
}

