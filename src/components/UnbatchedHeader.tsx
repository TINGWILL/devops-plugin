import React from 'react';
import { IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons';

interface UnbatchedHeaderProps {
  isExpanded: boolean;
  taskCount: number;
  onToggleExpand: () => void;
  colSpan: number;
  fixedColumnWidth?: number; // 固定列的宽度（选择列 + 应用名称列）
}

/**
 * 无批次区域头部组件
 * 当有批次存在时，无批次任务独占一个区域
 */
export const UnbatchedHeader: React.FC<UnbatchedHeaderProps> = ({
  isExpanded,
  taskCount,
  onToggleExpand,
  colSpan,
  fixedColumnWidth = 250 // 默认：选择列50px + 应用名称列200px
}) => {
  return (
    <tr 
      className="batch-header-row"
      style={{
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        userSelect: 'none',
        borderTop: '2px solid #e8e8e8', // 区域分隔线，加粗以区分批次区域
        height: '44px',
        minHeight: '44px',
        maxHeight: '44px',
      }}
      onMouseEnter={(e) => {
        // 确保hover时保持白色背景
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#ffffff';
      }}
      onMouseLeave={(e) => {
        // 确保hover离开时保持白色背景
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#ffffff';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand();
      }}
    >
      {/* 固定列部分（无批次信息） */}
      <td
        className="batch-header-cell"
        style={{
          padding: '8px 16px',
          borderLeft: '1px solid #e8e8e8',
          borderRight: '1px solid #e8e8e8',
          borderBottom: '1px solid #e8e8e8',
          borderTop: 'none',
          position: 'sticky',
          left: 0,
          width: `${fixedColumnWidth}px`,
          minWidth: `${fixedColumnWidth}px`,
          maxWidth: `${fixedColumnWidth}px`,
          zIndex: 11,
          backgroundColor: '#ffffff',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          height: '44px',
          minHeight: '44px',
          maxHeight: '44px',
          boxSizing: 'border-box',
          verticalAlign: 'middle'
        }}
        onMouseEnter={(e) => {
          // 确保hover时保持白色背景
          (e.currentTarget as HTMLTableCellElement).style.backgroundColor = '#ffffff';
        }}
        onMouseLeave={(e) => {
          // 确保hover离开时保持白色背景
          (e.currentTarget as HTMLTableCellElement).style.backgroundColor = '#ffffff';
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap' // 确保不换行
        }}>
          {/* 展开/收起图标 */}
          <div style={{ 
            marginRight: '8px', 
            display: 'flex', 
            alignItems: 'center',
            color: '#666',
            fontSize: '12px',
            width: '20px',
            flexShrink: 0
          }}>
            {isExpanded ? (
              <IconChevronDown size="small" />
            ) : (
              <IconChevronRight size="small" />
            )}
          </div>

          {/* 无批次标签（白色背景，黑色文字） */}
          <div
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '2px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontSize: '14px',
              fontWeight: 400,
              marginRight: '8px',
              border: '1px solid #e8e8e8',
              flexShrink: 0
            }}
          >
            无批次
          </div>

          {/* 数量（灰色显示） */}
          <div style={{ 
            fontWeight: 400,
            color: '#8c8c8c', // 灰色
            fontSize: '14px',
            flexShrink: 0
          }}>
            共{taskCount}个
          </div>
        </div>
      </td>
      
      {/* 可滚动部分（空白区域，与表格其他列对齐） */}
      <td
        colSpan={colSpan - 1}
        style={{
          padding: '8px 16px',
          borderRight: '1px solid #e8e8e8',
          borderBottom: '1px solid #e8e8e8',
          borderTop: 'none',
          height: '44px',
          minHeight: '44px',
          maxHeight: '44px',
          boxSizing: 'border-box',
          verticalAlign: 'middle'
        }}
      >
        {/* 空白内容，保持与表格其他列对齐 */}
      </td>
    </tr>
  );
};

