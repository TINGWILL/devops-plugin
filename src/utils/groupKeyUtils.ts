/**
 * 分组 Key 处理工具函数
 */

/**
 * 从 Semi Design Table 的 expandedRowKeys 数组中提取分组 keys
 * 
 * @param keys - 可能包含对象或字符串的数组
 * @returns 提取后的分组 key 数组
 */
export function extractGroupKeys(keys: unknown[]): string[] {
  const normalizedGroupKeys: string[] = keys.map((key) => {
    let extractedGroupKey = '';

    if (typeof key === 'object' && key !== null) {
      // 判断是否是数据行对象（有 appName 等数据字段）
      const isDataRow = 'appName' in key && (key as { appName?: unknown }).appName;

      if (isDataRow) {
        // 数据行对象，跳过
        return '';
      }

      const keyObj = key as Record<string, unknown>;

      // 优先从 groupKey 字段提取
      if ('groupKey' in keyObj && keyObj.groupKey !== undefined && keyObj.groupKey !== null) {
        const groupKey = keyObj.groupKey;
        if (typeof groupKey === 'string' && groupKey !== '[object Object]') {
          extractedGroupKey = groupKey;
        } else if (typeof groupKey === 'number') {
          extractedGroupKey = String(groupKey);
        }
      }
      // 如果没有 groupKey，但有 key 字段（可能是分组标识对象）
      else if ('key' in keyObj && keyObj.key !== undefined && keyObj.key !== null) {
        const isGroupObject = Object.keys(keyObj).length <= 3 && !isDataRow;
        if (isGroupObject) {
          extractedGroupKey = String(keyObj.key);
        }
      }
    } else {
      // 字符串或数字，直接使用
      extractedGroupKey = String(key);
    }

    return extractedGroupKey === '0' ? '0' : extractedGroupKey;
  });

  // 过滤空值，去重并排序
  return Array.from(new Set(normalizedGroupKeys.filter(key => key !== ''))).sort();
}

