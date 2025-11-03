import React from 'react';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { DeploymentStatus, OperationType } from '../constants/deploymentStatus';
import { DeploymentTask } from '../types/deployment';
import { ButtonConfig } from '../types/deployment';
import styles from './OperationButtons.module.css';

interface OperationButtonsProps {
  task: DeploymentTask;
  onOperation: (operation: OperationType, task: DeploymentTask) => void;
  getButtonConfig: (status: DeploymentStatus) => ButtonConfig;
  isLoading?: boolean; // 是否正在加载
}

/**
 * 操作按钮组件
 * 根据任务状态显示相应的操作按钮
 */
export const OperationButtons: React.FC<OperationButtonsProps> = ({
  task,
  onOperation,
  getButtonConfig,
  isLoading = false
}) => {
  const config = getButtonConfig(task.taskStatus);
  
  // 按钮点击处理函数
  const handleButtonClick = (action: OperationType) => {
    if (!isLoading) {
      onOperation(action, task);
    }
  };

  return (
    <div className={styles.operationButtons}>
      {/* 第一个按钮 */}
      {config.first && (
        <Button 
          size="small" 
          type={config.first.type || 'primary'}
          disabled={!config.first.enabled || isLoading}
          loading={isLoading && config.first.action === OperationType.DEPLOY}
          onClick={() => handleButtonClick(config.first!.action)}
          className={styles.firstButton}
        >
          {config.first.text}
        </Button>
      )}
      
      {/* 第二个按钮 - 下拉菜单或更多操作 */}
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
                    disabled={!item.enabled}
                  >
                    {item.text}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            }
          >
            <Button 
              size="small" 
              type={config.second.type || 'primary'}
              className={styles.secondButton}
            >
              <span className={styles.threeDots}>···</span>
            </Button>
          </Dropdown>
        ) : (
          // 禁用状态：显示禁用的按钮，不显示下拉框
          <Button 
            size="small" 
            type={config.second.type || 'primary' as any}
            disabled={true}
            className={styles.secondButtonDisabled}
          >
            {config.second.text}
          </Button>
        )
      )}
    </div>
  );
};
