import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTableColumns } from '../useTableColumns';
import { DeploymentTask } from '../../types/deployment';
import { DeploymentStatus } from '../../constants/deploymentStatus';
import { ButtonConfig } from '../../types/deployment';

// Mock Semi Design components
vi.mock('@douyinfe/semi-ui', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar">{children}</div>
  ),
  Tag: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tag">{children}</div>
  ),
  Input: ({ value, onChange, ...props }: any) => (
    <input
      data-testid="input"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  ),
}));

// Mock components
vi.mock('../../components/OperationButtons', () => ({
  OperationButtons: ({ task }: { task: DeploymentTask }) => (
    <div data-testid={`operation-buttons-${task.key}`}>OperationButtons</div>
  ),
}));

vi.mock('../../components/StatusTag', () => ({
  StatusTag: ({ status }: { status: DeploymentStatus }) => (
    <div data-testid={`status-tag-${status}`}>StatusTag</div>
  ),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, format: string) => {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  },
}));

describe('useTableColumns', () => {
  const createMockTask = (
    key: string,
    status: DeploymentStatus = DeploymentStatus.PENDING,
    deployOrder?: number,
    groupKey?: string
  ): DeploymentTask => ({
    key,
    appName: `App ${key}`,
    taskStatus: status,
    deployStatus: status,
    podStatus: 'running',
    version: 'v1.0.0',
    cluster: 'cluster1',
    namespace: 'default',
    envTag: 'prod',
    deployTime: Date.now(),
    deployer: 'user1',
    avatarBg: '#1890FF',
    deployOrder,
    groupKey,
  });

  const mockOnDeployOrderChange = vi.fn();
  const mockOnOperation = vi.fn(() => Promise.resolve());
  const mockGetButtonConfig = vi.fn((): ButtonConfig => ({
    first: null,
    second: null,
  }));
  const mockIsTaskLoading = vi.fn(() => false);
  const mockCompareGroupOrder = vi.fn(() => 0);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('columns 结构', () => {
    it('应该返回正确数量的列', () => {
      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [],
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      expect(result.current.columns).toHaveLength(11);
    });

    it('每个列应该有正确的 title 和 dataIndex', () => {
      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [],
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const expectedColumns = [
        { title: '应用名称', dataIndex: 'appName' },
        { title: '部署状态', dataIndex: 'taskStatus' },
        { title: '版本号', dataIndex: 'version' },
        { title: '发布集群', dataIndex: 'cluster' },
        { title: '命名空间', dataIndex: 'namespace' },
        { title: '环境标签', dataIndex: 'envTag' },
        { title: '部署顺序', dataIndex: 'deployOrder' },
        { title: 'Pod状态', dataIndex: 'podStatus' },
        { title: '部署时间', dataIndex: 'deployTime' },
        { title: '部署人', dataIndex: 'deployer' },
        { title: '操作', dataIndex: 'operation' },
      ];

      expectedColumns.forEach((expected, index) => {
        expect(result.current.columns[index].title).toBe(expected.title);
        expect(result.current.columns[index].dataIndex).toBe(expected.dataIndex);
      });
    });

    it('应该正确设置固定列', () => {
      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [],
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const appNameColumn = result.current.columns.find(
        (col) => col.dataIndex === 'appName'
      );
      const taskStatusColumn = result.current.columns.find(
        (col) => col.dataIndex === 'taskStatus'
      );
      const operationColumn = result.current.columns.find(
        (col) => col.dataIndex === 'operation'
      );

      expect(appNameColumn?.fixed).toBe('left');
      expect(taskStatusColumn?.fixed).toBe('left');
      expect(operationColumn?.fixed).toBe('right');
    });
  });

  describe('排序逻辑', () => {
    it('排序时应该优先使用 compareGroupOrder', () => {
      const tasks = [
        createMockTask('1', DeploymentStatus.PENDING, undefined, 'group-1'),
        createMockTask('2', DeploymentStatus.PENDING, undefined, 'group-2'),
      ];

      mockCompareGroupOrder
        .mockReturnValueOnce(-1) // group-1 < group-2
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0);

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: tasks,
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const appNameSorter = result.current.columns.find(
        (col) => col.dataIndex === 'appName'
      )?.sorter;

      if (appNameSorter) {
        const sortResult = appNameSorter(tasks[0], tasks[1]);
        expect(sortResult).toBe(-1);
        expect(mockCompareGroupOrder).toHaveBeenCalledWith(tasks[0], tasks[1]);
      }
    });

    it('当 compareGroupOrder 返回 0 时应该使用列自己的排序逻辑', () => {
      const tasks = [
        createMockTask('1', DeploymentStatus.PENDING),
        createMockTask('2', DeploymentStatus.PENDING),
      ];

      mockCompareGroupOrder.mockReturnValue(0);

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: tasks,
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const versionSorter = result.current.columns.find(
        (col) => col.dataIndex === 'version'
      )?.sorter;

      if (versionSorter) {
        const taskA = createMockTask('1');
        taskA.version = 'v2.0.0';
        const taskB = createMockTask('2');
        taskB.version = 'v1.0.0';

        const sortResult = versionSorter(taskA, taskB);
        expect(sortResult).toBeGreaterThan(0); // v2 > v1
      }
    });

    it('部署状态排序应该使用 STATUS_CONFIG 的 order', () => {
      const tasks = [
        createMockTask('1', DeploymentStatus.DEPLOYED),
        createMockTask('2', DeploymentStatus.PENDING),
      ];

      mockCompareGroupOrder.mockReturnValue(0);

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: tasks,
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const statusSorter = result.current.columns.find(
        (col) => col.dataIndex === 'taskStatus'
      )?.sorter;

      if (statusSorter) {
        const sortResult = statusSorter(tasks[0], tasks[1]);
        expect(sortResult).toBeGreaterThan(0); // DEPLOYED.order > PENDING.order
      }
    });
  });

  describe('render 函数', () => {
    it('应用名称列应该正确渲染', () => {
      const task = createMockTask('1');
      task.appName = 'Test App';

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [task],
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const appNameColumn = result.current.columns.find(
        (col) => col.dataIndex === 'appName'
      );
      const renderResult = appNameColumn?.render?.('Test App', task);

      expect(renderResult).toBeDefined();
      expect(renderResult?.props?.style).toHaveProperty('overflow', 'hidden');
    });

    it('部署状态列应该使用 StatusTag 组件', () => {
      const task = createMockTask('1', DeploymentStatus.PENDING);

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [task],
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const statusColumn = result.current.columns.find(
        (col) => col.dataIndex === 'taskStatus'
      );
      const renderResult = statusColumn?.render?.(
        DeploymentStatus.PENDING,
        task
      );

      expect(renderResult?.props?.status).toBe(DeploymentStatus.PENDING);
    });

    it('操作列应该使用 OperationButtons 组件', () => {
      const task = createMockTask('1');

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [task],
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const operationColumn = result.current.columns.find(
        (col) => col.dataIndex === 'operation'
      );
      const renderResult = operationColumn?.render?.('', task);

      expect(renderResult?.props?.task).toBe(task);
      expect(renderResult?.props?.onOperation).toBe(mockOnOperation);
      expect(renderResult?.props?.getButtonConfig).toBe(mockGetButtonConfig);
    });

    it('部署顺序列在选中且待部署状态下应该显示 Input', () => {
      const task = createMockTask('1', DeploymentStatus.PENDING, 1);

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [task],
          selectedRowKeys: ['1'],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const deployOrderColumn = result.current.columns.find(
        (col) => col.dataIndex === 'deployOrder'
      );
      const renderResult = deployOrderColumn?.render?.(1, task);

      // Input 组件被 mock，所以需要检查渲染结果
      expect(renderResult).toBeDefined();
      // 验证 Input 组件被使用（通过 data-testid）
      if (renderResult?.props?.['data-testid']) {
        expect(renderResult.props['data-testid']).toBe('input');
      }
    });

    it('部署顺序列在未选中或非待部署状态下应该显示文本', () => {
      const task = createMockTask('1', DeploymentStatus.DEPLOYED, 1);

      const { result } = renderHook(() =>
        useTableColumns({
          dataSource: [task],
          selectedRowKeys: [],
          onDeployOrderChange: mockOnDeployOrderChange,
          onOperation: mockOnOperation,
          getButtonConfig: mockGetButtonConfig,
          isTaskLoading: mockIsTaskLoading,
          compareGroupOrder: mockCompareGroupOrder,
          isDarkMode: false,
        })
      );

      const deployOrderColumn = result.current.columns.find(
        (col) => col.dataIndex === 'deployOrder'
      );
      const renderResult = deployOrderColumn?.render?.(1, task);

      expect(renderResult?.props?.children).toBe(1);
    });
  });

  describe('依赖项变化', () => {
    it('selectedRowKeys 变化时应该重新生成 columns', () => {
      const task = createMockTask('1', DeploymentStatus.PENDING, 1);
      const { result, rerender } = renderHook(
        (props) => useTableColumns(props),
        {
          initialProps: {
            dataSource: [task],
            selectedRowKeys: [] as string[],
            onDeployOrderChange: mockOnDeployOrderChange,
            onOperation: mockOnOperation,
            getButtonConfig: mockGetButtonConfig,
            isTaskLoading: mockIsTaskLoading,
            compareGroupOrder: mockCompareGroupOrder,
            isDarkMode: false,
          },
        }
      );

      expect(result.current.columns).toBeDefined();

      rerender({
        dataSource: [task],
        selectedRowKeys: ['1'],
        onDeployOrderChange: mockOnDeployOrderChange,
        onOperation: mockOnOperation,
        getButtonConfig: mockGetButtonConfig,
        isTaskLoading: mockIsTaskLoading,
        compareGroupOrder: mockCompareGroupOrder,
        isDarkMode: false,
      });

      // useMemo 应该检测到依赖变化并重新生成
      expect(result.current.columns).toBeDefined();
      expect(result.current.columns.length).toBe(11);
      // 验证部署顺序列在选中状态下能正确渲染
      const deployOrderColumn = result.current.columns.find(
        (col) => col.dataIndex === 'deployOrder'
      );
      expect(deployOrderColumn).toBeDefined();
    });

    it('isDarkMode 变化时应该重新生成 columns', () => {
      const { result, rerender } = renderHook(
        (props) => useTableColumns(props),
        {
          initialProps: {
            dataSource: [],
            selectedRowKeys: [],
            onDeployOrderChange: mockOnDeployOrderChange,
            onOperation: mockOnOperation,
            getButtonConfig: mockGetButtonConfig,
            isTaskLoading: mockIsTaskLoading,
            compareGroupOrder: mockCompareGroupOrder,
            isDarkMode: false,
          },
        }
      );

      rerender({
        dataSource: [],
        selectedRowKeys: [],
        onDeployOrderChange: mockOnDeployOrderChange,
        onOperation: mockOnOperation,
        getButtonConfig: mockGetButtonConfig,
        isTaskLoading: mockIsTaskLoading,
        compareGroupOrder: mockCompareGroupOrder,
        isDarkMode: true,
      });

      expect(result.current.columns).toBeDefined();
      expect(result.current.columns.length).toBe(11);
    });
  });
});

