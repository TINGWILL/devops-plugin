import React from 'react';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { DeploymentStatus, OperationType } from '../constants/deploymentStatus';
import { DeploymentTask } from '../types/deployment';
import { ButtonConfig } from '../types/deployment';

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
    <div style={{ 
      display: 'flex', 
      gap: '5px',
      padding: '0',
      margin: '0',
      alignItems: 'center', 
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      overflow: 'visible',
      boxSizing: 'border-box'
    }}>
      {/* 第一个按钮 */}
      {config.first && (
        <Button 
          size="small" 
          type={config.first.type || 'primary'}
          disabled={!config.first.enabled || isLoading}
          loading={isLoading && config.first.action === OperationType.DEPLOY}
          onClick={() => handleButtonClick(config.first!.action)}
          style={{ 
            flex: '1 1 0',
            minWidth: 0,
            maxWidth: 'calc(50% - 1px)',
            textAlign: 'center',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px 32px',
            fontSize: '12px',
            lineHeight: '20px',
            minHeight: '28px',
            height: '28px',
            margin: '0',
            whiteSpace: 'nowrap',
            overflow: 'visible',
            textOverflow: 'ellipsis',
            boxSizing: 'border-box'
          }}
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
              style={{ 
                flex: '0 0 auto',
                width: '22px',
                minWidth: '22px',
                maxWidth: '22px',
                height: '28px',
                minHeight: '28px',
                padding: '8px 20px',
                margin: '0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ fontSize: '12px', lineHeight: '18px', display: 'inline-block' }}>···</span>
            </Button>
          </Dropdown>
        ) : (
          // 禁用状态：显示禁用的按钮，不显示下拉框
          <Button 
            size="small" 
            type={config.second.type || 'primary' as any}
            disabled={true}
            style={{ 
              flex: '1 1 0',
              minWidth: 0,
              maxWidth: 'calc(50% - 1px)',
              textAlign: 'center',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4px 6px',
              fontSize: '12px',
              lineHeight: '20px',
              minHeight: '28px',
              height: '28px',
              margin: '0',
              whiteSpace: 'nowrap',
              overflow: 'visible',
              textOverflow: 'ellipsis',
              boxSizing: 'border-box'
            }}
          >
            {config.second.text}
          </Button>
        )
      )}
    </div>
  );
};
