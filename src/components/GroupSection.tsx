import React, { useMemo } from 'react';
import { DeploymentTask } from '../types/deployment';

interface GroupSectionProps {
    groupKey: string | number | undefined;
    groupInfoMap: Map<string, { groupId: string; groupNumber: number; taskCount: number; createTime: number }>;
    tableDataSource: DeploymentTask[];
    getGroupTagColor: (groupNumber: number) => { bg: string; text: string };
}

/**
 * 分组头部渲染组件
 */
export const GroupSection: React.FC<GroupSectionProps> = ({
    groupKey,
    groupInfoMap,
    tableDataSource,
    getGroupTagColor
}) => {
    const groupKeyStr = String(groupKey);
    
    // 默认分组
    if (groupKeyStr === '0' || groupKey === 0) {
        const unbatchedTasks = useMemo(() => {
            return tableDataSource.filter(task => {
                const taskGroupKey = task.groupKey || '0';
                return taskGroupKey === '0';
            });
        }, [tableDataSource]);
        
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
    
    // 分组
    const groupInfo = groupInfoMap.get(groupKeyStr);
    if (!groupInfo) {
        return null;
    }
    
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
};

