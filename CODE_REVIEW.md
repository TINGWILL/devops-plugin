# 代码审查和优化建议

## 一、核心问题分析

### 1. 复选框功能失效问题
**问题**：
- DOM操作（`updateCheckboxCells`、`clearHeaderSelectionColumn`）直接操作了Semi Design生成的DOM
- 表头复选框被CSS和DOM操作完全隐藏/删除
- 数据行复选框的自定义容器可能干扰了原始事件处理

**根本原因**：
- 过度使用DOM操作替代React状态管理
- CSS规则过于激进，隐藏了整个表头选择列

### 2. 代码结构问题
- `App.tsx` 文件过大（2097行），违反单一职责原则
- 大量DOM操作逻辑（600+行），应该用React方式实现
- 缺少自定义Hook来管理表格相关逻辑

### 3. 性能问题
- 多个`useEffect`频繁执行DOM操作
- `MutationObserver`监听整个表格容器，可能导致性能问题
- 缺少必要的`useMemo`和`useCallback`优化

## 二、优化方案

### 方案1：修复复选框功能（优先）

#### 1.1 使用rowSelection的renderCell自定义复选框显示
```typescript
const rowSelection = useMemo(
    () => ({
        fixed: true,
        selectedRowKeys,
        renderCell: (checked: boolean, record: DataItem, index: number) => {
            // 分组行不显示复选框
            if ('groupKey' in record && record.groupKey) {
                return null;
            }
            
            // 数据行：显示复选框或顺序编号
            const order = taskOrderMap.get(record.key);
            const isSelected = selectedRowKeys.includes(record.key);
            
            if (isSelected && order) {
                // 选中且有顺序：显示顺序编号，hover时显示复选框
                return (
                    <div className="batch-checkbox-cell">
                        <span className="batch-order-number">{order}</span>
                        <span className="batch-checkbox-hover" style={{ display: 'none' }}>
                            <input 
                                type="checkbox" 
                                checked={checked}
                                onChange={(e) => {
                                    // 处理复选框变化
                                }}
                            />
                        </span>
                    </div>
                );
            }
            
            // 未选中：显示默认复选框
            return undefined; // 使用Semi Design默认渲染
        },
        onChange: (newSelectedRowKeys: string[]) => {
            // 处理选择变化
        },
        getCheckboxProps: (record: DataItem) => ({
            disabled: !!('groupKey' in record && record.groupKey),
        }),
    }),
    [selectedRowKeys, taskOrderMap, reorderSelectedTasks]
);
```

#### 1.2 简化CSS，只隐藏3个点
```css
/* 只隐藏表头的下拉按钮（3个点） */
.semi-table-thead .semi-table-selection-wrap .semi-dropdown,
.semi-table-thead .semi-table-selection-wrap button:not(.semi-checkbox):not([type="checkbox"]) {
    display: none !important;
}

/* 确保复选框可见 */
.semi-table-thead .semi-table-selection-column .semi-checkbox,
.semi-table-thead .semi-table-selection-column input[type="checkbox"],
.semi-table-tbody .semi-table-selection-column .semi-checkbox,
.semi-table-tbody .semi-table-selection-column input[type="checkbox"] {
    pointer-events: auto !important;
    cursor: pointer !important;
}
```

#### 1.3 移除复杂的DOM操作useEffect
- 移除`clearHeaderSelectionColumn`相关的useEffect
- 移除或简化`updateCheckboxCells`，使用renderCell替代

### 方案2：代码结构优化

#### 2.1 创建表格管理Hook
提取到 `src/hooks/useTableManagement.ts`:
- 表格数据源管理（tableDataSource）
- 分组逻辑（groupMap, expandedRows）
- 分组头部渲染（renderGroupSection）

#### 2.2 创建复选框管理Hook  
提取到 `src/hooks/useCheckboxDisplay.ts`:
- 复选框显示逻辑
- 顺序编号管理
- rowSelection配置

#### 2.3 提取常量
- MOCK_APPS 移到 `src/constants/apps.ts`
- 批次颜色配置移到 `src/constants/batchColors.ts`

### 方案3：性能优化

#### 3.1 使用useMemo缓存计算结果
- `tableDataSource` ✓ (已有)
- `groupMap` ✓ (已有)
- `columns` ✓ (已有)
- `taskOrderMap` ✓ (已有)

#### 3.2 使用useCallback优化事件处理
- 所有事件处理函数
- 回调函数

#### 3.3 减少DOM操作
- 移除所有直接DOM操作
- 使用CSS和React状态管理

## 三、实施优先级

### P0 - 立即修复
1. ✅ 修复复选框功能（表头和数据行）
2. ✅ 简化CSS规则，只隐藏3个点
3. ✅ 移除破坏复选框的DOM操作

### P1 - 高优先级
1. 提取表格管理逻辑到Hook
2. 优化DOM操作逻辑
3. 完善类型定义

### P2 - 中优先级  
1. 代码结构重构
2. 性能优化
3. 代码注释完善

## 四、具体修复步骤

1. 修复rowSelection配置，使用renderCell自定义复选框显示
2. 简化CSS，只隐藏3个点下拉按钮
3. 移除clearHeaderSelectionColumn相关的useEffect
4. 优化updateCheckboxCells，或移除后使用renderCell替代
5. 测试复选框功能完整性

