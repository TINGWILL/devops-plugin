import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Table, Avatar, Tag, Button, Modal, Toast, Input, Space, Dropdown } from '@douyinfe/semi-ui';
import { IconPlus, IconCopy, IconDelete } from '@douyinfe/semi-icons';
import * as dateFns from 'date-fns';
import { useDeploymentStatus, DeploymentTask } from '../../hooks/useDeploymentStatus';
import { useBatchOperations } from '../../hooks/useBatchOperations';
import { OperationButtons } from '../../components/OperationButtons';
import { StatusTag } from '../../components/StatusTag';
import { DeploymentStatus, OperationType, STATUS_CONFIG } from '../../constants/deploymentStatus';
import { generateGroupKey } from '../../utils/batchUtils';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { loadArrayFromStorage, saveArrayToStorage, loadFromStorage, saveToStorage } from '../../utils/storageUtils';
import { extractGroupKeys } from '../../utils/groupKeyUtils';
import { useFeishuTheme } from '../../hooks/useFeishuTheme';
import { generateMockTasks } from '../../utils/mockData';

// 使用 DeploymentTask 作为数据项类型
type DataItem = DeploymentTask;

interface AppFormItem {
    key: string;
    appName: string;
    artifactRepo: string;
    artifactVersion: string;
}

interface AppInfo {
    name: string;
    artifactRepo: string;
    latestVersion: string;
    versions: string[];
}

// Mock应用数据
const MOCK_APPS: AppInfo[] = [
    {
        name: '用户服务',
        artifactRepo: 'registry.company.com/user-service',
        latestVersion: 'v2.1.5',
        versions: ['v2.1.5', 'v2.1.4', 'v2.1.3', 'v2.0.8', 'v2.0.7']
    },
    {
        name: '订单服务',
        artifactRepo: 'registry.company.com/order-service',
        latestVersion: 'v1.8.2',
        versions: ['v1.8.2', 'v1.8.1', 'v1.8.0', 'v1.7.9', 'v1.7.8']
    },
    {
        name: '支付服务',
        artifactRepo: 'registry.company.com/payment-service',
        latestVersion: 'v3.2.1',
        versions: ['v3.2.1', 'v3.2.0', 'v3.1.5', 'v3.1.4', 'v3.0.12']
    },
    {
        name: '商品服务',
        artifactRepo: 'registry.company.com/product-service',
        latestVersion: 'v1.5.8',
        versions: ['v1.5.8', 'v1.5.7', 'v1.5.6', 'v1.4.15', 'v1.4.14']
    },
    {
        name: '库存服务',
        artifactRepo: 'registry.company.com/inventory-service',
        latestVersion: 'v2.3.4',
        versions: ['v2.3.4', 'v2.3.3', 'v2.3.2', 'v2.2.8', 'v2.2.7']
    },
    {
        name: '通知服务',
        artifactRepo: 'registry.company.com/notification-service',
        latestVersion: 'v1.2.9',
        versions: ['v1.2.9', 'v1.2.8', 'v1.2.7', 'v1.1.12', 'v1.1.11']
    },
    {
        name: '网关服务',
        artifactRepo: 'registry.company.com/gateway-service',
        latestVersion: 'v4.0.3',
        versions: ['v4.0.3', 'v4.0.2', 'v4.0.1', 'v3.9.8', 'v3.9.7']
    },
    {
        name: '配置中心',
        artifactRepo: 'registry.company.com/config-center',
        latestVersion: 'v1.0.15',
        versions: ['v1.0.15', 'v1.0.14', 'v1.0.13', 'v0.9.22', 'v0.9.21']
    }
];

const POD_STATUS_CONFIG = {
    'running': { text: '运行中', order: 1 },
    'pending': { text: '等待中', order: 2 },
    'failed': { text: '失败', order: 3 }
};

