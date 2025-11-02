import React from 'react';
import { Modal } from '@douyinfe/semi-ui';
import { OperationType } from '../constants/deploymentStatus';

interface BatchConfirmModalProps {
    visible: boolean;
    operation: OperationType | null;
    selectedCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * 获取操作类型名称
 */
const getOperationTypeName = (operationType: string | OperationType): string => {
    const operationNames: Record<string, string> = {
        'deploy': '部署',
        'whitelist': '申请加白',
        'verify_pass': '验证通过',
        'rollback': '回滚',
        'ops_intervention': '运维介入',
        'delete': '删除'
    };
    
    return operationNames[operationType as string] || '未知操作';
};

/**
 * 批量操作确认弹窗组件
 */
export const BatchConfirmModal: React.FC<BatchConfirmModalProps> = ({
    visible,
    operation,
    selectedCount,
    onConfirm,
    onCancel
}) => {
    if (!operation) return null;

    return (
        <Modal
            title={`批量${getOperationTypeName(operation)}确认`}
            visible={visible}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="确认"
            cancelText="取消"
            width={600}
            mask={false}
        >
            <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    您选择了 {selectedCount} 个任务，系统将执行批量{getOperationTypeName(operation)}操作。
                </p>
                
                <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fafafa', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    <strong>操作说明：</strong><br/>
                    {operation === OperationType.DEPLOY && <>• 只有"待部署"状态的任务可以批量部署</>}
                    {operation === OperationType.WHITELIST && <>• 只有"待部署"状态的任务可以申请加白</>}
                    {operation === OperationType.VERIFY_PASS && <>• 只有"部署完成"状态的任务可以验证通过</>}
                    {operation === OperationType.ROLLBACK && <>• 只有"部署失败"状态的任务可以回滚</>}
                    {operation === OperationType.OPS_INTERVENTION && <>• 只有"部署失败"或"回滚中"状态的任务可以运维介入</>}
                </div>
            </div>
        </Modal>
    );
};

