import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useModals } from '../useModals';
import { OperationType, DeploymentStatus } from '../../constants/deploymentStatus';
import { DeploymentTask } from '../../types/deployment';

describe('useModals', () => {
  const mockTask: DeploymentTask = {
    key: '1',
    appName: '应用1',
    taskStatus: DeploymentStatus.PENDING,
    deployStatus: 'success',
    podStatus: 'running',
    version: 'v1.0.0',
    cluster: 'cluster1',
    namespace: 'default',
    envTag: 'prod',
    deployTime: Date.now(),
    deployer: 'user1',
    avatarBg: 'grey',
  };

  beforeEach(() => {
    // 每个测试前重置
  });

  it('should initialize with all modals closed', () => {
    const { result } = renderHook(() => useModals());

    expect(result.current.addAppModalVisible).toBe(false);
    expect(result.current.batchConfirmVisible).toBe(false);
    expect(result.current.deleteConfirmVisible).toBe(false);
    expect(result.current.batchDropdownVisible).toBe(false);
  });

  it('should open and close add app modal', () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.openAddAppModal();
    });
    expect(result.current.addAppModalVisible).toBe(true);

    act(() => {
      result.current.closeAddAppModal();
    });
    expect(result.current.addAppModalVisible).toBe(false);
  });

  it('should open and close batch confirm modal with operation', () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.openBatchConfirm(OperationType.DEPLOY);
    });
    expect(result.current.batchConfirmVisible).toBe(true);
    expect(result.current.batchConfirmOperation).toBe(OperationType.DEPLOY);
    expect(result.current.batchDropdownVisible).toBe(false);

    act(() => {
      result.current.closeBatchConfirm();
    });
    expect(result.current.batchConfirmVisible).toBe(false);
    expect(result.current.batchConfirmOperation).toBe(null);
  });

  it('should open and close delete confirm modal with task', () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.openDeleteConfirm(mockTask);
    });
    expect(result.current.deleteConfirmVisible).toBe(true);
    expect(result.current.deleteConfirmTask).toEqual(mockTask);

    act(() => {
      result.current.closeDeleteConfirm();
    });
    expect(result.current.deleteConfirmVisible).toBe(false);
    expect(result.current.deleteConfirmTask).toBe(null);
  });

  it('should handle batch dropdown visibility', () => {
    const { result } = renderHook(() => useModals());

    act(() => {
      result.current.setBatchDropdownVisible(true);
    });
    expect(result.current.batchDropdownVisible).toBe(true);

    act(() => {
      result.current.setBatchDropdownVisible(false);
    });
    expect(result.current.batchDropdownVisible).toBe(false);
  });
});

