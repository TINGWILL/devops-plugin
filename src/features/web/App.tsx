import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Table, Avatar, Tag, Button, Modal, Toast, Input, Space, Dropdown } from '@douyinfe/semi-ui';
import { IconPlus, IconCopy, IconDelete } from '@douyinfe/semi-icons';
import * as dateFns from 'date-fns';
import { useDeploymentStatus, DeploymentTask } from '../../hooks/useDeploymentStatus';
import { useBatchOperations } from '../../hooks/useBatchOperations';
import { OperationButtons } from '../../components/OperationButtons';
import { StatusTag } from '../../components/StatusTag';
import { DeploymentStatus, OperationType } from '../../constants/deploymentStatus';
import { 
    generateGroupKey
} from '../../utils/batchUtils';

const DAY = 24 * 60 * 60 * 1000;

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

// 使用新的状态配置
import { STATUS_CONFIG } from '../../constants/deploymentStatus';

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
        handleOperation,
        getButtonConfig
    } = useDeploymentStatus([]);
    
    const {
        selectedKeys: selectedRowKeys,
        setSelectedKeys: setSelectedRowKeys,
        handleBatchOperation
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
    
    // 飞书项目系统主题跟随
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    // 本地存储Key常量
    const EXPANDED_GROUP_KEYS_STORAGE_KEY = 'devops_expanded_group_keys';
    
    // 从本地存储加载分组展开状态
    const loadExpandedGroupKeys = (): string[] => {
        try {
            const stored = localStorage.getItem(EXPANDED_GROUP_KEYS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.every(key => typeof key === 'string')) {
                    return parsed;
                }
            }
        } catch (error) {
            // 读取本地存储失败，返回空数组
        }
        return [];
    };

    // 保存分组展开状态到本地存储
    const saveExpandedGroupKeys = (keys: string[]): void => {
        try {
            localStorage.setItem(EXPANDED_GROUP_KEYS_STORAGE_KEY, JSON.stringify(keys));
        } catch (error) {
            // 保存到本地存储失败，忽略错误
        }
    };

    // 分组展开状态（存储所有展开的分组 groupKey）
    // 优先从本地存储恢复，如果没有则使用空数组
    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>(() => loadExpandedGroupKeys());
    // 标记是否已初始化展开状态（刷新页面时初始化一次）
    const isInitializedRef = useRef(false);
    // 记录上一次的所有分组 key，用于检测新增分组
    const prevGroupKeysRef = useRef<Set<string>>(new Set());
    // 记录初始化时的分组 key 集合（从 localStorage 恢复时的分组状态）
    const initialGroupKeysRef = useRef<Set<string>>(new Set());
    
    useEffect(() => {
        // 检测飞书项目系统主题
        const detectFeishuTheme = () => {
            const body = document.body;
            const html = document.documentElement;
            
            // 检查页面元素主题标识
            const hasDarkClass = body.classList.contains('dark') || html.classList.contains('dark');
            const hasDarkAttr = body.getAttribute('data-theme') === 'dark' || 
                               html.getAttribute('data-theme') === 'dark' ||
                               body.getAttribute('theme-mode') === 'dark' ||
                               html.getAttribute('theme-mode') === 'dark';
            
            if (hasDarkClass || hasDarkAttr) return true;
            
            // 检查背景色
            const bgColor = window.getComputedStyle(body).backgroundColor;
            if (bgColor && (bgColor.includes('rgb(31, 31, 31)') || bgColor.includes('#1f1f1f'))) {
                return true;
            }
            
            // 检查localStorage
            try {
                const storedTheme = localStorage.getItem('theme') || 
                                  localStorage.getItem('theme-mode') ||
                                  localStorage.getItem('feishu-theme');
                if (storedTheme === 'dark') return true;
            } catch (e) {
                // 忽略localStorage访问错误
            }
            
            return false;
        };

        // 设置主题
        const setTheme = (dark: boolean) => {
            setIsDarkMode(dark);
            const body = document.body;
            const appContainer = document.getElementById('app');
            
            if (dark) {
                body.setAttribute('theme-mode', 'dark');
                appContainer?.setAttribute('theme-mode', 'dark');
            } else {
                body.removeAttribute('theme-mode');
                appContainer?.removeAttribute('theme-mode');
            }
        };

        // 初始化主题
        setTheme(detectFeishuTheme());

        // 定期检查主题变化
        const checkInterval = setInterval(() => {
            const shouldBeDark = detectFeishuTheme();
            const isCurrentlyDark = document.body.getAttribute('theme-mode') === 'dark';
            
            if (shouldBeDark !== isCurrentlyDark) {
                setTheme(shouldBeDark);
            }
        }, 2000);

        return () => clearInterval(checkInterval);
    }, []);

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
                Toast.success(`分组已创建，包含 ${selectedTasks.length} 个任务`);
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
                // expandedRowKeys 的初始值已经通过 useState(() => loadExpandedGroupKeys()) 从 localStorage 恢复了
                // 使用函数式更新获取当前值，避免依赖 expandedRowKeys
                setExpandedRowKeys(prevKeys => {
                    // 如果 prevKeys 已经有值（从 localStorage 恢复），则优先使用它
                    const currentKeys = prevKeys.length > 0 ? prevKeys : loadExpandedGroupKeys();
                    
                    // 记录初始化时的所有分组，用于后续判断新增分组
                    initialGroupKeysRef.current = currentGroupKeysSet;
                    
                    if (currentKeys.length > 0) {
                        // 有保存的状态（已从 localStorage 恢复）：
                        // 只过滤掉已删除的分组（移除不再存在的分组）
                        // 注意：不添加"新增分组"，因为已收起的分组不应该被自动展开
                        // 新增分组会在后续的 useEffect 中处理（当 isInitializedRef.current === true 时）
                        const validKeys = currentKeys.filter(key => allGroupKeys.includes(key));
                        
                        if (validKeys.length !== currentKeys.length) {
                            // 有分组被删除，返回过滤后的 keys
                            return validKeys;
                        } else {
                            // 没有变化，完全保持当前状态（已恢复的状态，包括收起的分组）
                            return currentKeys;
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
    useEffect(() => {
        if (isInitializedRef.current) {
            saveExpandedGroupKeys(expandedRowKeys);
        }
    }, [expandedRowKeys]);

    // 处理分组展开/收起变化（用户手动操作）
    const handleExpandedRowsChange = useCallback((keys: any[]) => {
        // 在 groupBy 模式下，onExpandedRowsChange 接收的 keys 是对象数组
        // 每个对象包含 groupKey 字段，表示分组的唯一标识符
        
        // 使用函数式更新，确保基于最新的状态
        setExpandedRowKeys(prevKeys => {
            
            // 从 keys 对象数组中提取 groupKey（分组唯一标识符）
            // 注意：keys 数组中的对象可能是：
            // 1. 分组对象：{groupKey: 'xxx'} - 这是分组的标识，优先使用（最可靠）
            // 2. 数据行对象：{key: 'rowKey', groupKey: 'xxx', ...} - 这是分组内的数据行
            //    Semi Design 在分组展开时，可能会传递分组内的数据行对象
            //    我们需要从 groupKey 中提取（因为 groupBy: "groupKey"）
            const normalizedGroupKeys: string[] = keys.map((key, index) => {
                let extractedGroupKey: string = '';
                
                if (typeof key === 'object' && key !== null) {
                    // 情况1: 优先从 groupKey 字段提取（这是分组的唯一标识符，最可靠）
                    if ('groupKey' in key && key.groupKey !== undefined && key.groupKey !== null) {
                        const groupKey = key.groupKey;
                        if (typeof groupKey === 'string' && groupKey !== '[object Object]') {
                            extractedGroupKey = groupKey;
                        } else if (typeof groupKey === 'number') {
                            extractedGroupKey = String(groupKey);
                        } else {
                            // groupKey 类型异常，跳过
                        }
                    }
                    // 情况2: 如果既没有 groupKey，但有 key 字段
                    // 这可能是默认分组的标识（groupKey = '0'），或者是数据行的 key（不可靠）
                    // 只有在确实没有 groupKey 时才使用 key
                    else if ('key' in key && key.key !== undefined && key.key !== null) {
                        // 检查对象是否有其他属性，判断是否是数据行对象
                        const hasOtherProps = Object.keys(key).length > 1;
                        if (!hasOtherProps) {
                            // 如果对象只有 key 属性，可能是分组标识对象（如 {key: '0'}）
                            extractedGroupKey = String(key.key);
                        } else {
                            // 如果对象有多个属性，很可能是数据行对象，但没有 groupKey
                            // 对于默认分组 '0'，key 可能是 '0'，这是可以接受的（groupKey = '0'）
                            const keyValue = String(key.key);
                            if (keyValue === '0') {
                                extractedGroupKey = '0';
                            } else {
                                // 数据行对象没有 groupKey，跳过
                                extractedGroupKey = '';
                            }
                        }
                    }
                    
                    if (!extractedGroupKey) {
                        // 无法从对象提取 groupKey，跳过
                    }
                } else {
                    // 如果是字符串或数字，直接作为 groupKey 使用
                    extractedGroupKey = String(key);
                }
                
                // 统一处理 '0' 的情况并返回（默认分组）
                return extractedGroupKey === '0' ? '0' : extractedGroupKey;
            }).filter(groupKey => groupKey !== ''); // 过滤掉无效的 groupKey
            
            // 去重并排序，确保数组一致性
            const uniqueGroupKeys = Array.from(new Set(normalizedGroupKeys)).sort();
            
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

    // 构建表格数据源
    // 初始数据 groupKey 默认为 '0'，对应默认分组
    // 按照分组顺序排序：先显示分组（按提交时间正序），最后显示默认分组（groupKey 为 '0' 的任务）
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
        // 1. 分组按提交时间正序排列（时间早的在前）
        // 2. 默认分组（groupKey 为 '0' 的任务）显示在最下方
        return processedSource.sort((a, b) => {
            // 获取 groupKey，默认为 '0'
            const groupKeyA = a.groupKey || '0';
            const groupKeyB = b.groupKey || '0';
            
            // 默认分组（groupKey 为 '0'）排在最后
            if (groupKeyA === '0' && groupKeyB !== '0') {
                return 1;
            }
            if (groupKeyA !== '0' && groupKeyB === '0') {
                return -1;
            }
            if (groupKeyA === '0' && groupKeyB === '0') {
                return 0; // 默认分组内部保持原顺序
            }
            
            // 分组按提交时间正序排序（时间早的在前）
            const groupInfoA = groupInfoMap.get(groupKeyA);
            const groupInfoB = groupInfoMap.get(groupKeyB);
            const createTimeA = groupInfoA?.createTime || 0;
            const createTimeB = groupInfoB?.createTime || 0;
            return createTimeA - createTimeB;
        });
    }, [dataSource, showGrouping, groupInfoMap]);
    
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
        return tasks.map(item => {
            if (selectedPendingTasks.some(task => task.key === item.key)) {
                const index = selectedPendingTasks.findIndex(task => task.key === item.key);
                return { ...item, deployOrder: index + 1 };
            } else {
                // 非选中任务或非待部署状态的任务清除部署顺序
                return { ...item, deployOrder: undefined };
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
    const columns = [
            {
              title: '应用名称',
              dataIndex: 'appName',
            width: 200,
            fixed: 'left' as const,
            filters: [
                { text: '用户服务', value: '用户服务' },
                { text: '订单服务', value: '订单服务' },
                { text: '支付服务', value: '支付服务' },
                { text: '商品服务', value: '商品服务' },
            ],
            onFilter: (value, record) => record.appName && typeof record.appName === 'string' && record.appName.includes(value),
            sorter: (a, b) => (a.appName.length - b.appName.length > 0 ? 1 : -1),
            },
            {
              title: '部署状态',
            dataIndex: 'taskStatus',
            width: 120,
            sorter: (a, b) => {
                const orderA = STATUS_CONFIG[a.taskStatus]?.order || 999;
                const orderB = STATUS_CONFIG[b.taskStatus]?.order || 999;
                return orderA - orderB;
            },
            render: (text) => <StatusTag status={text as DeploymentStatus} />
            },
            {
              title: '版本号',
            dataIndex: 'version',
            width: 120,
            sorter: (a, b) => (a.version.localeCompare(b.version)),
            },
            {
              title: '发布集群',
            dataIndex: 'cluster',
            width: 280,
            sorter: (a, b) => a.cluster.localeCompare(b.cluster),
            filters: [
                { text: 'CBG多业务森华机房k8s集群(1.15)', value: 'CBG多业务森华机房k8s集群(1.15)' },
                { text: '输入法业务酒仙桥机房k8s集群(1.15)', value: '输入法业务酒仙桥机房k8s集群(1.15)' },
                { text: '公研北京阿里云机房k8s集群(1.32.4)', value: '公研北京阿里云机房k8s集群(1.32.4)' },
                { text: '输入法北京阿里云机房k8s集群(1.32.4)', value: '输入法北京阿里云机房k8s集群(1.32.4)' },
            ],
            onFilter: (value, record) => record.cluster === value,
            },
            {
              title: '命名空间',
            dataIndex: 'namespace',
            width: 120,
            sorter: (a, b) => a.namespace.localeCompare(b.namespace),
            filters: [
                { text: 'default', value: 'default' },
                { text: 'production', value: 'production' },
                { text: 'staging', value: 'staging' },
                { text: 'development', value: 'development' },
            ],
            onFilter: (value, record) => record.namespace === value,
            },
            {
              title: '环境标签',
            dataIndex: 'envTag',
            width: 120,
            sorter: (a, b) => a.envTag.localeCompare(b.envTag),
            filters: [
                { text: 'prod', value: 'prod' },
                { text: 'test', value: 'test' },
                { text: 'dev', value: 'dev' },
                { text: 'staging', value: 'staging' },
                { text: 'gray', value: 'gray' },
            ],
            onFilter: (value, record) => record.envTag === value,
            render: (text) => <Tag color="blue" className="semi-tag-blue">{text}</Tag>,
        },
        {
            title: '部署顺序',
            dataIndex: 'deployOrder',
            width: 120,
            sorter: (a, b) => {
                // 处理undefined值，undefined排在最后
                const orderA = a.deployOrder || 999999;
                const orderB = b.deployOrder || 999999;
                return orderA - orderB;
            },
            render: (text, record) => {
                // 只有在选中状态且为待部署状态时才显示部署顺序输入框
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
            sorter: (a, b) => (a.deployTime - b.deployTime > 0 ? 1 : -1),
            render: value => dateFns.format(new Date(value), 'yyyy-MM-dd HH:mm'),
            },
            {
              title: '部署人',
            dataIndex: 'deployer',
            width: 120,
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
    ];

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
                        return reorderSelectedTasks(prev, newSelectedRowKeys);
                } else {
                    // 没有选中任务时，清除所有部署顺序
                        return prev.map(item => ({ ...item, deployOrder: undefined }));
                }
                });
            },
            getCheckboxProps: (record: DataItem) => {
                // 分组行不允许选择
                // 在 Semi Design groupBy 模式下，分组行对象通常没有普通数据字段（如 appName）
                // 数据行都有 appName 字段，分组行没有
                const isGroupRow = !('appName' in record) || !record.appName;
                return {
                    disabled: isGroupRow,
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

    // 生成测试数据
    const getData = (): DataItem[] => {
        const data: DataItem[] = [];
        const appNames = ['用户服务', '订单服务', '支付服务', '商品服务', '库存服务', '通知服务'];
        const deployStatuses = ['success', 'failed', 'pending'];
        const podStatuses = ['running', 'pending', 'failed'];
        const clusters = [
            'CBG多业务森华机房k8s集群(1.15)',
            '输入法业务酒仙桥机房k8s集群(1.15)',
            '公研北京阿里云机房k8s集群(1.32.4)',
            '输入法北京阿里云机房k8s集群(1.32.4)'
        ];
        const namespaces = ['default', 'production', 'staging', 'development'];
        const envTags = ['prod', 'test', 'dev', 'staging', 'gray'];
        const deployers = ['张三', '李四', '王五', '赵六', '钱七'];
        const taskStatuses = [
            DeploymentStatus.PENDING,
            DeploymentStatus.PENDING,
            DeploymentStatus.PENDING,
            DeploymentStatus.PENDING,
            DeploymentStatus.PENDING,
            DeploymentStatus.PENDING,
            DeploymentStatus.PENDING
        ];
        
        for (let i = 0; i < 46; i++) {
            const randomNumber = (i * 1000) % 199;
            const appIndex = i % appNames.length;
            const deployerIndex = i % deployers.length;
            const taskStatusIndex = i % taskStatuses.length;
            
            data.push({
                key: '' + i,
                appName: `${appNames[appIndex]}${i > 5 ? `-${i}` : ''}`,
                deployStatus: deployStatuses[i % deployStatuses.length],
                podStatus: podStatuses[i % podStatuses.length],
                version: `v1.${i % 10}.${randomNumber % 10}`,
                cluster: clusters[i % clusters.length],
                namespace: namespaces[i % namespaces.length],
                envTag: envTags[i % envTags.length],
                deployTime: new Date().valueOf() - randomNumber * DAY,
                deployer: deployers[deployerIndex],
                avatarBg: ['grey', 'red', 'blue', 'green', 'orange'][i % 5],
                taskStatus: taskStatuses[taskStatusIndex],
                deployOrder: undefined, // 初始时没有部署顺序
            });
        }
        
        // 按照发布集群、命名空间、环境标签进行排序
        return data.sort((a, b) => {
            // 首先按发布集群排序
            const clusterCompare = a.cluster.localeCompare(b.cluster);
            if (clusterCompare !== 0) return clusterCompare;
            
            // 然后按命名空间排序
            const namespaceCompare = a.namespace.localeCompare(b.namespace);
            if (namespaceCompare !== 0) return namespaceCompare;
            
            // 最后按环境标签排序
            return a.envTag.localeCompare(b.envTag);
        });
    };

    // 本地存储Key
    const TASKS_STORAGE_KEY = 'devops_tasks_data';
    
    // 从本地存储获取任务数据
    const loadStoredTasks = (): DataItem[] | null => {
        try {
            const stored = localStorage.getItem(TASKS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // 如果解析的数据是数组且长度大于0，才返回
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (error) {
            // 读取本地存储失败，使用默认数据
        }
        return null;
    };
    
    // 保存任务数据到本地存储
    const saveTasks = (tasks: DataItem[]): void => {
        try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        } catch (error) {
            // 保存到本地存储失败，忽略错误
        }
    };

    // 初始化数据加载：优先从本地存储恢复，否则生成新数据
    useEffect(() => {
        const loadInitialData = () => {
            try {
                const storedTasks = loadStoredTasks();
                let data: DataItem[];
                
                if (storedTasks && Array.isArray(storedTasks) && storedTasks.length > 0) {
                    data = storedTasks;
                } else {
                    data = getData();
                    // 保存新生成的数据
                    saveTasks(data);
                }
                
                if (data && Array.isArray(data) && data.length > 0) {
            setData(data);
                } else {
                    // 如果数据为空，强制生成新数据
                    const newData = getData();
                    saveTasks(newData);
                    setData(newData);
                }
        } catch (error) {
            // 数据加载失败，使用默认数据
                // 出错时强制生成新数据
                const data = getData();
                saveTasks(data);
                setData(data);
        }
        };
        
        // 立即执行
        loadInitialData();
    }, []);
    
    // 监听 dataSource 变化，自动保存到本地存储（跳过首次空数组）
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (dataSource && dataSource.length > 0) {
            saveTasks(dataSource);
        }
    }, [dataSource]);


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
                        backgroundColor: '#1e40af',
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
                    {selectedRowKeys.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button
                                type="primary"
                                onClick={() => handleBatchAction('deploy')}
                            >
                                批量部署
                            </Button>
                            <Dropdown
                                trigger="click"
                                visible={batchDropdownVisible}
                                onVisibleChange={setBatchDropdownVisible}
                                content={
                                    <Dropdown.Menu>
                                        {[
                                            { key: 'whitelist', text: '申请加白' },
                                            { key: 'verify_pass', text: '验证通过' },
                                            { key: 'rollback', text: '批量回滚' },
                                            { key: 'ops_intervention', text: '运维介入' }
                                        ].map(item => (
                                            <Dropdown.Item 
                                                key={item.key}
                                                onClick={() => handleBatchAction(item.key)}
                                            >
                                                {item.text}
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                }
                            >
                                <Button type="primary">
                                    ···
                                </Button>
                            </Dropdown>
                            <span style={{ 
                                fontSize: '12px', 
                                color: '#666',
                                whiteSpace: 'nowrap'
                            }}>
                                已选择 {selectedRowKeys.length} 个任务
                            </span>
                        </div>
                    )}
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
    </div>
  );
}

export default App;