import { useMemo, useEffect, useCallback } from 'react';
import { Table, Button, Toast } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import { DeploymentTask } from '../../types/deployment';
import { useDeploymentStore } from '../../stores/deploymentStore';
import { useDeploymentOperations } from '../../hooks/useDeploymentOperations';
import { useBatchOperations } from '../../hooks/useBatchOperations';
import { DeploymentStatus, OperationType } from '../../constants/deploymentStatus';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { loadFromStorage } from '../../utils/storageUtils';
import { useFeishuTheme } from '../../hooks/useFeishuTheme';
import { useFeishuUser } from '../../hooks/useFeishuUser';
import { generateMockTasks } from '../../utils/mockData';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useLoadingState } from '../../hooks/useLoadingState';
import { DeploymentHeader } from '../../components/DeploymentHeader';
import { BatchOperationPanel } from '../../components/BatchOperationPanel';
import { AddAppModal } from '../../components/AddAppModal';
import { BatchConfirmModal } from '../../components/BatchConfirmModal';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import { GroupSection } from '../../components/GroupSection';
import { useTableColumns } from '../../hooks/useTableColumns';
import { useGrouping } from '../../hooks/useGrouping';
import { useDeployOrder } from '../../hooks/useDeployOrder';
import { useBatchConfirm } from '../../hooks/useBatchConfirm';
import { useModals } from '../../hooks/useModals';

// 使用 DeploymentTask 作为数据项类型
type DataItem = DeploymentTask;

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
    },
    // 添加英文名称应用，方便测试搜索功能
    {
        name: 'api-gateway',
        artifactRepo: 'registry.company.com/api-gateway',
        latestVersion: 'v1.0.0',
        versions: ['v1.0.0', 'v0.9.5', 'v0.9.4']
    },
    {
        name: 'auth-service',
        artifactRepo: 'registry.company.com/auth-service',
        latestVersion: 'v2.5.1',
        versions: ['v2.5.1', 'v2.5.0', 'v2.4.9']
    },
    {
        name: 'analytics-service',
        artifactRepo: 'registry.company.com/analytics-service',
        latestVersion: 'v1.3.2',
        versions: ['v1.3.2', 'v1.3.1', 'v1.3.0']
    },
    {
        name: 'admin-service',
        artifactRepo: 'registry.company.com/admin-service',
        latestVersion: 'v3.1.8',
        versions: ['v3.1.8', 'v3.1.7', 'v3.1.6']
    }
];


