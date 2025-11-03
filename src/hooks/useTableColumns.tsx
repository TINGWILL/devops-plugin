import React, { useMemo } from 'react';
import { Avatar, Tag, Input, Checkbox } from '@douyinfe/semi-ui';
import * as dateFns from 'date-fns';
import { DeploymentTask } from '../types/deployment';
import { ButtonConfig } from '../types/deployment';
import { DeploymentStatus, OperationType, STATUS_CONFIG } from '../constants/deploymentStatus';
import { OperationButtons } from '../components/OperationButtons';
import { StatusTag } from '../components/StatusTag';

const POD_STATUS_CONFIG = {
    'running': { text: '运行中', order: 1 },
    'pending': { text: '等待中', order: 2 },
    'failed': { text: '失败', order: 3 }
};

interface UseTableColumnsProps {
    dataSource: DeploymentTask[];
    selectedRowKeys: string[];
    onDeployOrderChange: (key: string, value: string) => void;
    onIgnoreFailChange: (key: string, checked: boolean) => void;
    onOperation: (operation: OperationType, task: DeploymentTask, silent?: boolean) => Promise<void>;
    getButtonConfig: (status: DeploymentStatus) => ButtonConfig;
    isTaskLoading: (key: string) => boolean;
    compareGroupOrder: (a: DeploymentTask, b: DeploymentTask) => number;
    isDarkMode: boolean;
}

/**
 * 表格列配置 Hook
 * 管理表格列定义、排序逻辑等
 */
export const useTableColumns = ({
    dataSource,
    selectedRowKeys,
    onDeployOrderChange,
    onIgnoreFailChange,
    onOperation,
    getButtonConfig,
    isTaskLoading,
    compareGroupOrder,
    isDarkMode
}: UseTableColumnsProps): { columns: any[] } => {
    // 返回类型使用 any[] 因为 Semi Design Table 的 columns 类型较复杂
    const columns = useMemo(() => [
        {
            title: '应用名称',
            dataIndex: 'appName',
            width: 200,
            fixed: 'left' as const,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                return (a.appName.length - b.appName.length > 0 ? 1 : -1);
            },
            render: (text: string, record: DeploymentTask) => (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {text}
                </span>
            )
        },
        {
            title: '部署状态',
            dataIndex: 'taskStatus',
            width: 120,
            fixed: 'left' as const,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                const orderA = STATUS_CONFIG[a.taskStatus]?.order || 999;
                const orderB = STATUS_CONFIG[b.taskStatus]?.order || 999;
                return orderA - orderB;
            },
            render: (text: DeploymentStatus, record: DeploymentTask) => (
                <StatusTag
                    status={text}
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
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                return (a.version || '').localeCompare(b.version || '');
            },
        },
        {
            title: '发布集群',
            dataIndex: 'cluster',
            width: 280,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                return (a.cluster || '').localeCompare(b.cluster || '');
            }
        },
        {
            title: '命名空间',
            dataIndex: 'namespace',
            width: 120,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                return (a.namespace || '').localeCompare(b.namespace || '');
            }
        },
        {
            title: '环境标签',
            dataIndex: 'envTag',
            width: 120,
            render: (text: string) => <Tag color="blue" className="semi-tag-blue">{text}</Tag>,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                return (a.envTag || '').localeCompare(b.envTag || '');
            }
        },
        {
            title: '部署顺序',
            dataIndex: 'deployOrder',
            width: 120,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                const orderA = a.deployOrder || 999999;
                const orderB = b.deployOrder || 999999;
                return orderA - orderB;
            },
            render: (text: number | undefined, record: DeploymentTask) => {
                if (record.deployOrder !== undefined && record.deployOrder !== null) {
                    if (selectedRowKeys.includes(record.key) && record.taskStatus === DeploymentStatus.PENDING) {
                        return (
                            <Input
                                size="small"
                                value={record.deployOrder || ''}
                                placeholder="顺序"
                                onChange={(value) => onDeployOrderChange(record.key, value)}
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
                    return (
                        <span style={{ 
                            color: record.taskStatus === DeploymentStatus.PENDING ? '#333' : '#666', 
                            textAlign: 'center', 
                            display: 'block',
                            height: '28px',
                            lineHeight: '28px',
                            margin: 0,
                            padding: 0,
                            fontWeight: record.taskStatus !== DeploymentStatus.PENDING ? 500 : 400
                        }}>
                            {record.deployOrder}
                        </span>
                    );
                }
                return (
                    <span style={{ 
                        color: '#999', 
                        textAlign: 'center', 
                        display: 'block',
                        height: '28px',
                        lineHeight: '28px',
                        margin: 0,
                        padding: 0
                    }}>
                        -
                    </span>
                );
            }
        },
        {
            title: '忽略部署失败',
            dataIndex: 'ignoreFail',
            width: 120,
            onCell: () => ({
                onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                }
            }),
            render: (text: boolean | undefined, record: DeploymentTask) => {
                // 只有选中第一列复选框且为待部署状态时才显示
                if (!selectedRowKeys.includes(record.key) || record.taskStatus !== DeploymentStatus.PENDING) {
                    return <div style={{ textAlign: 'center', height: '28px', lineHeight: '28px', color: '#999' }}>-</div>;
                }
                return (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '28px' }}>
                        <Checkbox
                            checked={record.ignoreFail === true}
                            onChange={(e) => {
                                const checked = typeof e === 'boolean' ? e : (e?.target?.checked ?? false);
                                onIgnoreFailChange(record.key, checked);
                            }}
                        />
                    </div>
                );
            }
        },
        {
            title: 'Pod状态',
            dataIndex: 'podStatus',
            width: 120,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                const orderA = POD_STATUS_CONFIG[a.podStatus as keyof typeof POD_STATUS_CONFIG]?.order || 999;
                const orderB = POD_STATUS_CONFIG[b.podStatus as keyof typeof POD_STATUS_CONFIG]?.order || 999;
                return orderA - orderB;
            },
            render: (text: string) => {
                const config = POD_STATUS_CONFIG[text as keyof typeof POD_STATUS_CONFIG];
                return config ? config.text : text;
            }
        },
        {
            title: '部署时间',
            dataIndex: 'deployTime',
            width: 150,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                return (a.deployTime - b.deployTime > 0 ? 1 : -1);
            },
            render: (value: number) => dateFns.format(new Date(value), 'yyyy-MM-dd HH:mm'),
        },
        {
            title: '部署人',
            dataIndex: 'deployer',
            width: 120,
            sorter: (a: DeploymentTask, b: DeploymentTask) => {
                const groupOrder = compareGroupOrder(a, b);
                if (groupOrder !== 0) return groupOrder;
                return (a.deployer || '').localeCompare(b.deployer || '');
            },
            render: (text: string, record: DeploymentTask) => (
                <div>
                    <Avatar 
                        size="small" 
                        style={{ marginRight: 4, backgroundColor: record.avatarBg }}
                    >
                        {typeof text === 'string' && text.slice(0, 1)}
                    </Avatar>
                    {text}
                </div>
            ),
        },
        {
            title: '操作',
            dataIndex: 'operation',
            width: 140,
            fixed: 'right' as const,
            render: (text: any, record: DeploymentTask) => (
                <OperationButtons
                    task={record}
                    onOperation={onOperation}
                    getButtonConfig={getButtonConfig}
                    isLoading={isTaskLoading(record.key)}
                />
            ),
        },
    ], [selectedRowKeys, onDeployOrderChange, onIgnoreFailChange, onOperation, getButtonConfig, compareGroupOrder, isTaskLoading, isDarkMode]);

    return {
        columns
    };
};

