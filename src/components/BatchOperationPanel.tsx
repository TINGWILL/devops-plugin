import React from 'react';
import { Button, Dropdown } from '@douyinfe/semi-ui';
import { DeploymentTask } from '../types/deployment';
import { OperationType } from '../constants/deploymentStatus';
import styles from './BatchOperationPanel.module.css';

interface BatchOperationPanelProps {
    selectedRowKeys: string[];
    dataSource: DeploymentTask[];
    batchDropdownVisible: boolean;
    setBatchDropdownVisible: (visible: boolean) => void;
    handleBatchAction: (type: 'deploy' | string) => void;
    canPerformBatchOperation: (tasks: DeploymentTask[], operation: OperationType) => boolean;
}

/**
 * 批量操作面板组件
 * 包含批量部署按钮和批量操作下拉菜单
 */
export const BatchOperationPanel: React.FC<BatchOperationPanelProps> = ({
    selectedRowKeys,
    dataSource,
    batchDropdownVisible,
    setBatchDropdownVisible,
    handleBatchAction,
    canPerformBatchOperation
}) => {
    return (
        <div className={styles.batchOperationPanel}>
            {/* 批量部署按钮：默认禁用，只有选中符合条件的待部署任务时才启用 */}
            <Button
                type="primary"
                disabled={!canPerformBatchOperation(dataSource, OperationType.DEPLOY)}
                onClick={() => handleBatchAction('deploy')}
            >
                批量部署
            </Button>
            
            {/* 批量操作下拉菜单：默认禁用，只有选中符合条件的任务时才启用 */}
            <Dropdown
                trigger="click"
                visible={batchDropdownVisible}
                onVisibleChange={setBatchDropdownVisible}
                content={
                    <Dropdown.Menu>
                        {[
                            { key: 'whitelist', text: '申请加白', operation: OperationType.WHITELIST },
                            { key: 'verify_pass', text: '验证通过', operation: OperationType.VERIFY_PASS }
                        ].map(item => {
                            const isEnabled = canPerformBatchOperation(dataSource, item.operation);
                            return (
                                <Dropdown.Item 
                                    key={item.key}
                                    onClick={() => {
                                        if (isEnabled) {
                                            handleBatchAction(item.key);
                                        }
                                    }}
                                    className={!isEnabled ? styles.dropdownItemDisabled : undefined}
                                >
                                    {item.text}
                                </Dropdown.Item>
                            );
                        })}
                    </Dropdown.Menu>
                }
            >
                <Button 
                    type="primary"
                    disabled={
                        !canPerformBatchOperation(dataSource, OperationType.WHITELIST) &&
                        !canPerformBatchOperation(dataSource, OperationType.VERIFY_PASS)
                    }
                >
                    ···
                </Button>
            </Dropdown>
            
            {selectedRowKeys.length > 0 && (
                <span className={styles.selectedCount}>
                    已选择 {selectedRowKeys.length} 个任务
                </span>
            )}
        </div>
    );
};

