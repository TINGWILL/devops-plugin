import React from 'react';
import { Modal } from '@douyinfe/semi-ui';
import { DeploymentTask } from '../types/deployment';
import styles from './DeleteConfirmModal.module.css';

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
        >
            <div className={styles.modalContent}>
                <p className={styles.modalText}>
                    确定要删除任务 <strong>{task?.appName}</strong> 吗？
                </p>
                <p className={styles.modalHint}>
                    此操作不可恢复，请谨慎操作。
                </p>
            </div>
        </Modal>
    );
};

