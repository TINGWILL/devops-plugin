import { useState, useMemo, useEffect } from 'react';
import { Table, Avatar, Tag, Button, Modal, Toast, Input, Space, Dropdown } from '@douyinfe/semi-ui';
import { IconPlus, IconCopy, IconDelete } from '@douyinfe/semi-icons';
import * as dateFns from 'date-fns';

const DAY = 24 * 60 * 60 * 1000;

interface DataItem {
    key: string;
  appName: string;
    deployStatus: string;
  podStatus: string;
  version: string;
  cluster: string;
  namespace: string;
    envTag: string;
    deployTime: number;
  deployer: string;
    avatarBg: string;
    taskStatus: string;
}

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

const STATUS_CONFIG = {
    '待部署': { color: 'grey', order: 1 },
    '部署中': { color: 'blue', order: 2 },
    '审批中': { color: 'blue', order: 3 },
    '部署成功': { color: 'blue', order: 4 },
    '验证通过': { color: 'green', order: 5 },
    '验证失败': { color: 'red', order: 6 },
    '部署失败': { color: 'red', order: 7 },
    '部署终止': { color: 'red', order: 8 }
};

const POD_STATUS_CONFIG = {
    'running': { text: '运行中', order: 1 },
    'pending': { text: '等待中', order: 2 },
    'failed': { text: '失败', order: 3 }
};

