import React, { useMemo } from 'react';
import { DeploymentTask } from '../types/deployment';
import styles from './GroupSection.module.css';

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
            <span className={styles.groupSection}>
                <span className={`${styles.groupTag} ${styles.defaultGroupTag}`}>
                    默认分组
                </span>
                <span className={styles.groupCount}>
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
        <span className={styles.groupSection}>
            <span 
                className={`${styles.groupTag} ${styles.batchGroupTag}`}
                style={{ backgroundColor: tagColor.bg }}
                data-tag-color={tagColor.bg}
            >
                分组 {groupInfo.groupNumber}
            </span>
            <span className={styles.groupCount}>
                共{groupInfo.taskCount}个
            </span>
        </span>
    );
};