function App() {
    // 使用新的状态管理Hook
    const {
        tasks: dataSource,
        setTasks: setData,
        handleOperation: originalHandleOperation,
        getButtonConfig
    } = useDeploymentStatus([]);
    
    const {
        selectedKeys: selectedRowKeys,
        setSelectedKeys: setSelectedRowKeys,
        handleBatchOperation,
        canPerformBatchOperation
    } = useBatchOperations();
    
    // 删除确认弹窗相关状态已移除
    const [addAppModalVisible, setAddAppModalVisible] = useState(false);
    const [appFormItems, setAppFormItems] = useState<AppFormItem[]>([]);
    // 批量操作弹窗已移除，逻辑移至Hook中
    const [appSearchState, setAppSearchState] = useState<{
        visible: Record<string, boolean>;
        results: AppInfo[];
    }>({ visible: {}, results: [] });
    const [batchDropdownVisible, setBatchDropdownVisible] = useState(false);
    const [batchConfirmVisible, setBatchConfirmVisible] = useState(false);
    const [batchConfirmOperation, setBatchConfirmOperation] = useState<OperationType | null>(null);
    // 删除确认弹窗
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleteConfirmTask, setDeleteConfirmTask] = useState<DeploymentTask | null>(null);
    
    // 包装 handleOperation，删除操作时先显示确认弹窗
    // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
    const handleOperation = useCallback(async (operation: OperationType, task: DeploymentTask, silent?: boolean) => {
        if (operation === OperationType.DELETE) {
            // 删除操作：显示确认弹窗（批量操作时 silent 参数不影响删除确认）
            setDeleteConfirmTask(task);
            setDeleteConfirmVisible(true);
        } else {
            // 其他操作：直接执行，传递 silent 参数
            await originalHandleOperation(operation, task, silent);
        }
    }, [originalHandleOperation]);
    
    // 确认删除操作
    const confirmDelete = useCallback(async () => {
        if (deleteConfirmTask) {
            const taskToDelete = deleteConfirmTask;
            setDeleteConfirmVisible(false);
            setDeleteConfirmTask(null);
            await originalHandleOperation(OperationType.DELETE, taskToDelete);
        }
    }, [deleteConfirmTask, originalHandleOperation]);
    
    // 飞书项目系统主题跟随
    const isDarkMode = useFeishuTheme();

    // 配置 Toast 容器（仅在组件挂载时配置一次）
    // 注意：Toast 需要渲染到 document.body 才能在所有层级显示
    useEffect(() => {
        if (Toast.config) {
            Toast.config({
                getPopupContainer: () => document.body
            });
        }
    }, []);

    // 分组展开状态（存储所有展开的分组 groupKey）
    // 优先从本地存储恢复，如果没有则使用空数组
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>(() => 
        loadArrayFromStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS)
    );
    // 标记是否已初始化展开状态（刷新页面时初始化一次）
    const isInitializedRef = useRef(false);
    // 记录上一次的所有分组 key，用于检测新增分组
    const prevGroupKeysRef = useRef<Set<string>>(new Set());
    // 记录初始化时的分组 key 集合（从 localStorage 恢复时的分组状态）
    const initialGroupKeysRef = useRef<Set<string>>(new Set());
    

    // 删除操作已移至Hook中处理

    // 新增应用
    const handleAddApp = () => {
        setAppFormItems([{ key: '1', appName: '', artifactRepo: '', artifactVersion: '' }]);
        setAddAppModalVisible(true);
    };

    const addAppRow = () => {
        const newKey = (appFormItems.length + 1).toString();
        setAppFormItems([...appFormItems, { key: newKey, appName: '', artifactRepo: '', artifactVersion: '' }]);
    };

    const copyAppRow = (index: number) => {
        const itemToCopy = appFormItems[index];
        const newKey = (appFormItems.length + 1).toString();
        setAppFormItems([...appFormItems, { ...itemToCopy, key: newKey }]);
    };

    const deleteAppRow = (index: number) => {
        if (appFormItems.length > 1) {
            setAppFormItems(appFormItems.filter((_, i) => i !== index));
        }
    };

    const updateAppFormItem = (index: number, field: keyof AppFormItem, value: string) => {
        setAppFormItems(prev => prev.map((item, i) => 
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const confirmAddApps = () => {
        const hasEmptyFields = appFormItems.some(item => 
            !item.appName.trim() || !item.artifactRepo.trim() || !item.artifactVersion.trim()
        );
        
        if (hasEmptyFields) {
            Toast.error('请填写所有必填字段');
      return;
    }

        const newTasks: DataItem[] = appFormItems.map((item, index) => ({
            key: (dataSource.length + index + 1).toString(),
            appName: item.appName,
            deployStatus: 'success',
            podStatus: 'running',
            version: item.artifactVersion,
            cluster: 'CBG多业务森华机房k8s集群(1.15)',
            namespace: 'default',
            envTag: 'prod',
            deployTime: new Date().valueOf(),
            deployer: '当前用户',
            avatarBg: ['grey', 'red', 'blue', 'green', 'orange'][index % 5],
            taskStatus: DeploymentStatus.PENDING,
            deployOrder: undefined, // 新添加的任务初始时没有部署顺序
            groupKey: '0' // 新添加的任务默认分组为 '0'（未分组）
        }));

        setData([...dataSource, ...newTasks]);
        setAddAppModalVisible(false);
        setAppFormItems([]);
        Toast.success(`成功添加 ${newTasks.length} 个应用`);
  };


    // 获取操作类型名称
    const getOperationTypeName = (operationType: string | OperationType) => {
        const operationNames = {
            'deploy': '部署',
            'whitelist': '申请加白',
            'verify_pass': '验证通过',
            'rollback': '回滚',
            'ops_intervention': '运维介入',
            'delete': '删除'
        };
        
        return operationNames[operationType] || '未知操作';
    };

    // 批量操作处理
    const handleBatchAction = (type: 'deploy' | string) => {
        const operationMap: Record<string, OperationType> = {
            'deploy': OperationType.DEPLOY,
            'whitelist': OperationType.WHITELIST,
            'verify_pass': OperationType.VERIFY_PASS,
            'rollback': OperationType.ROLLBACK,
            'ops_intervention': OperationType.OPS_INTERVENTION
        };
        
        const operation = operationMap[type];
        
        // 检查是否有符合条件的任务可以执行该操作
        if (!canPerformBatchOperation(dataSource, operation)) {
            const operationName = getOperationTypeName(operation);
            Toast.warning(`选中的任务中没有可以执行${operationName}操作的任务`);
            return;
        }
        if (operation) {
            setBatchConfirmOperation(operation);
            setBatchConfirmVisible(true);
            setBatchDropdownVisible(false);
        }
    };

    // 确认批量操作
    const confirmBatchOperation = useCallback(async () => {
        if (batchConfirmOperation) {
            if (batchConfirmOperation === OperationType.DEPLOY) {
                // 批量部署时创建批次
                const selectedTasks = dataSource.filter(task => 
                    selectedRowKeys.includes(task.key) && 
                    task.taskStatus === DeploymentStatus.PENDING &&
                    task.deployOrder !== undefined
                );
                
                if (selectedTasks.length === 0) {
                    Toast.warning('请选择有部署顺序的待部署任务');
            setBatchConfirmVisible(false);
            setBatchConfirmOperation(null);
                    return;
                }
                
                // 生成分组标识符（Group Key）
                const groupKey = generateGroupKey();
                const groupCreateTime = Date.now();
                
                // 为选中任务分配分组标识符，并更新数据源
                const updatedDataSource = dataSource.map(task => {
                    if (selectedTasks.some(t => t.key === task.key)) {
                        return { ...task, groupKey, deployTime: groupCreateTime };
                    }
                    return task;
                });
                
                // 更新状态
                setData(updatedDataSource);
                
                // 分组创建后，自动展开新创建的分组
                setExpandedRowKeys(prevKeys => {
                    if (!prevKeys.includes(groupKey)) {
                        return [...prevKeys, groupKey];
                    }
                    return prevKeys;
                });
                
                // 分组创建后，Table 的 groupBy 会自动处理分组显示
                
                // 立即调用接口，但不等待结果
                handleBatchOperation(batchConfirmOperation, updatedDataSource, handleOperation).catch(() => {
                    Toast.error('批量部署接口调用失败');
                });
                
                // 立即关闭弹窗
                setBatchConfirmVisible(false);
                setBatchConfirmOperation(null);
                // 注意：分组信息由后台返回，不需要前端生成
                // 这里只是临时更新 UI，实际分组信息应该从后台接口响应中获取
                // 批量部署的提示信息由 handleBatchOperation 统一显示
            } else {
                // 其他批量操作需要等待结果
                await handleBatchOperation(batchConfirmOperation, dataSource, handleOperation);
                setBatchConfirmVisible(false);
                setBatchConfirmOperation(null);
            }
        }
    }, [batchConfirmOperation, dataSource, selectedRowKeys, handleBatchOperation, handleOperation, setData]);
    

    // 检查是否显示分组：当存在有 groupKey 且不为 '0' 的任务时显示分组
    const showGrouping = useMemo(() => {
        return dataSource.some(task => task.groupKey && task.groupKey !== '0');
    }, [dataSource]);

    // 获取所有分组的 groupKey，用于初始化展开状态
    // 注意：groupKey 是分组的唯一标识符，默认分组为 '0'
    const allGroupKeys = useMemo(() => {
        if (!showGrouping) {
            return [];
        }
        const groupKeys: string[] = [];
        // 收集所有分组的 groupKey（排除默认分组 '0'）
        const groupKeySet = new Set<string>();
        dataSource.forEach(task => {
            // 获取任务的 groupKey，如果没有则默认为 '0'
            const taskGroupKey = task.groupKey || '0';
            if (taskGroupKey !== '0') {
                groupKeySet.add(taskGroupKey);
            }
        });
        // 添加所有真实分组的 groupKey
        groupKeySet.forEach(groupKey => groupKeys.push(groupKey));
        
        // 检查是否有默认分组的任务（groupKey 为 undefined、null 或 '0'）
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
                // 首次初始化：检查当前状态是否已经有值（从 localStorage 恢复的）
                // expandedRowKeys 的初始值已经通过 useState(() => loadArrayFromStorage(...)) 从 localStorage 恢复了
                // 使用函数式更新获取当前值，避免依赖 expandedRowKeys
                setExpandedRowKeys(prevKeys => {
                    // 如果 prevKeys 已经有值（从 localStorage 恢复），则优先使用它
                    const currentKeys = prevKeys.length > 0 ? prevKeys : loadArrayFromStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS);
                    
                    // 记录初始化时的所有分组，用于后续判断新增分组
                    initialGroupKeysRef.current = currentGroupKeysSet;
                    
                    if (currentKeys.length > 0) {
                        // 有保存的状态（已从 localStorage 恢复）：
                        // 只过滤掉已删除的分组（移除不再存在的分组）
                        // 注意：不添加"新增分组"，因为已收起的分组不应该被自动展开
                        // 新增分组会在后续的 useEffect 中处理（当 isInitializedRef.current === true 时）
                        const validKeys = currentKeys.filter(key => allGroupKeys.includes(key));
                        
                        if (validKeys.length > 0) {
                            // 有有效的 keys，保持它们（包括收起状态的分组）
                            if (validKeys.length !== currentKeys.length) {
                                // 有分组被删除，返回过滤后的 keys
                                return validKeys;
                            } else {
                                // 没有变化，完全保持当前状态（已恢复的状态，包括收起的分组）
                                return currentKeys;
                            }
                        } else {
                            // 所有保存的 keys 都不匹配（mock 数据重新生成了新的 groupKey）
                            // 这种情况下，展开所有新分组（因为无法匹配之前的状态）
                            return [...allGroupKeys];
                        }
                    } else {
                        // 没有保存的状态，默认展开所有分组
                        return [...allGroupKeys];
                    }
                });
                isInitializedRef.current = true;
                prevGroupKeysRef.current = currentGroupKeysSet;
            } else {
                // 已有初始化：只展开真正新增的分组（与上一次比较）
                const prevGroupKeysSet = prevGroupKeysRef.current;
                const newKeys = allGroupKeys.filter(key => !prevGroupKeysSet.has(key));
                
                if (newKeys.length > 0) {
                    // 有新增分组，只展开新增的
                    setExpandedRowKeys(prevKeys => {
                        const keysToAdd = newKeys.filter(key => !prevKeys.includes(key));
                        if (keysToAdd.length > 0) {
                            return [...prevKeys, ...keysToAdd];
                        }
                        return prevKeys;
                    });
                } else {
                    // 没有新增分组，但可能有分组被删除
                    // 清理已删除的分组（从 expandedRowKeys 中移除）
                    setExpandedRowKeys(prevKeys => {
                        const validKeys = prevKeys.filter(key => allGroupKeys.includes(key));
                        // 只有当有分组被删除时才更新
                        if (validKeys.length !== prevKeys.length) {
                            return validKeys;
                        }
                        return prevKeys;
                    });
                }
                // 更新记录的分组 key
                prevGroupKeysRef.current = currentGroupKeysSet;
            }
        }
    }, [showGrouping, allGroupKeys]);

    // 当展开状态变化时，保存到本地存储
    // 保存分组展开状态变化
    useEffect(() => {
        if (isInitializedRef.current) {
            saveArrayToStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS, expandedRowKeys);
        }
    }, [expandedRowKeys]);

    // 处理分组展开/收起变化（用户手动操作）
    const handleExpandedRowsChange = useCallback((keys: unknown[]) => {
        setExpandedRowKeys(prevKeys => {
            const uniqueGroupKeys = extractGroupKeys(keys);
            // 立即保存到 localStorage（用户操作时立即保存）
            saveArrayToStorage(STORAGE_KEYS.EXPANDED_GROUP_KEYS, uniqueGroupKeys);
            return uniqueGroupKeys;
        });
    }, []);

    // 构建分组信息映射，用于渲染分组头部和排序
    const groupInfoMap = useMemo(() => {
        const map = new Map<string, { groupId: string; groupNumber: number; taskCount: number; createTime: number }>();
        
        // 统计各分组的任务数量和创建时间
        // 注意：groupKey 为 '0' 的是默认分组，不统计在分组信息中
        const groupCountMap = new Map<string, { count: number; createTime: number }>();
        
                dataSource.forEach(task => {
            // 获取任务的 groupKey，如果没有则默认为 '0'
            const taskGroupKey = task.groupKey || '0';
            // 只统计有真实 groupKey 的任务（排除默认分组的 '0'）
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
        
        // 按创建时间排序分组，分配分组编号
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

    // 分组顺序比较函数（固定分组顺序，确保排序时分组顺序不变）
    // 分组顺序规则：
    // 1. 按照提交批量部署时间排序（时间早的在前）
    // 2. 默认分组（groupKey 为 '0'）展示在最下方
    const compareGroupOrder = useCallback((a: DataItem, b: DataItem): number => {
        const groupKeyA = a.groupKey || '0';
        const groupKeyB = b.groupKey || '0';
        
        // 如果属于同一分组，返回 0（由列的 sorter 处理分组内的排序）
        if (groupKeyA === groupKeyB) {
            return 0;
        }
        
        // 规则2：默认分组（groupKey 为 '0'）排在最后
        if (groupKeyA === '0' && groupKeyB !== '0') {
            return 1;
        }
        if (groupKeyA !== '0' && groupKeyB === '0') {
            return -1;
        }
        
        // 规则1：分组按提交批量部署时间正序排序（时间早的在前）
        const groupInfoA = groupInfoMap.get(groupKeyA);
        const groupInfoB = groupInfoMap.get(groupKeyB);
        const createTimeA = groupInfoA?.createTime || 0;
        const createTimeB = groupInfoB?.createTime || 0;
        return createTimeA - createTimeB;
    }, [groupInfoMap]);

    // 构建表格数据源
    // 初始数据 groupKey 默认为 '0'，对应默认分组
    // 按照分组顺序排序：
    // 1. 分组按提交批量部署时间正序排列（时间早的在前）
    // 2. 默认分组（groupKey 为 '0' 的任务）显示在最下方
    const tableDataSource = useMemo(() => {
        const source = dataSource || [];
        
        if (!showGrouping) {
            return source;
        }
        
        // 为没有 groupKey 的任务设置默认分组 key 为 '0'
        const processedSource = source.map(task => ({
            ...task,
            // 将 groupKey 为 undefined/null 的任务设置为 '0'，作为默认分组
            groupKey: task.groupKey || '0'
        }));
        
        // 按照分组顺序排序：
        // 1. 分组按提交批量部署时间正序排列（时间早的在前）
        // 2. 默认分组（groupKey 为 '0' 的任务）显示在最下方
        // 3. 同一分组内的任务保持原顺序（分组内的排序由列的 sorter 处理）
        return processedSource.sort((a, b) => {
            return compareGroupOrder(a, b);
        });
    }, [dataSource, showGrouping, compareGroupOrder]);

    // 获取分组标签颜色（根据分组编号循环使用不同颜色）
    const getGroupTagColor = useCallback((groupNumber: number) => {
        const colors = [
            { bg: '#E6F4FF', text: '#1890FF' }, // 蓝色
            { bg: '#FFF7E6', text: '#FA8C16' }, // 橙色
            { bg: '#F6FFED', text: '#52C41A' }, // 绿色
            { bg: '#FFF1F0', text: '#F5222D' }, // 红色
            { bg: '#F9F0FF', text: '#722ED1' }, // 紫色
        ];
        return colors[(groupNumber - 1) % colors.length];
    }, []);

    // 渲染分组头部 - 参考图片样式
    // groupKey 是分组的标识符，如果为 '0' 或 0 则表示默认分组
    const renderGroupSection = useCallback((groupKey: string | number | undefined) => {
        // 默认分组：groupKey 为 '0' 或 0（未分组任务的 groupKey 默认为 '0'）
        const groupKeyStr = String(groupKey);
        if (groupKeyStr === '0' || groupKey === 0) {
            // 统计默认分组的任务数量（从当前表格数据源统计）
            const unbatchedTasks = tableDataSource.filter(task => {
                const taskGroupKey = task.groupKey || '0';
                return taskGroupKey === '0';
            });
            return (
                <span>
                    <span
                        style={{
                        display: 'inline-block',
                            backgroundColor: '#F5F5F5',
                        color: '#000000',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            marginRight: '8px',
                        fontSize: '14px',
                            lineHeight: '20px',
                        fontWeight: 400,
                        }}
                    >
                        默认分组
                    </span>
                    <span
                        style={{
                            fontSize: '12px',
                            lineHeight: '20px',
                            color: '#8C8C8C',
                        fontWeight: 400,
                        }}
                    >
                        共{unbatchedTasks.length}个
                    </span>
                </span>
            );
        }
        
        // 分组：groupKey 是分组标识符字符串
        const groupInfo = groupInfoMap.get(groupKeyStr);
        if (!groupInfo) {
            return null;
        }
        
        // 获取分组标签颜色（仅用于背景色）
        const tagColor = getGroupTagColor(groupInfo.groupNumber);
            
            return (
            <span>
                <span
                    style={{
                        display: 'inline-block',
                        backgroundColor: tagColor.bg,
                        color: '#000000',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        marginRight: '8px',
                        fontSize: '14px',
                        lineHeight: '20px',
                        fontWeight: 400,
                    }}
                >
                    分组 {groupInfo.groupNumber}
                    </span>
                <span
                    style={{
                        fontSize: '12px',
                        lineHeight: '20px',
                        color: '#8C8C8C',
                        fontWeight: 400,
                    }}
                >
                    共{groupInfo.taskCount}个
                    </span>
            </span>
        );
    }, [groupInfoMap, tableDataSource, getGroupTagColor]);

    // 处理分组行交互
    // 注意：当 clickGroupedRowToExpand 为 true 时，不返回 onClick，让 Semi Design 的默认行为处理展开/收起
    const onGroupedRow = useCallback((group: any, index: number) => {
        return {};
    }, []);

    // 批量操作逻辑已移至Hook中处理

    // 重新分配选中任务的部署顺序，确保顺序唯一且连续
    const reorderSelectedTasks = useCallback((tasks: DataItem[], selectedKeys: string[]) => {
        // 找出所有已选中且为待部署状态的任务
        const selectedPendingTasks = tasks
            .filter(task => 
                selectedKeys.includes(task.key) && 
                task.taskStatus === DeploymentStatus.PENDING
            )
            .sort((a, b) => {
                // 先按当前部署顺序排序（undefined排在最后）
                const orderA = a.deployOrder ?? 999999;
                const orderB = b.deployOrder ?? 999999;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                // 如果顺序相同或都是undefined，保持原有顺序
                return tasks.indexOf(a) - tasks.indexOf(b);
            });
        
        // 重新分配顺序：1, 2, 3, ...
        // 只对待部署状态的任务分配部署顺序
        // 非待部署状态的任务的部署顺序保持不变（已提交部署的任务顺序锁定）
        return tasks.map(item => {
            if (selectedPendingTasks.some(task => task.key === item.key)) {
                // 选中的待部署任务，分配顺序
                const index = selectedPendingTasks.findIndex(task => task.key === item.key);
                return { ...item, deployOrder: index + 1 };
            } else if (item.taskStatus === DeploymentStatus.PENDING) {
                // 未选中的待部署任务，清除部署顺序
                return { ...item, deployOrder: undefined };
            } else {
                // 非待部署状态的任务，保持部署顺序不变（已提交部署的任务顺序锁定）
                return item;
            }
        });
    }, []);

    // 处理部署顺序变更
    const handleDeployOrderChange = useCallback((key: string, value: string) => {
        // 检查当前任务是否为待部署状态
        const currentTask = dataSource.find(task => task.key === key);
        if (!currentTask || currentTask.taskStatus !== DeploymentStatus.PENDING) {
            Toast.warning('只有待部署状态的任务才能设置部署顺序');
            return;
        }
        
        // 如果输入为空，清除部署顺序
        if (value.trim() === '') {
            setData(prev => {
                const updatedTasks = prev.map(item => 
                    item.key === key ? { ...item, deployOrder: undefined } : item
                );
                // 重新分配其他选中任务的顺序
                return reorderSelectedTasks(updatedTasks, selectedRowKeys);
            });
            return;
        }
        
        const newOrder = parseInt(value, 10);
        
        if (isNaN(newOrder) || newOrder < 1) {
            Toast.warning('部署顺序必须是大于0的整数');
            return;
        }
        
        setData(prev => {
            // 检查新顺序是否已被其他任务占用
            const existingTask = prev.find(task => 
                task.key !== key && 
                task.deployOrder === newOrder &&
                selectedRowKeys.includes(task.key) &&
                task.taskStatus === DeploymentStatus.PENDING
            );
            
            // 如果顺序已被占用，交换顺序
            if (existingTask) {
                const currentOldOrder = currentTask.deployOrder;
                const swappedTasks = prev.map(item => {
                    if (item.key === key) {
                        return { ...item, deployOrder: newOrder };
                    } else if (item.key === existingTask.key) {
                        return { ...item, deployOrder: currentOldOrder };
                    }
                    return item;
                });
                // 确保所有选中任务的顺序是连续的且唯一的（1、2、3...）
                return reorderSelectedTasks(swappedTasks, selectedRowKeys);
            }
            
            // 更新当前任务的顺序
            const updatedTasks = prev.map(item => 
                item.key === key ? { ...item, deployOrder: newOrder } : item
            );
            
            // 确保所有选中任务的顺序是连续的且唯一的（1、2、3...）
            return reorderSelectedTasks(updatedTasks, selectedRowKeys);
        });
    }, [dataSource, selectedRowKeys, reorderSelectedTasks]);

    // 应用搜索处理
    const handleAppSearch = (query: string, index: number) => {
        const results = query.trim() 
            ? MOCK_APPS.filter(app => app.name.toLowerCase().includes(query.toLowerCase()))
            : MOCK_APPS;
        
        setAppSearchState({
            visible: { ...appSearchState.visible, [index]: true },
            results
        });
    };

    // 选择应用
    const handleAppSelect = (app: AppInfo, index: number) => {
        setAppFormItems(prev => prev.map((item, i) => 
            i === index ? { 
                ...item, 
                appName: app.name,
                artifactRepo: app.artifactRepo,
                artifactVersion: app.latestVersion
            } : item
        ));
        
        setAppSearchState({ visible: {}, results: [] });
    };

    // 关闭搜索下拉框
    const closeAppSearch = (index?: number) => {
        if (index !== undefined) {
            setAppSearchState(prev => ({
                ...prev,
                visible: { ...prev.visible, [index]: false }
            }));
        } else {
            setAppSearchState({ visible: {}, results: [] });
        }
    };

    // 表格列配置
    // 注意：排序只作用于数据行，分组顺序保持不变
    const columns = useMemo(() => [
            {
              title: '应用名称',
              dataIndex: 'appName',
            width: 200,
            fixed: 'left' as const,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按应用名称排序
                return (a.appName.length - b.appName.length > 0 ? 1 : -1);
            },
            },
            {
              title: '部署状态',
            dataIndex: 'taskStatus',
            width: 120,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按部署状态排序
                const orderA = STATUS_CONFIG[a.taskStatus]?.order || 999;
                const orderB = STATUS_CONFIG[b.taskStatus]?.order || 999;
                return orderA - orderB;
            },
            render: (text, record) => (
                <StatusTag 
                    status={text as DeploymentStatus}
                    errorMessage={record.errorMessage}
                    errorTime={record.errorTime}
                    isDarkMode={isDarkMode}
                />
            )
            },
            {
              title: '版本号',
            dataIndex: 'version',
            width: 120,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按版本号排序
                return a.version.localeCompare(b.version);
            },
            },
            {
              title: '发布集群',
              dataIndex: 'cluster',
            width: 280,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按发布集群排序
                return a.cluster.localeCompare(b.cluster);
            },
            },
            {
              title: '命名空间',
              dataIndex: 'namespace',
            width: 120,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按命名空间排序
                return a.namespace.localeCompare(b.namespace);
            },
            },
            {
              title: '环境标签',
              dataIndex: 'envTag',
            width: 120,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按环境标签排序
                return a.envTag.localeCompare(b.envTag);
            },
            render: (text) => <Tag color="blue" className="semi-tag-blue">{text}</Tag>,
        },
        {
            title: '部署顺序',
            dataIndex: 'deployOrder',
            width: 120,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按部署顺序排序
                // 处理undefined值，undefined排在最后
                const orderA = a.deployOrder || 999999;
                const orderB = b.deployOrder || 999999;
                return orderA - orderB;
            },
            render: (text, record) => {
                // 如果任务有部署顺序
                if (record.deployOrder !== undefined && record.deployOrder !== null) {
                    // 只有在选中状态且为待部署状态时才显示可编辑的输入框
                if (selectedRowKeys.includes(record.key) && record.taskStatus === DeploymentStatus.PENDING) {
                    return (
                        <Input
                            size="small"
                            value={record.deployOrder || ''}
                            placeholder="顺序"
                            onChange={(value) => handleDeployOrderChange(record.key, value)}
                            style={{ 
                                width: '80px',
                                textAlign: 'center',
                                textAlignLast: 'center',
                                height: '28px',
                                lineHeight: '28px',
                                margin: 0,
                                padding: 0
                            }}
                            inputStyle={{
                                textAlign: 'center',
                                textAlignLast: 'center',
                                height: '28px',
                                lineHeight: '28px',
                                padding: '0 8px',
                                margin: 0,
                                border: 'none',
                                boxShadow: 'none'
                            }}
                        />
                    );
                }
                    // 有部署顺序但不是待部署状态或未被选中，显示只读数字（提交部署后锁定）
                    return <span style={{ 
                        color: record.taskStatus === DeploymentStatus.PENDING ? '#333' : '#666', 
                        textAlign: 'center', 
                        display: 'block',
                        height: '28px',
                        lineHeight: '28px',
                        margin: 0,
                        padding: 0,
                        fontWeight: record.taskStatus !== DeploymentStatus.PENDING ? 500 : 400
                    }}>{record.deployOrder}</span>;
                }
                // 没有部署顺序，显示 "-"
                return <span style={{ 
                    color: '#999', 
                    textAlign: 'center', 
                    display: 'block',
                    height: '28px',
                    lineHeight: '28px',
                    margin: 0,
                    padding: 0
                }}>-</span>;
            }
        },
            {
            title: 'Pod状态',
            dataIndex: 'podStatus',
            width: 120,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按Pod状态排序
                const orderA = POD_STATUS_CONFIG[a.podStatus]?.order || 999;
                const orderB = POD_STATUS_CONFIG[b.podStatus]?.order || 999;
                return orderA - orderB;
            },
            render: (text) => {
                const config = POD_STATUS_CONFIG[text];
                return config ? config.text : text;
            }
            },
            {
              title: '部署时间',
              dataIndex: 'deployTime',
            width: 150,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按部署时间排序
                return (a.deployTime - b.deployTime > 0 ? 1 : -1);
            },
            render: value => dateFns.format(new Date(value), 'yyyy-MM-dd HH:mm'),
            },
            {
              title: '部署人',
            dataIndex: 'deployer',
            width: 120,
            sorter: (a, b) => {
                // 先比较分组顺序，如果分组不同，返回分组顺序（固定分组顺序）
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                // 同一分组内按部署人排序
                return a.deployer.localeCompare(b.deployer);
            },
            render: (text, record) => (
                <div>
                    <Avatar size="small" color={record.avatarBg} style={{ marginRight: 4 }}>
                        {typeof text === 'string' && text.slice(0, 1)}
                    </Avatar>
                    {text}
                </div>
            ),
            },
            {
              title: '操作',
            dataIndex: 'operation',
            width: 140,  // 从 200px 改为 140px
            fixed: 'right' as const,
            render: (text, record) => (
                <OperationButtons
                    task={record}
                    onOperation={handleOperation}
                    getButtonConfig={getButtonConfig}
                />
            ),
        },
    ], [selectedRowKeys, handleDeployOrderChange, handleOperation, getButtonConfig, compareGroupOrder]);

    const rowSelection = useMemo(
        () => ({
            fixed: true,
            selectedRowKeys,
            onChange: (newSelectedRowKeys: string[], selectedRows: DataItem[]) => {
                setSelectedRowKeys(newSelectedRowKeys);
                // 当选择任务时，按照勾选顺序分配唯一的部署顺序（只对待部署状态的任务）
                setData(prev => {
                    if (newSelectedRowKeys.length > 0) {
                        // 重新分配选中任务的顺序，确保顺序唯一且连续
                        // reorderSelectedTasks 内部已经过滤，只处理待部署状态的任务
                        // 已提交部署的任务的部署顺序保持不变（锁定）
                        return reorderSelectedTasks(prev, newSelectedRowKeys);
                    } else {
                        // 没有选中任务时，只清除待部署状态任务的部署顺序
                        // 已提交部署的任务的部署顺序保持不变（锁定）
                        return prev.map(item => {
                            // 只有待部署状态的任务才需要清除部署顺序
                            // 已提交部署的任务的部署顺序保持锁定，不会被清除
                            if (item.taskStatus === DeploymentStatus.PENDING) {
                                return { ...item, deployOrder: undefined };
                            }
                            // 非待部署状态的任务保持原样（包括部署顺序）
                            return item;
                        });
                    }
                });
            },
            getCheckboxProps: (record: DataItem) => {
                // 分组行不允许选择
                // 在 Semi Design groupBy 模式下，分组行对象通常没有普通数据字段（如 appName）
                // 数据行都有 appName 字段，分组行没有
                const isGroupRow = !('appName' in record) || !record.appName;
                // 允许选择的任务状态：
                // 1. 待部署状态（用于批量部署、申请加白）
                // 2. 部署完成状态（用于批量验证通过）
                // 不允许选择的状态：审批中、部署中、回滚中（这些状态的任务正在进行中，不允许操作）
                const isSelectable = record.taskStatus === DeploymentStatus.PENDING || 
                                     record.taskStatus === DeploymentStatus.DEPLOYED;
                // 明确禁用审批中、部署中、回滚中状态
                const isProcessing = record.taskStatus === DeploymentStatus.APPROVING ||
                                     record.taskStatus === DeploymentStatus.DEPLOYING ||
                                     record.taskStatus === DeploymentStatus.ROLLING_BACK;
                return {
                    disabled: isGroupRow || !isSelectable || isProcessing,
                };
            },
        }),
        [selectedRowKeys, reorderSelectedTasks]
    );

    const pagination = false;

    // 公共样式
    const inputStyles = {
        backgroundColor: isDarkMode ? 'var(--semi-color-bg-0)' : '#ffffff',
        color: isDarkMode ? 'var(--semi-color-text-0)' : '#262626',
        border: isDarkMode ? '1px solid var(--semi-color-border)' : '1px solid #d9d9d9'
    };

    const disabledInputStyles = {
        backgroundColor: isDarkMode ? 'var(--semi-color-bg-0)' : '#ffffff',
        color: isDarkMode ? 'var(--semi-color-text-0)' : '#262626',
        border: isDarkMode ? '1px solid var(--semi-color-border)' : '1px solid #d9d9d9'
    };

    const dropdownStyles = {
        backgroundColor: isDarkMode ? 'var(--semi-color-bg-0)' : '#fff',
        border: `1px solid ${isDarkMode ? 'var(--semi-color-border)' : '#d9d9d9'}`,
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        maxHeight: '200px',
        overflowY: 'auto' as const
    };

    const dropdownItemStyles = {
        padding: '8px 12px',
        cursor: 'pointer',
        backgroundColor: isDarkMode ? 'var(--semi-color-bg-0)' : '#fff'
    };

    const textStyles = {
        primary: isDarkMode ? 'var(--semi-color-text-0)' : '#262626',
        secondary: isDarkMode ? 'var(--semi-color-text-2)' : '#8c8c8c'
    };

    // 保存任务数据到本地存储（操作后的真实数据）
    const saveTasks = useCallback((tasks: DataItem[]): void => {
        saveToStorage(STORAGE_KEYS.TASKS_DATA, tasks);
    }, []);

    // 初始化数据加载：
    // 1. 优先从 localStorage 加载操作后的真实数据（如果有）
    // 2. 如果没有，则使用 mock 数据作为初始数据
    // 3. 为部署失败的任务补充错误信息（兼容旧数据）
    useEffect(() => {
        const storedTasks = loadFromStorage<DataItem[]>(STORAGE_KEYS.TASKS_DATA);
        if (storedTasks && Array.isArray(storedTasks) && storedTasks.length > 0) {
            // 检查并补充错误信息：为部署失败但没有错误信息的任务添加 mock 错误信息
            const tasksWithErrors = storedTasks.map((task, index) => {
                if (
                    task.taskStatus === DeploymentStatus.DEPLOYMENT_FAILED &&
                    (!task.errorMessage || !task.errorTime)
                ) {
                    // 生成默认错误信息
                    const errorMessages = [
                        `镜像拉取失败：Failed to pull image "registry.company.com/${task.appName}:${task.version}"\n错误详情：Error response from daemon: Get https://registry.company.com/v2/: net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)\n建议操作：\n1. 检查镜像仓库连接是否正常\n2. 确认镜像标签是否存在\n3. 检查网络连接或代理配置`,
                        `Pod 启动失败：Failed to start container "${task.appName}"\n错误详情：Error: ImagePullBackOff - Back-off pulling image "registry.company.com/${task.appName}:${task.version}"\nPod状态：CrashLoopBackOff\n建议操作：\n1. 检查镜像是否存在或标签是否正确\n2. 查看 Pod 日志排查启动问题\n3. 检查资源配置是否充足`,
                        `资源分配失败：Insufficient resources in cluster "${task.cluster}"\n错误详情：0/4 nodes are available: 4 Insufficient cpu, 4 Insufficient memory\n节点资源：CPU 0.5/2.0, Memory 1Gi/4Gi\n建议操作：\n1. 检查集群资源使用情况\n2. 尝试在其他命名空间部署\n3. 联系运维扩容节点资源`,
                        `健康检查失败：Readiness probe failed for container "${task.appName}"\n错误详情：Get http://localhost:8080/health: dial tcp 127.0.0.1:8080: connect: connection refused\n检查时间：已连续失败 3 次，间隔 10 秒\n建议操作：\n1. 检查应用健康检查端点是否正常\n2. 查看容器日志排查应用启动问题\n3. 调整健康检查配置或超时时间`,
                        `网络配置错误：Service endpoint creation failed\n错误详情：Failed to create service endpoint: network policy violation - pod label mismatch\n命名空间：${task.namespace}\n建议操作：\n1. 检查 Pod 标签是否匹配 Service 选择器\n2. 验证网络策略配置是否正确\n3. 确认命名空间的网络隔离策略`
                    ];
                    const errorIndex = index % errorMessages.length;
                    return {
                        ...task,
                        errorMessage: errorMessages[errorIndex],
                        errorTime: task.errorTime || task.deployTime || Date.now()
                    };
                }
                return task;
            });
            setData(tasksWithErrors);
        } else {
            setData(generateMockTasks());
        }
    }, []);
    
    // 监听任务数据变化，保存操作后的真实数据（包括部署顺序）
    // 注意：任务状态从待部署变为其他状态时，部署顺序会在 useDeploymentStatus Hook 中自动清除
    const isFirstDataLoad = useRef(true);
    useEffect(() => {
        if (isFirstDataLoad.current) {
            isFirstDataLoad.current = false;
            return;
        }
        if (dataSource && dataSource.length > 0) {
            // 保存操作后的真实数据（包括部署顺序）
            saveTasks(dataSource);
        }
    }, [dataSource, saveTasks]);


    return (
        <div 
            id="app"
            style={{ 
                padding: '0 24px 24px 24px',
                backgroundColor: isDarkMode ? 'var(--semi-color-bg-0)' : '#ffffff',
                color: isDarkMode ? 'var(--semi-color-text-0)' : '#262626',
                minHeight: '100vh',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }}
        >
            {/* 字体样式覆盖 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    * {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
                    }
                    .semi-table th {
                        font-weight: 500 !important;
                        color: ${isDarkMode ? 'var(--semi-color-text-0)' : '#262626'} !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        background-color: #F5F7FA !important;
                        border-right: 1px solid #E5E6EB !important;
                        border-bottom: 1px solid #E5E6EB !important;
                    }
                    .semi-table th .semi-table-column-title {
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        display: block !important;
                        max-width: 100% !important;
                    }
                    .semi-table td {
                        font-weight: 400 !important;
                        color: ${isDarkMode ? 'var(--semi-color-text-0)' : '#262626'} !important;
                        background-color: ${isDarkMode ? '#2a2a2a' : '#FFFFFF'} !important;
                        border-right: 1px solid ${isDarkMode ? '#4a4a4a' : '#E5E6EB'} !important;
                        border-bottom: 1px solid ${isDarkMode ? '#4a4a4a' : '#E5E6EB'} !important;
                    }
                    
                    /* 分组行样式 */
                    .semi-table .semi-table-tbody tr.semi-table-row-section,
                    .semi-table .semi-table-tbody tr.semi-table-grouped-row {
                        background-color: ${isDarkMode ? '#2a2a2a' : '#F7F8FA'} !important;
                    }
                    
                    .semi-table .semi-table-tbody tr.semi-table-row-section td,
                    .semi-table .semi-table-tbody tr.semi-table-grouped-row td {
                        background-color: ${isDarkMode ? '#2a2a2a' : '#F7F8FA'} !important;
                        border-right: 1px solid ${isDarkMode ? '#4a4a4a' : '#E5E6EB'} !important;
                        border-bottom: 1px solid ${isDarkMode ? '#4a4a4a' : '#E5E6EB'} !important;
                    }
                    .semi-dropdown-menu .semi-dropdown-item {
                        font-size: 14px !important;
                    }
                    ${isDarkMode ? `
                        /* 暗色模式主容器样式 */
                        #app {
                            background-color: #2f3037 !important;
                        }
                        /* 暗色模式表格样式 */
                        .semi-table-container {
                            background: #2a2a2a !important;
                        }
                        .semi-table-container .semi-table {
                            background: #2a2a2a !important;
                        }
                        .semi-table-container .semi-table .semi-table-thead th {
                            background-color: #2a2a2a !important;
                            color: #ffffff !important;
                            border-color: #4a4a4a !important;
                        }
                        .semi-table-container .semi-table .semi-table-tbody td {
                            background-color: #2a2a2a !important;
                            color: #ffffff !important;
                            border-color: #4a4a4a !important;
                        }
                        .semi-table-container .semi-table .semi-table-tbody tr:hover td {
                            background-color: #3a3a3a !important;
                        }
                        .semi-table-container .semi-table .semi-table-tbody tr.semi-table-row-selected td {
                            background-color: #1a3a5a !important;
                        }
                        /* 暗色模式滚动条样式 */
                        ::-webkit-scrollbar {
                            width: 8px !important;
                            height: 8px !important;
                        }
                        ::-webkit-scrollbar-track {
                            background: #3a3a3a !important;
                            border-radius: 4px !important;
                        }
                        ::-webkit-scrollbar-thumb {
                            background: #666666 !important;
                            border-radius: 4px !important;
                        }
                        ::-webkit-scrollbar-thumb:hover {
                            background: #888888 !important;
                        }
                        /* 表格滚动条样式 */
                        .semi-table-container::-webkit-scrollbar {
                            width: 8px !important;
                            height: 8px !important;
                        }
                        .semi-table-container::-webkit-scrollbar-track {
                            background: #3a3a3a !important;
                            border-radius: 4px !important;
                        }
                        .semi-table-container::-webkit-scrollbar-thumb {
                            background: #666666 !important;
                            border-radius: 4px !important;
                        }
                        .semi-table-container::-webkit-scrollbar-thumb:hover {
                            background: #888888 !important;
                        }
                    ` : ''}
                `
            }} />
            {/* 标题和操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        width: '4px',
                        height: '20px',
                        backgroundColor: '#3250eb',
                        borderRadius: '2px',
                        marginRight: '12px'
                    }}></div>
                    <h1 style={{ 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: isDarkMode ? 'var(--semi-color-text-0)' : '#262626', 
                        margin: 0
                    }}>
                        部署任务
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* 批量部署按钮：默认禁用，只有选中符合条件的待部署任务时才启用 */}
                        <Button
                            type="primary"
                            disabled={!canPerformBatchOperation(dataSource, OperationType.DEPLOY)}
                            onClick={() => handleBatchAction('deploy')}
                        >
                            批量部署
                        </Button>
                        {/* 批量操作下拉菜单：默认禁用，只有选中符合条件的任务时才启用 */}
                        <Dropdown
                            trigger="click"
                            visible={batchDropdownVisible}
                            onVisibleChange={setBatchDropdownVisible}
                            content={
                                <Dropdown.Menu>
                                    {[
                                        { key: 'whitelist', text: '申请加白', operation: OperationType.WHITELIST },
                                        { key: 'verify_pass', text: '验证通过', operation: OperationType.VERIFY_PASS }
                                    ].map(item => {
                                        const isEnabled = canPerformBatchOperation(dataSource, item.operation);
                                        return (
                                            <Dropdown.Item 
                                                key={item.key}
                                                onClick={() => {
                                                    if (isEnabled) {
                                                        handleBatchAction(item.key);
                                                    }
                                                }}
                                                style={{
                                                    opacity: isEnabled ? 1 : 0.5,
                                                    cursor: isEnabled ? 'pointer' : 'not-allowed',
                                                    pointerEvents: isEnabled ? 'auto' : 'none'
                                                }}
                                            >
                                                {item.text}
                                            </Dropdown.Item>
                                        );
                                    })}
                                </Dropdown.Menu>
                            }
                        >
                            <Button 
                                type="primary"
                                disabled={
                                    !canPerformBatchOperation(dataSource, OperationType.WHITELIST) &&
                                    !canPerformBatchOperation(dataSource, OperationType.VERIFY_PASS)
                                }
                            >
                                ···
                            </Button>
                        </Dropdown>
                        {selectedRowKeys.length > 0 && (
                            <span style={{ 
                                fontSize: '12px', 
                                color: '#666',
                                whiteSpace: 'nowrap'
                            }}>
                                已选择 {selectedRowKeys.length} 个任务
                            </span>
                        )}
                    </div>
                    <Button
                        type="primary" 
                        icon={<IconPlus />} 
                        onClick={handleAddApp}
                    >
                        新增应用
                    </Button>
                </div>
            </div>

            {/* 部署顺序编排说明 */}
            <div style={{ 
                marginBottom: '12px', 
                padding: '16px 20px', 
                backgroundColor: isDarkMode ? 'var(--semi-color-bg-1)' : '#f7f8fa', 
                border: `1px solid ${isDarkMode ? 'var(--semi-color-border)' : '#e8e8e8'}`, 
                borderRadius: '6px',
                fontSize: '14px',
                color: isDarkMode ? 'var(--semi-color-text-0)' : '#333'
            }}>
                <div style={{ color: isDarkMode ? 'var(--semi-color-text-1)' : '#666', lineHeight: '1.6' }}>
                    • 勾选待部署状态的任务，系统将自动分配唯一的部署顺序（1、2、3...）
                    <br />
                    • 可通过"部署顺序"列手动修改任务执行顺序，系统会自动调整其他任务的顺序，确保顺序唯一且连续
                    <br />
                    • 使用批量操作功能可对选中的任务按顺序进行统一部署
                </div>
            </div>

            {/* 表格 */}
            <div className="semi-table-container" style={{ marginBottom: '24px' }}>
                <div style={{ 
                    border: '1px solid #e8e8e8', 
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                <Table 
                    columns={columns} 
                    dataSource={tableDataSource} 
                    rowSelection={rowSelection} 
                    pagination={pagination}
                    scroll={useMemo(() => ({ x: 1500 }), [])}
                    bordered={false}
                    size="small"
                    rowKey="key"
                    {...(showGrouping ? {
                        groupBy: "groupKey",
                        renderGroupSection: renderGroupSection,
                        onGroupedRow: onGroupedRow,
                        clickGroupedRowToExpand: true,
                        expandedRowKeys: expandedRowKeys,
                        onExpandedRowsChange: handleExpandedRowsChange,
                    } : {})}
                    />
                </div>
      </div>
            
            {/* 删除确认弹窗已移除，删除操作直接通过操作按钮处理 */}

      {/* 新增应用弹窗 */}
      <Modal
        title="新增应用"
                visible={addAppModalVisible}
                onOk={confirmAddApps}
                onCancel={() => setAddAppModalVisible(false)}
        okText="确认"
        cancelText="取消"
        width={800}
        onMaskClick={() => closeAppSearch()}
      >
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr 80px',
                        gap: '12px',
                        marginBottom: '12px',
                        fontWeight: '500',
                        color: textStyles.primary
                    }}>
                        <div>应用名称 *</div>
                        <div>制品仓库 *</div>
                        <div>制品版本 *</div>
                        <div>操作</div>
            </div>
                    
                    {appFormItems.map((item, index) => (
                        <div key={item.key} style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr 80px',
                            gap: '12px',
                            marginBottom: '12px',
                            alignItems: 'center'
                        }}>
                            <div style={{ position: 'relative' }}>
                                <Input
                                    placeholder="请输入应用名称"
                                    value={item.appName}
                                    onChange={(value) => {
                                        updateAppFormItem(index, 'appName', value);
                                        handleAppSearch(value, index);
                                    }}
                                    onBlur={() => setTimeout(() => closeAppSearch(index), 200)}
                                    onClick={() => handleAppSearch(item.appName, index)}
                                    style={inputStyles}
                                />
                                {appSearchState.visible[index] && appSearchState.results.length > 0 && (
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            ...dropdownStyles
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {appSearchState.results.map((app, appIndex) => (
                                            <div
                                                key={appIndex}
                                                style={{
                                                    ...dropdownItemStyles,
                                                    borderBottom: appIndex < appSearchState.results.length - 1 ? `1px solid ${isDarkMode ? 'var(--semi-color-border)' : '#f0f0f0'}` : 'none'
                                                }}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleAppSelect(app, index);
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = isDarkMode ? 'var(--semi-color-bg-1)' : '#f5f5f5';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = isDarkMode ? 'var(--semi-color-bg-0)' : '#fff';
                                                }}
                                            >
                                                <div style={{ 
                                                    fontWeight: 500, 
                                                    color: textStyles.primary, 
                                                    fontSize: '13px' 
                                                }}>
                                                    {app.name}
                                                </div>
                                                <div style={{ 
                                                    fontSize: '11px', 
                                                    color: textStyles.secondary, 
                                                    marginTop: '2px' 
                                                }}>
                                                    最新版本: {app.latestVersion}
                                                </div>
                                            </div>
                                        ))}
                                        {appSearchState.results.length === 0 && (
                                            <div style={{
                                                padding: '12px',
                                                textAlign: 'center',
                                                color: textStyles.secondary,
                                                fontSize: '12px'
                                            }}>
                                                没有找到匹配的应用
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Input
                                placeholder="制品仓库"
                                value={item.artifactRepo}
                                onChange={(value) => updateAppFormItem(index, 'artifactRepo', value)}
                                disabled={true}
                                style={disabledInputStyles}
                            />
                            <Input
                                placeholder="制品版本"
                                value={item.artifactVersion}
                                onChange={(value) => updateAppFormItem(index, 'artifactVersion', value)}
                                style={inputStyles}
                            />
                  <Space>
                      <Button
                        size="small"
                                    type="tertiary"
                                    icon={<IconCopy />}
                                    onClick={() => copyAppRow(index)}
                      />
                      <Button
                        size="small"
                                    type="tertiary"
                                    icon={<IconDelete />}
                                    onClick={() => deleteAppRow(index)}
                                    disabled={appFormItems.length === 1}
                      />
                  </Space>
                </div>
                    ))}
                    
        <Button
                        type="primary"
                        icon={<IconPlus />}
                        onClick={addAppRow}
        >
          添加一组应用
        </Button>
                </div>
      </Modal>

      {/* 批量操作确认弹窗 */}
      <Modal
        title={`批量${batchConfirmOperation ? getOperationTypeName(batchConfirmOperation) : ''}确认`}
        visible={batchConfirmVisible}
        onOk={confirmBatchOperation}
        onCancel={() => setBatchConfirmVisible(false)}
        okText="确认"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
            您选择了 {selectedRowKeys.length} 个任务，系统将执行批量{batchConfirmOperation ? getOperationTypeName(batchConfirmOperation) : ''}操作。
          </p>
          
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fafafa', 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <strong>操作说明：</strong><br/>
            {batchConfirmOperation === OperationType.DEPLOY && <>• 只有"待部署"状态的任务可以批量部署</>}
            {batchConfirmOperation === OperationType.WHITELIST && <>• 只有"待部署"状态的任务可以申请加白</>}
            {batchConfirmOperation === OperationType.VERIFY_PASS && <>• 只有"部署完成"状态的任务可以验证通过</>}
            {batchConfirmOperation === OperationType.ROLLBACK && <>• 只有"部署失败"状态的任务可以回滚</>}
            {batchConfirmOperation === OperationType.OPS_INTERVENTION && <>• 只有"部署失败"或"回滚中"状态的任务可以运维介入</>}
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title="删除确认"
        visible={deleteConfirmVisible}
        onOk={confirmDelete}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setDeleteConfirmTask(null);
        }}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ type: 'danger' }}
        width={400}
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
            确定要删除任务 <strong>{deleteConfirmTask?.appName}</strong> 吗？
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
            此操作不可恢复，请谨慎操作。
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default App;