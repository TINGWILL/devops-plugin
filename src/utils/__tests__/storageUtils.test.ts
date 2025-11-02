import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFromStorage,
  saveToStorage,
  loadArrayFromStorage,
  saveArrayToStorage,
} from '../storageUtils';

describe('storageUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadFromStorage', () => {
    it('应该从 localStorage 加载数据', () => {
      const testData = { key: 'value', number: 123 };
      localStorage.setItem('test-key', JSON.stringify(testData));

      const result = loadFromStorage<typeof testData>('test-key');

      expect(result).toEqual(testData);
    });

    it('当 key 不存在时应该返回 null', () => {
      const result = loadFromStorage('non-existent-key');

      expect(result).toBeNull();
    });

    it('当 localStorage 为空时应该返回 null', () => {
      localStorage.setItem('empty-key', '');

      const result = loadFromStorage('empty-key');

      expect(result).toBeNull();
    });

    it('当 JSON 解析失败时应该返回 null', () => {
      localStorage.setItem('invalid-json', '{ invalid json }');

      const result = loadFromStorage('invalid-json');

      expect(result).toBeNull();
    });

    it('应该正确处理复杂对象', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { key: 'value' },
        date: new Date().toISOString(),
      };
      localStorage.setItem('complex-key', JSON.stringify(complexData));

      const result = loadFromStorage<typeof complexData>('complex-key');

      expect(result).toEqual(complexData);
    });
  });

  describe('saveToStorage', () => {
    it('应该保存数据到 localStorage', () => {
      const testData = { key: 'value' };

      saveToStorage('test-key', testData);

      const stored = localStorage.getItem('test-key');
      expect(stored).toBe(JSON.stringify(testData));
    });

    it('应该处理保存失败的情况', () => {
      // Mock localStorage.setItem 抛出错误
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // 不应该抛出错误
      expect(() => {
        saveToStorage('test-key', { data: 'test' });
      }).not.toThrow();

      // 恢复原函数
      Storage.prototype.setItem = originalSetItem;
    });

    it('应该正确序列化复杂对象', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { key: 'value' },
      };

      saveToStorage('complex-key', complexData);

      const stored = localStorage.getItem('complex-key');
      expect(JSON.parse(stored!)).toEqual(complexData);
    });
  });

  describe('loadArrayFromStorage', () => {
    it('应该从 localStorage 加载字符串数组', () => {
      const testArray = ['item1', 'item2', 'item3'];
      localStorage.setItem('array-key', JSON.stringify(testArray));

      const result = loadArrayFromStorage('array-key');

      expect(result).toEqual(testArray);
    });

    it('当 key 不存在时应该返回空数组', () => {
      const result = loadArrayFromStorage('non-existent-key');

      expect(result).toEqual([]);
    });

    it('当存储的不是数组时应该返回空数组', () => {
      localStorage.setItem('not-array', JSON.stringify({ key: 'value' }));

      const result = loadArrayFromStorage('not-array');

      expect(result).toEqual([]);
    });

    it('当数组包含非字符串元素时应该返回空数组', () => {
      localStorage.setItem('mixed-array', JSON.stringify(['string', 123, true]));

      const result = loadArrayFromStorage('mixed-array');

      expect(result).toEqual([]);
    });

    it('当 JSON 解析失败时应该返回空数组', () => {
      localStorage.setItem('invalid-json', '{ invalid }');

      const result = loadArrayFromStorage('invalid-json');

      expect(result).toEqual([]);
    });

    it('应该处理空数组', () => {
      localStorage.setItem('empty-array', JSON.stringify([]));

      const result = loadArrayFromStorage('empty-array');

      expect(result).toEqual([]);
    });
  });

  describe('saveArrayToStorage', () => {
    it('应该保存字符串数组到 localStorage', () => {
      const testArray = ['item1', 'item2', 'item3'];

      saveArrayToStorage('array-key', testArray);

      const stored = localStorage.getItem('array-key');
      expect(JSON.parse(stored!)).toEqual(testArray);
    });

    it('应该处理空数组', () => {
      saveArrayToStorage('empty-array', []);

      const stored = localStorage.getItem('empty-array');
      expect(JSON.parse(stored!)).toEqual([]);
    });

    it('应该处理保存失败的情况', () => {
      // Mock localStorage.setItem 抛出错误
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // 不应该抛出错误
      expect(() => {
        saveArrayToStorage('test-key', ['item1']);
      }).not.toThrow();

      // 恢复原函数
      Storage.prototype.setItem = originalSetItem;
    });
  });
});

