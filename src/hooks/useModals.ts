import { useState, useCallback } from 'react';
import { DeploymentTask } from '../types/deployment';
import { OperationType } from '../constants/deploymentStatus';

/**
 * 模态框状态管理 Hook
 * 统一管理所有模态框的显示状态
 */
export const useModals = () => {
  const [addAppModalVisible, setAddAppModalVisible] = useState(false);
  const [batchDropdownVisible, setBatchDropdownVisible] = useState(false);
  const [batchConfirmVisible, setBatchConfirmVisible] = useState(false);
  const [batchConfirmOperation, setBatchConfirmOperation] = useState<OperationType | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<DeploymentTask | null>(null);

  // 新增应用弹窗
  const openAddAppModal = useCallback(() => setAddAppModalVisible(true), []);
  const closeAddAppModal = useCallback(() => setAddAppModalVisible(false), []);

  // 批量操作下拉框
  const setBatchDropdownVisibleHandler = useCallback((visible: boolean) => {
    if (visible) {
      setBatchDropdownVisible(true);
    } else {
      setBatchDropdownVisible(false);
    }
  }, []);
  
  // 为了兼容，也导出直接的方法
  const openBatchDropdown = useCallback(() => setBatchDropdownVisible(true), []);
  const closeBatchDropdown = useCallback(() => setBatchDropdownVisible(false), []);

  // 批量操作确认弹窗
  const openBatchConfirm = useCallback((operation: OperationType) => {
    setBatchConfirmOperation(operation);
    setBatchConfirmVisible(true);
    setBatchDropdownVisible(false);
  }, []);
  const closeBatchConfirm = useCallback(() => {
    setBatchConfirmVisible(false);
    setBatchConfirmOperation(null);
  }, []);

  // 删除确认弹窗
  const openDeleteConfirm = useCallback((task: DeploymentTask) => {
    setDeleteConfirmTask(task);
    setDeleteConfirmVisible(true);
  }, []);
  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmVisible(false);
    setDeleteConfirmTask(null);
  }, []);

  return {
    // 新增应用弹窗
    addAppModalVisible,
    openAddAppModal,
    closeAddAppModal,
    
    // 批量操作下拉框
    batchDropdownVisible,
    setBatchDropdownVisible: setBatchDropdownVisibleHandler,
    openBatchDropdown,
    closeBatchDropdown,
    
    // 批量操作确认弹窗
    batchConfirmVisible,
    batchConfirmOperation,
    openBatchConfirm,
    closeBatchConfirm,
    
    // 删除确认弹窗
    deleteConfirmVisible,
    deleteConfirmTask,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
};