function App() {
    // 直接使用 Zustand Store 管理状态
    const dataSource = useDeploymentStore((state) => state.tasks);
    const setData = useDeploymentStore((state) => state.setTasks);
    
    // 使用部署操作逻辑 Hook（纯操作逻辑，不包含状态）
    const {
        handleOperation: originalHandleOperation,
        getButtonConfig
    } = useDeploymentOperations();
    
    const {
        selectedKeys: selectedRowKeys,
        setSelectedKeys: setSelectedRowKeys,
        handleBatchOperation,
        canPerformBatchOperation
    } = useBatchOperations();
    
    // 使用模态框管理 Hook
    const {
        addAppModalVisible,
        openAddAppModal,
        closeAddAppModal,
        batchDropdownVisible,
        setBatchDropdownVisible,
        batchConfirmVisible,
        batchConfirmOperation,
        openBatchConfirm,
        closeBatchConfirm,
        deleteConfirmVisible,
        deleteConfirmTask,
        openDeleteConfirm,
        closeDeleteConfirm,
    } = useModals();
    
    // 加载状态管理
    const { setTaskLoading, isTaskLoading } = useLoadingState();
    
    // 包装 handleOperation，删除操作时先显示确认弹窗
    // silent: 是否静默执行（不显示 Toast 提示），用于批量操作
    const handleOperation = useCallback(async (operation: OperationType, task: DeploymentTask, silent?: boolean) => {
        if (operation === OperationType.DELETE) {
            // 删除操作：显示确认弹窗（批量操作时 silent 参数不影响删除确认）
            openDeleteConfirm(task);
        } else {
            // 其他操作：直接执行，传递 silent 参数和加载状态回调
            await originalHandleOperation(
                operation, 
                task, 
                silent,
                (loading) => setTaskLoading(task.key, loading)
            );
        }
    }, [originalHandleOperation, setTaskLoading, openDeleteConfirm]);
    
    // 新增应用
    const handleAddApp = () => {
        openAddAppModal();
    };
    
    // 确认删除操作
    const confirmDelete = useCallback(async () => {
        if (deleteConfirmTask) {
            const taskToDelete = deleteConfirmTask;
            closeDeleteConfirm();
            await originalHandleOperation(OperationType.DELETE, taskToDelete);
        }
    }, [deleteConfirmTask, originalHandleOperation, closeDeleteConfirm]);
    
    // 飞书项目系统主题跟随
    const isDarkMode = useFeishuTheme();

    // 获取当前登录用户信息（用于后续API调用）
    // @ts-ignore - user 变量保留用于后续 API 调用
    const { user: _user } = useFeishuUser();

    // 配置 Toast 容器（仅在组件挂载时配置一次）
    // 注意：Toast 需要渲染到 document.body 才能在所有层级显示
    useEffect(() => {
        if (Toast.config) {
            Toast.config({
                getPopupContainer: () => document.body
            });
        }
    }, []);

    // 隐藏表头复选框旁边的3个点：通过创建遮挡层覆盖
    useEffect(() => {
        const createOverlay = () => {
            if (typeof document === 'undefined') return;
            
            const firstTh = document.querySelector('.semi-table-thead tr th:first-child');
            if (!firstTh) return;
            
            // 移除旧的遮挡层
            const existingOverlay = document.getElementById('checkbox-overlay-mask');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // 获取表头的实际背景色
            const thStyles = window.getComputedStyle(firstTh as Element);
            let bgColor = thStyles.backgroundColor;
            
            // 如果背景色无效，根据主题使用默认颜色
            if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
                const isDark = document.body.getAttribute('theme-mode') === 'dark' ||
                             document.documentElement.classList.contains('dark');
                bgColor = isDark ? '#2a2a2a' : '#F5F7FA';
            }
            
            // 找到复选框wrap的位置
            const checkboxWrap = firstTh.querySelector('.semi-table-selection-wrap');
            if (!checkboxWrap) return;
            
            const wrapRect = checkboxWrap.getBoundingClientRect();
            const overlayWidth = 15;
            
            // 创建遮挡层
            // z-index 设置为 999，确保在 Modal 遮罩层（1000-1050）下方
            // 这样遮挡层会被遮罩层的背景色覆盖，达到颜色一致的效果
            const overlay = document.createElement('div');
            overlay.id = 'checkbox-overlay-mask';
            overlay.style.cssText = `
                position: fixed;
                left: ${Math.round(wrapRect.right)}px;
                top: ${Math.round(wrapRect.top)}px;
                width: ${overlayWidth}px;
                height: ${Math.round(wrapRect.height)}px;
                background-color: ${bgColor};
                z-index: 999;
                pointer-events: none;
            `;
            
            document.body.appendChild(overlay);
        };

        // 防抖函数
        let overlayTimer: ReturnType<typeof setTimeout> | null = null;
        const debouncedCreateOverlay = () => {
            if (overlayTimer) clearTimeout(overlayTimer);
            overlayTimer = setTimeout(createOverlay, 100);
        };

        // 立即执行一次
        createOverlay();

        // 监听DOM变化和窗口事件
        let observer: MutationObserver | null = null;
        const tableContainer = document.querySelector('.semi-table-container');
        if (tableContainer) {
            observer = new MutationObserver(debouncedCreateOverlay);
            observer.observe(tableContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style'],
            });
        }

        const handleResize = debouncedCreateOverlay;
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        // 延迟执行确保渲染完成
        const timers = [
            setTimeout(createOverlay, 500),
            setTimeout(createOverlay, 1000),
        ];

        return () => {
            if (observer) observer.disconnect();
            if (overlayTimer) clearTimeout(overlayTimer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
            timers.forEach(timer => clearTimeout(timer));
            const overlay = document.getElementById('checkbox-overlay-mask');
            if (overlay) overlay.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataSource]); // 依赖数据源变化，但主要通过 DOM 监听和窗口事件来更新遮挡层

    // 使用分组管理 Hook
    const {
        showGrouping,
        expandedRowKeys,
        handleExpandedRowsChange,
        groupInfoMap,
        compareGroupOrder,
        tableDataSource: groupedTableDataSource,
        getGroupTagColor,
        onGroupedRow
    } = useGrouping({ dataSource });

    // 使用部署顺序管理 Hook
    const { reorderSelectedTasks, handleDeployOrderChange } = useDeployOrder({
        dataSource,
        selectedRowKeys,
        onDataChange: setData
    });

    // 处理忽略部署失败变更
    const handleIgnoreFailChange = useCallback((key: string, checked: boolean) => {
        setData(prev => prev.map(item => 
            item.key === key ? { ...item, ignoreFail: checked } : item
        ));
    }, [setData]);

    // 删除操作已移至Hook中处理

    // 批量操作确认逻辑 - 使用 Hook
    const { confirmBatchOperation } = useBatchConfirm({
        dataSource,
        selectedRowKeys,
        setData,
        handleBatchOperation,
        handleOperation,
        onClose: closeBatchConfirm,
        setExpandedGroupKeys: (keys) => {
            // 将传入的 keys 转换为数组格式，以便 handleExpandedRowsChange 使用
            const keysArray = typeof keys === 'function' ? keys(expandedRowKeys) : keys;
            handleExpandedRowsChange(keysArray);
        }
    });

    // 处理新增应用确认
    const handleAddAppsConfirm = useCallback((newTasks: DeploymentTask[]) => {
        // 模拟调用生成部署任务接口
        // 实际场景中，这里会调用后端 API 生成部署任务，接口返回后会更新部署任务列表
        setData([...dataSource, ...newTasks]);
        closeAddAppModal();
        // 提示生成部署任务成功信息
        Toast.success(`成功生成 ${newTasks.length} 个部署任务`);
    }, [dataSource, setData, closeAddAppModal]);


    // 获取操作类型名称（工具函数）
    const getOperationTypeName = useCallback((operationType: string | OperationType): string => {
        const operationNames: Record<string, string> = {
            'deploy': '部署',
            'whitelist': '申请加白',
            'verify_pass': '验证通过',
            'rollback': '回滚',
            'ops_intervention': '运维介入',
            'delete': '删除'
        };
        
        return operationNames[operationType as string] || '未知操作';
    }, []);

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
            openBatchConfirm(operation);
        }
    };


    // 表格列配置 - 使用 Hook 提取
    const { columns } = useTableColumns({
        dataSource,
        selectedRowKeys,
        onDeployOrderChange: handleDeployOrderChange,
        onIgnoreFailChange: handleIgnoreFailChange,
        onOperation: handleOperation,
        getButtonConfig,
        isTaskLoading,
        compareGroupOrder,
        isDarkMode
    });

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

    // 初始化数据加载：
    // 1. 优先从 localStorage 加载操作后的真实数据（如果有）
    // 2. 如果没有，则使用 mock 数据作为初始数据
    // 3. 为部署失败的任务补充错误信息（兼容旧数据）
    // 注意：Store 会从持久化存储自动加载，这里只处理首次初始化
    useEffect(() => {
        // 只在 Store 中没有数据时初始化
        if (dataSource.length === 0) {
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 只在组件挂载时执行一次
    
    // 监听任务数据变化，保存操作后的真实数据（包括部署顺序）
    // 注意：Store 会自动保存到 localStorage，这里不需要额外保存逻辑
    // 但如果需要自定义保存逻辑，可以在这里添加


    return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('部署管理组件错误:', error, errorInfo);
        // 可以在这里上报错误到监控系统
      }}
    >
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
                    <BatchOperationPanel
                        selectedRowKeys={selectedRowKeys}
                        dataSource={dataSource}
                        batchDropdownVisible={batchDropdownVisible}
                        setBatchDropdownVisible={setBatchDropdownVisible}
                        handleBatchAction={handleBatchAction}
                        canPerformBatchOperation={canPerformBatchOperation}
                    />
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
            <DeploymentHeader isDarkMode={isDarkMode} />

            {/* 表格 */}
            <div className="semi-table-container">
                <div style={{ 
                    border: '1px solid #e8e8e8', 
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                <Table 
                    columns={columns} 
                    dataSource={groupedTableDataSource} 
                    rowSelection={rowSelection} 
                    pagination={pagination}
                    scroll={useMemo(() => ({ x: 1500, y: 'calc(100vh - 300px)' }), [])}
                    bordered={false}
                    size="small"
                    rowKey="key"
                    {...(showGrouping ? {
                        groupBy: "groupKey",
                        renderGroupSection: (groupKey: string | number | undefined) => (
                            <GroupSection
                                groupKey={groupKey}
                                groupInfoMap={groupInfoMap}
                                tableDataSource={groupedTableDataSource}
                                getGroupTagColor={getGroupTagColor}
                            />
                        ),
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
      <AddAppModal
                visible={addAppModalVisible}
                onCancel={closeAddAppModal}
        onConfirm={handleAddAppsConfirm}
        existingTasksCount={dataSource.length}
        mockApps={MOCK_APPS}
        isDarkMode={isDarkMode}
      />

      {/* 批量操作确认弹窗 */}
      <BatchConfirmModal
        visible={batchConfirmVisible}
        operation={batchConfirmOperation}
        selectedCount={selectedRowKeys.length}
        onConfirm={() => batchConfirmOperation && confirmBatchOperation(batchConfirmOperation)}
        onCancel={closeBatchConfirm}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        task={deleteConfirmTask}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      />
          </div>
    </ErrorBoundary>
  );
}

export default App;