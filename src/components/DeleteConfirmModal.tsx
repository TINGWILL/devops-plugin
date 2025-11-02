import React from 'react';
import { Modal } from '@douyinfe/semi-ui';
import { DeploymentTask } from '../types/deployment';

interface DeleteConfirmModalProps {
    visible: boolean;
    task: DeploymentTask | null;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * 删除确认弹窗组件
 */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    visible,
    task,
    onConfirm,
    onCancel
}) => {
    return (
        <Modal
            title="删除确认"
            visible={visible}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ type: 'danger' }}
            width={400}
            mask={false}
        >
            <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    确定要删除任务 <strong>{task?.appName}</strong> 吗？
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                    此操作不可恢复，请谨慎操作。
                </p>
            </div>
        </Modal>
    );
};

