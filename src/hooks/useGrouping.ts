import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DeploymentTask } from '../types/deployment';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { loadArrayFromStorage, saveArrayToStorage } from '../utils/storageUtils';
import { extractGroupKeys } from '../utils/groupKeyUtils';

interface GroupInfo {
    groupId: string;
    groupNumber: number;
    taskCount: number;
    createTime: number;
}

interface UseGroupingProps {
    dataSource: DeploymentTask[];
}

/**
 * 分组管理 Hook
 * 处理分组展开/收起、分组信息计算、分组排序等逻辑
 */
export const useGrouping = ({ dataSource }: UseGroupingProps) => {
    // 分组展开状态（存储所有展开的分组 groupKey）
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>(() =>
        loadArrayFromStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS)
    );

    // 标记是否已初始化展开状态
    const isInitializedRef = useRef(false);
    // 记录上一次的所有分组 key，用于检测新增分组
    const prevGroupKeysRef = useRef<Set<string>>(new Set());
    // 记录初始化时的分组 key 集合
    const initialGroupKeysRef = useRef<Set<string>>(new Set());

    // 检查是否显示分组：当存在有 groupKey 且不为 '0' 的任务时显示分组
    const showGrouping = useMemo(() => {
        return dataSource.some(task => task.groupKey && task.groupKey !== '0');
    }, [dataSource]);

    // 获取所有分组的 groupKey，用于初始化展开状态
    const allGroupKeys = useMemo(() => {
        if (!showGrouping) {
            return [];
        }
        const groupKeys: string[] = [];
        const groupKeySet = new Set<string>();
        
        dataSource.forEach(task => {
            const taskGroupKey = task.groupKey || '0';
            if (taskGroupKey !== '0') {
                groupKeySet.add(taskGroupKey);
            }
        });
        
        groupKeySet.forEach(groupKey => groupKeys.push(groupKey));
        
        // 检查是否有默认分组的任务
        const hasUnbatchedTasks = dataSource.some(task => !task.groupKey || task.groupKey === '0');
        if (hasUnbatchedTasks) {
            groupKeys.push('0');
        }
        
        return groupKeys;
    }, [dataSource, showGrouping]);

    // 初始化时展开所有分组，或当有新分组添加时展开新分组
    useEffect(() => {
        if (showGrouping && allGroupKeys.length > 0) {
            const currentGroupKeysSet = new Set(allGroupKeys);
            
            if (!isInitializedRef.current) {
                // 首次初始化
                setExpandedRowKeys(prevKeys => {
                    // 检查 localStorage 中是否存在该 key，以区分"从未初始化"和"用户手动收起所有分组"
                    const hasStoredData = localStorage.getItem(STORAGE_KEYS.EXPANDED_GROUP_KEYS) !== null;
                    
                    // 如果 prevKeys 有值，直接使用；否则从 localStorage 加载
                    const currentKeys = prevKeys.length > 0 ? prevKeys : loadArrayFromStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS);
                    
                    initialGroupKeysRef.current = currentGroupKeysSet;
                    
                    // 如果 localStorage 中不存在该 key（从未初始化），默认展开所有分组
                    if (!hasStoredData) {
                        return [...allGroupKeys];
                    }
                    
                    // localStorage 中存在该 key，说明之前有过操作，应该尊重用户的收起选择
                    if (currentKeys.length > 0) {
                        const validKeys = currentKeys.filter(key => allGroupKeys.includes(key));
                        
                        if (validKeys.length > 0) {
                            if (validKeys.length !== currentKeys.length) {
                                return validKeys;
                            } else {
                                return currentKeys;
                            }
                        } else {
                            // 如果之前保存的 keys 在当前分组中都不存在了，说明是旧数据，默认展开所有
                            return [...allGroupKeys];
                        }
                    } else {
                        // currentKeys 为空数组，说明用户手动收起所有分组，保持收起状态
                        return [];
                    }
                });
                isInitializedRef.current = true;
                prevGroupKeysRef.current = currentGroupKeysSet;
            } else {
                // 已有初始化：只展开真正新增的分组
                const prevGroupKeysSet = prevGroupKeysRef.current;
                const newKeys = allGroupKeys.filter(key => !prevGroupKeysSet.has(key));
                
                if (newKeys.length > 0) {
                    setExpandedRowKeys(prevKeys => {
                        const keysToAdd = newKeys.filter(key => !prevKeys.includes(key));
                        if (keysToAdd.length > 0) {
                            return [...prevKeys, ...keysToAdd];
                        }
                        return prevKeys;
                    });
                } else {
                    // 清理已删除的分组
                    setExpandedRowKeys(prevKeys => {
                        const validKeys = prevKeys.filter(key => allGroupKeys.includes(key));
                        if (validKeys.length !== prevKeys.length) {
                            return validKeys;
                        }
                        return prevKeys;
                    });
                }
                prevGroupKeysRef.current = currentGroupKeysSet;
            }
        }
    }, [showGrouping, allGroupKeys]);

    // 当展开状态变化时，保存到本地存储
    useEffect(() => {
        if (isInitializedRef.current) {
            saveArrayToStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS, expandedRowKeys);
        }
    }, [expandedRowKeys]);

    // 处理分组展开/收起变化（用户手动操作）
    const handleExpandedRowsChange = useCallback((keys: unknown[]) => {
        setExpandedRowKeys(prevKeys => {
            const uniqueGroupKeys = extractGroupKeys(keys);
            saveArrayToStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS, uniqueGroupKeys);
            return uniqueGroupKeys;
        });
    }, []);

    // 构建分组信息映射，用于渲染分组头部和排序
    const groupInfoMap = useMemo(() => {
        const map = new Map<string, GroupInfo>();
        const groupCountMap = new Map<string, { count: number; createTime: number }>();
        
        dataSource.forEach(task => {
            const taskGroupKey = task.groupKey || '0';
            if (taskGroupKey !== '0') {
                const existing = groupCountMap.get(taskGroupKey);
                const createTime = task.deployTime || Date.now();
                if (existing) {
                    existing.count++;
                    if (createTime < existing.createTime) {
                        existing.createTime = createTime;
                    }
                } else {
                    groupCountMap.set(taskGroupKey, { count: 1, createTime });
                }
            }
        });
        
        const sortedGroups = Array.from(groupCountMap.entries())
            .map(([groupId, info]) => ({ groupId, ...info }))
            .sort((a, b) => a.createTime - b.createTime);
        
        sortedGroups.forEach((group, index) => {
            map.set(group.groupId, {
                groupId: group.groupId,
                groupNumber: index + 1,
                taskCount: group.count,
                createTime: group.createTime
            });
        });
        
        return map;
    }, [dataSource]);

    // 分组顺序比较函数
    const compareGroupOrder = useCallback((a: DeploymentTask, b: DeploymentTask): number => {
        const groupKeyA = a.groupKey || '0';
        const groupKeyB = b.groupKey || '0';
        
        if (groupKeyA === groupKeyB) {
            return 0;
        }
        
        // 默认分组排在最后
        if (groupKeyA === '0' && groupKeyB !== '0') {
            return 1;
        }
        if (groupKeyA !== '0' && groupKeyB === '0') {
            return -1;
        }
        
        // 分组按提交批量部署时间正序排序
        const groupInfoA = groupInfoMap.get(groupKeyA);
        const groupInfoB = groupInfoMap.get(groupKeyB);
        const createTimeA = groupInfoA?.createTime || 0;
        const createTimeB = groupInfoB?.createTime || 0;
        return createTimeA - createTimeB;
    }, [groupInfoMap]);

    // 构建表格数据源（按分组顺序排序）
    const tableDataSource = useMemo(() => {
        const source = dataSource || [];
        
        if (!showGrouping) {
            return source;
        }
        
        const processedSource = source.map(task => ({
            ...task,
            groupKey: task.groupKey || '0'
        }));
        
        return processedSource.sort((a, b) => {
            return compareGroupOrder(a, b);
        });
    }, [dataSource, showGrouping, compareGroupOrder]);

    // 获取分组标签颜色
    const getGroupTagColor = useCallback((groupNumber: number) => {
        const colors = [
            { bg: '#E6F4FF', text: '#1890FF' },
            { bg: '#FFF7E6', text: '#FA8C16' },
            { bg: '#F6FFED', text: '#52C41A' },
            { bg: '#FFF1F0', text: '#F5222D' },
            { bg: '#F9F0FF', text: '#722ED1' },
        ];
        return colors[(groupNumber - 1) % colors.length];
    }, []);

    // 处理分组行交互
    const onGroupedRow = useCallback((group: any, index: number) => {
        return {};
    }, []);

    return {
        showGrouping,
        expandedRowKeys,
        handleExpandedRowsChange,
        groupInfoMap,
        compareGroupOrder,
        tableDataSource,
        getGroupTagColor,
        onGroupedRow,
        allGroupKeys
    };
};

