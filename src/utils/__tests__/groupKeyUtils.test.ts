import { describe, it, expect } from 'vitest';
import { extractGroupKeys } from '../groupKeyUtils';

describe('groupKeyUtils', () => {
  describe('extractGroupKeys', () => {
    it('应该从字符串数组中提取分组 keys', () => {
      const keys = ['group-1', 'group-2', '0'];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['0', 'group-1', 'group-2']);
    });

    it('应该从数字数组中提取分组 keys', () => {
      const keys = [1, 2, 0];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['0', '1', '2']);
    });

    it('应该从对象数组中提取 groupKey 字段', () => {
      const keys = [
        { groupKey: 'group-1' },
        { groupKey: 'group-2' },
        { groupKey: '0' },
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['0', 'group-1', 'group-2']);
    });

    it('应该从对象数组中提取数字类型的 groupKey', () => {
      const keys = [
        { groupKey: 1 },
        { groupKey: 2 },
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['1', '2']);
    });

    it('应该从混合类型数组中提取分组 keys', () => {
      const keys = [
        'group-1',
        { groupKey: 'group-2' },
        3,
        { groupKey: 4 },
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['3', '4', 'group-1', 'group-2']);
    });

    it('应该跳过数据行对象（有 appName 字段）', () => {
      const keys = [
        { groupKey: 'group-1' },
        { appName: 'App1', groupKey: 'group-2' }, // 数据行，应该跳过
        { groupKey: 'group-3' },
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1', 'group-3']);
    });

    it('应该从对象中提取 key 字段（当没有 groupKey 时）', () => {
      const keys = [
        { key: 'group-1' },
        { key: 'group-2' },
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1', 'group-2']);
    });

    it('应该过滤空值', () => {
      const keys = [
        'group-1',
        '',
        'group-2',
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1', 'group-2']);
    });

    it('应该去重', () => {
      const keys = ['group-1', 'group-2', 'group-1', 'group-2'];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1', 'group-2']);
    });

    it('应该排序结果', () => {
      const keys = ['group-3', 'group-1', 'group-2'];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1', 'group-2', 'group-3']);
    });

    it('应该处理空数组', () => {
      const result = extractGroupKeys([]);
      
      expect(result).toEqual([]);
    });

    it('应该处理空字符串数组', () => {
      const keys = ['', '', ''];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual([]);
    });

    it('应该处理 [object Object] 字符串', () => {
      const keys = [
        { groupKey: '[object Object]' }, // 应该被过滤
        { groupKey: 'group-1' },
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1']);
    });

    it('应该保持 "0" 作为默认分组标识', () => {
      const keys = ['0', 'group-1'];
      const result = extractGroupKeys(keys);
      
      expect(result).toContain('0');
      expect(result).toContain('group-1');
    });

    it('应该处理复杂对象（有多个字段但不是数据行）', () => {
      const keys = [
        { key: 'group-1', count: 3 }, // 简单对象，应该提取
        { appName: 'App', key: 'group-2' }, // 数据行，应该跳过
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1']);
    });

    it('应该优先使用 groupKey 而不是 key', () => {
      const keys = [
        { groupKey: 'group-1', key: 'other-key' },
      ];
      const result = extractGroupKeys(keys);
      
      expect(result).toEqual(['group-1']);
    });
  });
});

