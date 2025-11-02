import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBatchConfirm } from '../useBatchConfirm';
import { DeploymentStatus, OperationType } from '../../constants/deploymentStatus';
import { DeploymentTask } from '../../types/deployment';

// Mock Toast
vi.mock('@douyinfe/semi-ui', () => ({
  Toast: {
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useBatchConfirm', () => {
  const mockTasks: DeploymentTask[] = [
    {
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
      deployOrder: 1,
    },
    {
      key: '2',
      appName: '应用2',
      taskStatus: DeploymentStatus.PENDING,
      deployStatus: 'success',
      podStatus: 'running',
      version: 'v1.0.0',
      cluster: 'cluster1',
      namespace: 'default',
      envTag: 'prod',
      deployTime: Date.now(),
      deployer: 'user1',
      avatarBg: 'red',
      deployOrder: 2,
    },
  ];

  const mockHandleBatchOperation = vi.fn().mockResolvedValue(undefined);
  const mockHandleOperation = vi.fn().mockResolvedValue(undefined);
  const mockSetData = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle batch deploy operation correctly', async () => {
    const { result } = renderHook(() =>
      useBatchConfirm({
        dataSource: mockTasks,
        selectedRowKeys: ['1', '2'],
        setData: mockSetData,
        handleBatchOperation: mockHandleBatchOperation,
        handleOperation: mockHandleOperation,
        onClose: mockOnClose,
      })
    );

    await act(async () => {
      await result.current.confirmBatchOperation(OperationType.DEPLOY);
    });

    expect(mockSetData).toHaveBeenCalled();
    expect(mockHandleBatchOperation).toHaveBeenCalledWith(
      OperationType.DEPLOY,
      expect.any(Array),
      mockHandleOperation
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show warning when no eligible tasks for batch deploy', async () => {
    const { Toast } = await import('@douyinfe/semi-ui');
    const tasksWithoutOrder = mockTasks.map(t => ({ ...t, deployOrder: undefined }));
    
    const { result } = renderHook(() =>
      useBatchConfirm({
        dataSource: tasksWithoutOrder,
        selectedRowKeys: ['1'],
        setData: mockSetData,
        handleBatchOperation: mockHandleBatchOperation,
        handleOperation: mockHandleOperation,
        onClose: mockOnClose,
      })
    );

    await act(async () => {
      await result.current.confirmBatchOperation(OperationType.DEPLOY);
    });

    expect(Toast.warning).toHaveBeenCalledWith('请选择有部署顺序的待部署任务');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle other batch operations correctly', async () => {
    const { result } = renderHook(() =>
      useBatchConfirm({
        dataSource: mockTasks,
        selectedRowKeys: ['1'],
        setData: mockSetData,
        handleBatchOperation: mockHandleBatchOperation,
        handleOperation: mockHandleOperation,
        onClose: mockOnClose,
      })
    );

    await act(async () => {
      await result.current.confirmBatchOperation(OperationType.WHITELIST);
    });

    expect(mockHandleBatchOperation).toHaveBeenCalledWith(
      OperationType.WHITELIST,
      mockTasks,
      mockHandleOperation
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should expand newly created group when setExpandedGroupKeys is provided', async () => {
    const mockSetExpandedGroupKeys = vi.fn();
    
    const { result } = renderHook(() =>
      useBatchConfirm({
        dataSource: mockTasks,
        selectedRowKeys: ['1', '2'],
        setData: mockSetData,
        handleBatchOperation: mockHandleBatchOperation,
        handleOperation: mockHandleOperation,
        onClose: mockOnClose,
        setExpandedGroupKeys: mockSetExpandedGroupKeys,
      })
    );

    await act(async () => {
      await result.current.confirmBatchOperation(OperationType.DEPLOY);
    });

    // 验证新分组被展开
    expect(mockSetExpandedGroupKeys).toHaveBeenCalled();
    
    // 验证调用参数是一个函数，该函数会将新分组key添加到现有keys中
    const callArgs = mockSetExpandedGroupKeys.mock.calls[0][0];
    expect(typeof callArgs).toBe('function');
    
    // 测试函数逻辑：传入空数组，应该返回包含新groupKey的数组
    const prevKeys: string[] = [];
    const newKeys = callArgs(prevKeys);
    expect(Array.isArray(newKeys)).toBe(true);
    expect(newKeys.length).toBe(1);
  });
});

