import React, { useState } from 'react';
import { Modal, Input, Button, Space, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconCopy, IconDelete } from '@douyinfe/semi-icons';
import { DeploymentTask } from '../types/deployment';
import { DeploymentStatus } from '../constants/deploymentStatus';

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

interface AddAppModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: (tasks: DeploymentTask[]) => void;
    existingTasksCount: number;
    mockApps: AppInfo[];
    isDarkMode: boolean;
}

/**
 * 新增应用弹窗组件
 */
export const AddAppModal: React.FC<AddAppModalProps> = ({
    visible,
    onCancel,
    onConfirm,
    existingTasksCount,
    mockApps,
    isDarkMode
}) => {
    const [appFormItems, setAppFormItems] = useState<AppFormItem[]>([]);
    const [appSearchState, setAppSearchState] = useState<{
        visible: Record<string, boolean>;
        results: AppInfo[];
    }>({ visible: {}, results: [] });

    const handleAddApp = () => {
        setAppFormItems([{ key: '1', appName: '', artifactRepo: '', artifactVersion: '' }]);
    };

    // 当弹窗显示时初始化
    React.useEffect(() => {
        if (visible) {
            handleAddApp();
        } else {
            setAppFormItems([]);
            setAppSearchState({ visible: {}, results: [] });
        }
    }, [visible]);

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

    const handleAppSearch = (value: string, index: number) => {
        updateAppFormItem(index, 'appName', value);
        
        if (value.trim()) {
            const searchValue = value.toLowerCase().trim();
            const results = mockApps.filter(app => {
                // 支持中英文混合搜索
                const appNameLower = app.name.toLowerCase();
                // 直接匹配应用名称
                if (appNameLower.includes(searchValue)) {
                    return true;
                }
                // 支持拼音首字母匹配（简单实现，可以扩展为完整拼音库）
                const pinyinMap: Record<string, string> = {
                    'y': '用户',
                    'd': '订单',
                    'z': '支付',
                    's': '商品',
                    'k': '库存',
                    't': '通知',
                    'w': '网关',
                    'p': '配置'
                };
                if (searchValue.length === 1 && pinyinMap[searchValue]) {
                    return appNameLower.includes(pinyinMap[searchValue]);
                }
                return false;
            });
            setAppSearchState({
                visible: { ...appSearchState.visible, [index]: true },
                results
            });
        } else {
            setAppSearchState({
                visible: { ...appSearchState.visible, [index]: false },
                results: []
            });
        }
    };

    const handleAppSelect = (app: AppInfo, index: number) => {
        updateAppFormItem(index, 'appName', app.name);
        updateAppFormItem(index, 'artifactRepo', app.artifactRepo);
        updateAppFormItem(index, 'artifactVersion', app.latestVersion);
        setAppSearchState({
            visible: { ...appSearchState.visible, [index]: false },
            results: []
        });
    };

    const closeAppSearch = () => {
        setAppSearchState({ visible: {}, results: [] });
    };

    const handleConfirm = () => {
        const hasEmptyFields = appFormItems.some(item => 
            !item.appName.trim() || !item.artifactRepo.trim() || !item.artifactVersion.trim()
        );
        
        if (hasEmptyFields) {
            Toast.error('请填写所有必填字段');
            return;
        }

        const newTasks: DeploymentTask[] = appFormItems.map((item, index) => ({
            key: (existingTasksCount + index + 1).toString(),
            appName: item.appName,
            deployStatus: 'success',
            podStatus: 'running',
            version: item.artifactVersion,
            cluster: 'CBG多业务森华机房k8s集群(1.15)',
            namespace: 'default',
            envTag: 'prod',
            deployTime: Date.now(),
            deployer: '当前用户',
            avatarBg: ['grey', 'red', 'blue', 'green', 'orange'][index % 5],
            taskStatus: DeploymentStatus.PENDING,
            deployOrder: undefined,
            groupKey: undefined // 新增应用默认无分组，与 mock 数据保持一致
        }));

        onConfirm(newTasks);
        setAppFormItems([]);
        setAppSearchState({ visible: {}, results: [] });
    };

    const inputStyles = {
        width: '100%',
        fontSize: '14px',
        height: '32px'
    };

    const disabledInputStyles = {
        ...inputStyles,
        backgroundColor: isDarkMode ? 'var(--semi-color-bg-2)' : '#f5f5f5',
        cursor: 'not-allowed'
    };

    const dropdownStyles = {
        position: 'absolute' as const,
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: isDarkMode ? 'var(--semi-color-bg-0)' : '#fff',
        border: `1px solid ${isDarkMode ? 'var(--semi-color-border)' : '#d9d9d9'}`,
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxHeight: '200px',
        overflowY: 'auto' as const,
        zIndex: 1000
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

    return (
        <Modal
            title="新增应用"
            visible={visible}
            onOk={handleConfirm}
            onCancel={onCancel}
            okText="确认"
            cancelText="取消"
            width={800}
            onMaskClick={closeAppSearch}
            style={{ top: '10%' }}
        >
            <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr 80px',
                    gap: '12px',
                    marginBottom: '12px',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: isDarkMode ? 'var(--semi-color-text-0)' : '#262626'
                }}>
                    <div>应用名称</div>
                    <div>制品仓库</div>
                    <div>制品版本</div>
                    <div>操作</div>
                </div>
                
                {appFormItems.map((item, index) => (
                    <div key={item.key} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr 80px',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <div style={{ position: 'relative' }}>
                            <Input
                                placeholder="应用名称"
                                value={item.appName}
                                onChange={(value) => handleAppSearch(value, index)}
                                style={inputStyles}
                            />
                            {appSearchState.visible[index] && (
                                <div
                                    style={{
                                        ...dropdownStyles,
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0
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
    );
};

