import React from 'react';
import { Tag, TagColor } from '@douyinfe/semi-ui';
import { DeploymentStatus, STATUS_CONFIG } from '../constants/deploymentStatus';

interface StatusTagProps {
  status: DeploymentStatus;
  className?: string;
}

/**
 * 状态标签组件
 * 根据部署状态显示相应的颜色标签
 */
export const StatusTag: React.FC<StatusTagProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status] || { color: 'grey' };
  
  return (
    <Tag 
      color={config.color as TagColor} 
      className={`semi-tag-${config.color} ${className || ''}`}
    >
      {status}
    </Tag>
  );
};