function App() {
    const [dataSource, setData] = useState<DataItem[]>([]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<DataItem | null>(null);
    const [addAppModalVisible, setAddAppModalVisible] = useState(false);
    const [appFormItems, setAppFormItems] = useState<AppFormItem[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [batchModalVisible, setBatchModalVisible] = useState(false);
    const [batchModalType, setBatchModalType] = useState<'deploy' | 'operation'>('deploy');
    const [batchOperationType, setBatchOperationType] = useState<string>('');
    const [batchTasks, setBatchTasks] = useState<{
        applicable: DataItem[];
        notApplicable: DataItem[];
    }>({ applicable: [], notApplicable: [] });
    const [appSearchState, setAppSearchState] = useState<{
        visible: Record<string, boolean>;
        results: AppInfo[];
    }>({ visible: {}, results: [] });
    const [batchDropdownVisible, setBatchDropdownVisible] = useState(false);
    
    // 飞书项目系统主题跟随
    const [isDarkMode, setIsDarkMode] = useState(false);
    
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

    // 部署操作
    const handleDeploy = (record: DataItem) => {
        setData(prev => prev.map(item => 
            item.key === record.key 
                ? { ...item, taskStatus: '部署中', deployStatus: 'pending' }
                : item
        ));
        Toast.success(`${record.appName} 开始执行部署`);
        
        setTimeout(() => {
            setData(prev => prev.map(item => 
                item.key === record.key 
                    ? { ...item, taskStatus: '部署成功', deployStatus: 'success', podStatus: 'running' }
                    : item
            ));
            Toast.success(`${record.appName} 部署成功`);
        }, 3000);
    };

    // 删除操作
    const handleDelete = (record: DataItem) => {
        setCurrentRecord(record);
        setDeleteModalVisible(true);
    };

    const confirmDelete = () => {
        if (currentRecord) {
            setData(prev => prev.filter(item => item.key !== currentRecord.key));
            Toast.success(`${currentRecord.appName} 已删除`);
        }
        setDeleteModalVisible(false);
        setCurrentRecord(null);
    };

    // 处理下拉菜单操作
    const handleDropdownAction = (action: string, record: DataItem) => {
        switch (action) {
            case 'whitelist':
                Toast.info('申请加白功能待实现');
                break;
            case 'delete':
                handleDelete(record);
                break;
            case 'verify_pass':
                setData(prev => prev.map(item => 
                    item.key === record.key 
                        ? { ...item, taskStatus: '验证通过' }
                        : item
                ));
                Toast.success(`${record.appName} 验证通过`);
                break;
            case 'verify_fail':
                setData(prev => prev.map(item => 
                    item.key === record.key 
                        ? { ...item, taskStatus: '验证失败' }
                        : item
                ));
                Toast.success(`${record.appName} 验证失败`);
                break;
            case 'redeploy':
                setData(prev => prev.map(item => 
                    item.key === record.key 
                        ? { ...item, taskStatus: '部署中', deployStatus: 'pending' }
                        : item
                ));
                Toast.success(`${record.appName} 开始重新部署`);
                
                setTimeout(() => {
                    setData(prev => prev.map(item => 
                        item.key === record.key 
                            ? { ...item, taskStatus: '部署成功', deployStatus: 'success', podStatus: 'running' }
                            : item
                    ));
                    Toast.success(`${record.appName} 重新部署成功`);
                }, 3000);
                break;
            case 'terminate':
                setData(prev => prev.map(item => 
                    item.key === record.key 
                        ? { ...item, taskStatus: '部署终止' }
                        : item
                ));
                Toast.success(`${record.appName} 部署已终止`);
                break;
            default:
                Toast.warning('未知操作');
        }
    };

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
            cluster: '生产集群',
      namespace: 'default',
            envTag: 'prod',
            deployTime: new Date().valueOf(),
            deployer: '当前用户',
            avatarBg: ['grey', 'red', 'blue', 'green', 'orange'][index % 5],
            taskStatus: '待部署'
        }));

        setData(prev => [...prev, ...newTasks]);
        setAddAppModalVisible(false);
        setAppFormItems([]);
        Toast.success(`成功添加 ${newTasks.length} 个应用`);
  };


    // 获取任务适用性
    const getTaskApplicability = (type: string, taskStatus: string) => {
        if (type === 'deploy') {
            return taskStatus === '待部署' || taskStatus === '部署成功';
        }
        
        switch (type) {
            case 'whitelist':
                return taskStatus === '待部署';
            case 'verify_pass':
            case 'verify_fail':
                return taskStatus === '部署成功';
            case 'terminate':
                return ['部署中', '审批中', '部署成功'].includes(taskStatus);
            default:
                return false;
        }
    };

    // 获取操作类型的中文名称
    const getOperationTypeName = (operationType: string) => {
        const operationNames = {
            'whitelist': '申请加白',
            'verify_pass': '验证通过',
            'verify_fail': '验证失败',
            'terminate': '部署终止'
        };
        return operationNames[operationType] || '未知操作';
    };

    // 获取按钮配置
    const getButtonConfig = (taskStatus: string) => {
        const configs = {
            '待部署': {
                first: { text: '开始部署', action: 'deploy', enabled: true },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: true, 
                    items: [
                        { key: 'whitelist', text: '申请加白' },
                        { key: 'delete', text: '删除' }
                    ]
                }
            },
            '部署中': {
                first: { text: '开始部署', action: 'deploy', enabled: false },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: false, 
                    items: [{ key: 'delete', text: '删除' }]
                }
            },
            '部署成功': {
                first: { text: '验证通过', action: 'verify_pass', enabled: true },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: true, 
                    items: [
                        { key: 'verify_fail', text: '验证失败' },
                        { key: 'redeploy', text: '重新部署' },
                        { key: 'terminate', text: '终止部署' },
                        { key: 'delete', text: '删除' }
                    ]
                }
            },
            '部署失败': {
                first: { text: '重新部署', action: 'redeploy', enabled: true },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: true, 
                    items: [
                        { key: 'terminate', text: '终止部署' },
                        { key: 'delete', text: '删除' }
                    ]
                }
            },
            '审批中': {
                first: { text: '开始部署', action: 'deploy', enabled: false },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: false, 
                    items: [{ key: 'delete', text: '删除' }]
                }
            },
            '验证通过': {
                first: { text: '重新部署', action: 'redeploy', enabled: false },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: false, 
                    items: [{ key: 'delete', text: '删除' }]
                }
            },
            '验证失败': {
                first: { text: '重新部署', action: 'redeploy', enabled: false },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: false, 
                    items: [{ key: 'delete', text: '删除' }]
                }
            },
            '部署终止': {
                first: { text: '重新部署', action: 'redeploy', enabled: false },
                second: { 
                    text: '···', 
                    action: 'dropdown', 
                    enabled: false, 
                    items: [{ key: 'delete', text: '删除' }]
                }
            }
        };
        return configs[taskStatus] || { first: null, second: null };
    };

    // 通用批量处理函数
    const handleBatchAction = (type: 'deploy' | string) => {
        if (!Array.isArray(selectedRowKeys) || selectedRowKeys.length === 0) {
            Toast.warning('请先选择要操作的任务');
            return;
        }

        const selectedTasks = dataSource.filter(item => Array.isArray(selectedRowKeys) && selectedRowKeys.includes(item.key));
        const applicableTasks = selectedTasks.filter(task => getTaskApplicability(type, task.taskStatus));
        const notApplicableTasks = selectedTasks.filter(task => !getTaskApplicability(type, task.taskStatus));

        if (applicableTasks.length === 0) {
            const actionName = type === 'deploy' ? '部署' : getOperationTypeName(type);
            let message = `选中的任务中没有可以${actionName}的任务：\n`;
            if (notApplicableTasks.length > 0) {
                message += `• ${notApplicableTasks.length} 个任务状态不符合要求\n`;
            }
            message += `\n只有特定状态的任务可以执行${actionName}操作。`;
            Toast.warning(message);
            return;
        }

        setBatchModalType(type === 'deploy' ? 'deploy' : 'operation');
        setBatchOperationType(type);
        setBatchTasks({ applicable: applicableTasks, notApplicable: notApplicableTasks });
        
        // 关闭dropdown并显示弹窗
        setBatchDropdownVisible(false);
        setBatchModalVisible(true);
    };

    // 确认批量操作
    const confirmBatchAction = () => {
        const { applicable } = batchTasks;
        const actionName = batchModalType === 'deploy' ? '部署' : getOperationTypeName(batchOperationType);
        
        if (batchModalType === 'deploy') {
            // 执行批量部署
            setData(prev => prev.map(item => 
                Array.isArray(selectedRowKeys) && selectedRowKeys.includes(item.key) && 
                getTaskApplicability('deploy', item.taskStatus)
                    ? { ...item, taskStatus: '部署中', deployStatus: 'pending' }
                    : item
            ));

            Toast.success(`开始批量部署 ${applicable.length} 个任务`);

            setTimeout(() => {
                setData(prev => prev.map(item => 
                    Array.isArray(selectedRowKeys) && selectedRowKeys.includes(item.key) && item.taskStatus === '部署中'
                        ? { ...item, taskStatus: '部署成功', deployStatus: 'success', podStatus: 'running' }
                        : item
                ));
                Toast.success(`批量部署成功，共完成 ${applicable.length} 个任务`);
            }, 3000);
        } else {
            // 执行批量操作
            setData(prev => prev.map(item => {
                if (Array.isArray(selectedRowKeys) && selectedRowKeys.includes(item.key) && 
                    getTaskApplicability(batchOperationType, item.taskStatus)) {
                    
                    switch (batchOperationType) {
                        case 'whitelist':
                            return item; // 申请加白：状态不变
                        case 'verify_pass':
                            return { ...item, taskStatus: '验证通过' };
                        case 'verify_fail':
                            return { ...item, taskStatus: '验证失败' };
                        case 'terminate':
                            return { ...item, taskStatus: '部署终止' };
                        default:
                            return item;
                    }
                }
                return item;
            }));

            Toast.success(`开始批量${actionName} ${applicable.length} 个任务`);
        }

        setSelectedRowKeys([]);
        setBatchModalVisible(false);
    };

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
            render: (text) => {
                const config = STATUS_CONFIG[text] || { color: 'grey' };
                return (
                    <Tag color={config.color} className={`semi-tag-${config.color}`}>
                        {text}
                    </Tag>
                );
            }
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
            width: 120,
            filters: [
                { text: '生产集群', value: '生产集群' },
                { text: '测试集群', value: '测试集群' },
                { text: '开发集群', value: '开发集群' },
            ],
            onFilter: (value, record) => record.cluster === value,
            },
            {
              title: '命名空间',
            dataIndex: 'namespace',
            width: 120,
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
            filters: [
                { text: 'prod', value: 'prod' },
                { text: 'test', value: 'test' },
                { text: 'dev', value: 'dev' },
                { text: 'staging', value: 'staging' },
            ],
            onFilter: (value, record) => record.envTag === value,
            render: (text) => <Tag color="blue" className="semi-tag-blue">{text}</Tag>,
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
            render: (text, record) => {
                try {
                    const config = getButtonConfig(record.taskStatus);
                    
                    // 按钮点击处理函数
                    const handleButtonClick = (action: string) => {
                        const actionHandlers = {
                            'deploy': () => handleDeploy(record),
                            'delete': () => handleDelete(record),
                            'whitelist': () => handleDropdownAction('whitelist', record),
                            'verify_pass': () => handleDropdownAction('verify_pass', record),
                            'verify_fail': () => handleDropdownAction('verify_fail', record),
                            'redeploy': () => handleDropdownAction('redeploy', record),
                            'terminate': () => handleDropdownAction('terminate', record)
                        };
                        actionHandlers[action]?.();
                    };
                
                return (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                        {/* 第一个按钮 */}
                        {config.first && (
                            <Button 
                                size="small" 
                                type="primary"
                                disabled={!config.first.enabled}
                                onClick={() => handleButtonClick(config.first.action)}
                                style={{ 
                                    width: '80px', 
                                    textAlign: 'center',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}
                            >
                                {config.first.text}
                            </Button>
                        )}
                        
                        {/* 第二个按钮 - 始终使用下拉框 */}
                        {config.second && (
                            config.second.enabled ? (
                                // 启用状态：显示可点击的下拉框
                                <Dropdown
                                    trigger="click"
                                    content={
                                        <Dropdown.Menu>
                                            {config.second.items?.map(item => (
                                                <Dropdown.Item 
                                                    key={item.key}
                                                    onClick={() => handleButtonClick(item.key)}
                                                >
                                                    {item.text}
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    }
                                >
                                    <Button 
                                        size="small" 
                                        type="primary"
                                        style={{ 
                                            width: '80px', 
                                            textAlign: 'center',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {config.second.text}
                                    </Button>
                                </Dropdown>
                            ) : (
                                // 禁用状态：显示禁用的按钮，不显示下拉框
                                <Button 
                                    size="small" 
                                    type="primary"
                                    disabled={true}
                                    style={{ 
                                        width: '80px', 
                                        textAlign: 'center',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    {config.second.text}
                                </Button>
                            )
                        )}
                    </div>
                );
                } catch (error) {
                    console.error('操作列渲染错误:', error, record);
                    return <span style={{ color: 'red' }}>渲染错误</span>;
                }
            },
        },
    ];

    const rowSelection = useMemo(
        () => ({
            fixed: true,
            selectedRowKeys,
            onChange: (selectedRowKeys: string[]) => setSelectedRowKeys(selectedRowKeys),
        }),
        [selectedRowKeys]
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
        const clusters = ['生产集群', '测试集群', '开发集群'];
        const namespaces = ['default', 'production', 'staging', 'development'];
        const envTags = ['prod', 'test', 'dev', 'staging'];
        const deployers = ['张三', '李四', '王五', '赵六', '钱七'];
        const taskStatuses = ['待部署', '部署成功', '部署中', '验证通过', '验证失败', '部署失败', '审批中', '部署终止'];
        
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
            });
        }
        return data;
    };

    useEffect(() => {
        try {
            console.log('开始加载数据...');
            const data = getData();
            console.log('数据加载完成:', data.length, '条记录');
            setData(data);
        } catch (error) {
            console.error('数据加载失败:', error);
            setData([]);
        }
    }, []);

    return (
        <div 
            id="app"
            style={{ 
                padding: '0 24px',
                backgroundColor: isDarkMode ? 'var(--semi-color-bg-0)' : '#ffffff',
                color: isDarkMode ? 'var(--semi-color-text-0)' : '#262626',
                height: '100vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* 字体样式覆盖 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    * {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
                    }
                    .semi-table th {
                        font-weight: 600 !important;
                        color: ${isDarkMode ? 'var(--semi-color-text-0)' : '#262626'} !important;
                    }
                    .semi-table td {
                        font-weight: 400 !important;
                        color: ${isDarkMode ? 'var(--semi-color-text-0)' : '#262626'} !important;
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
                                            { key: 'verify_fail', text: '验证失败' },
                                            { key: 'terminate', text: '部署终止' }
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

            {/* 表格 */}
            <div className="semi-table-container" style={{ flex: 1, overflow: 'hidden', marginBottom: '12px' }}>
                <Table 
                    columns={columns} 
                    dataSource={dataSource} 
                    rowSelection={rowSelection} 
                    pagination={pagination}
                    scroll={{ x: 1500, y: 'calc(100vh - 188px)' }}
                    bordered={true}
                    size="small"
                    style={{ 
                        border: '1px solid #e8e8e8', 
                        borderRadius: '6px',
                        height: '100%'
                    }}
        />
      </div>
            
            {/* 删除确认弹窗 */}
            <Modal
                title="确认删除"
                visible={deleteModalVisible}
                onOk={confirmDelete}
                onCancel={() => setDeleteModalVisible(false)}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ type: 'danger' }}
            >
                <p>确认删除部署任务吗？</p>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
                    删除部署任务后，该任务不可复原
                </p>
                <p style={{ color: '#666', fontSize: '14px' }}>
                    点击确认后，将对应部署任务删除
                </p>
            </Modal>

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
        title={`批量${batchModalType === 'deploy' ? '部署' : getOperationTypeName(batchOperationType)}确认`}
        visible={batchModalVisible}
        onOk={confirmBatchAction}
        onCancel={() => setBatchModalVisible(false)}
        okText={`确认${batchModalType === 'deploy' ? '部署' : getOperationTypeName(batchOperationType)}`}
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
            您选择了 {selectedRowKeys.length} 个任务，系统将按以下规则执行批量{batchModalType === 'deploy' ? '部署' : getOperationTypeName(batchOperationType)}：
          </p>
          
          {batchTasks.applicable.length > 0 && (
            <div style={{ 
              marginBottom: '12px', 
              padding: '12px', 
              backgroundColor: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '6px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#52c41a', 
                  borderRadius: '50%', 
                  marginRight: '8px' 
                }}></div>
                <strong style={{ color: '#52c41a' }}>
                  将{batchModalType === 'deploy' ? '部署' : getOperationTypeName(batchOperationType)} {batchTasks.applicable.length} 个任务
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginLeft: '16px' }}>
                {batchTasks.applicable.map(task => (
                  <div key={task.key} style={{ marginBottom: '4px' }}>
                    • {task.appName} ({task.taskStatus})
                  </div>
                ))}
              </div>
            </div>
          )}

          {batchTasks.notApplicable.length > 0 && (
            <div style={{ 
              marginBottom: '12px', 
              padding: '12px', 
              backgroundColor: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#ff4d4f', 
                  borderRadius: '50%', 
                  marginRight: '8px' 
                }}></div>
                <strong style={{ color: '#ff4d4f' }}>
                  跳过 {batchTasks.notApplicable.length} 个不符合条件的任务
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginLeft: '16px' }}>
                {batchTasks.notApplicable.map(task => (
                  <div key={task.key} style={{ marginBottom: '4px' }}>
                    • {task.appName} ({task.taskStatus})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fafafa', 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <strong>操作规则说明：</strong><br/>
            {batchModalType === 'deploy' ? (
              <>• 只有"待部署"和"部署成功"状态的任务可以批量部署</>
            ) : (
              <>
                {batchOperationType === 'whitelist' && <>• 只有"待部署"状态的任务可以申请加白</>}
                {batchOperationType === 'verify_pass' && <>• 只有"部署成功"状态的任务可以验证通过</>}
                {batchOperationType === 'verify_fail' && <>• 只有"部署成功"状态的任务可以验证失败</>}
                {batchOperationType === 'terminate' && <>• "部署中"、"审批中"、"部署成功"状态的任务可以终止部署</>}
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;