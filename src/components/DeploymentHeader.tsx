import React from 'react';

interface DeploymentHeaderProps {
    isDarkMode: boolean;
}

/**
 * 部署任务顶部描述区域组件
 * 显示部署顺序编排说明
 */
export const DeploymentHeader: React.FC<DeploymentHeaderProps> = ({ isDarkMode }) => {
    return (
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
    );
};

