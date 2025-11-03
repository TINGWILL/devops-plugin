import React from 'react';
import styles from './DeploymentHeader.module.css';

interface DeploymentHeaderProps {
    isDarkMode: boolean;
}

/**
 * 部署任务顶部描述区域组件
 * 显示部署顺序编排说明
 */
export const DeploymentHeader: React.FC<DeploymentHeaderProps> = ({ isDarkMode }) => {
    return (
        <div className={styles.deploymentHeader}>
            <div className={styles.deploymentHeaderContent}>
                • 勾选待部署状态的任务，系统将自动分配唯一的部署顺序（1、2、3...）
                <br />
                • 可通过"部署顺序"列手动修改任务执行顺序，系统会自动调整其他任务的顺序，确保顺序唯一且连续
                <br />
                • 使用批量操作功能可对选中的任务按顺序进行统一部署
            </div>
        </div>
    );
};

