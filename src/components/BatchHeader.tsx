import React from 'react';
import { IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons';
import { BatchInfo } from '../utils/batchUtils';

interface BatchHeaderProps {
  batch: BatchInfo;
  isExpanded: boolean;
  isSelected?: boolean;
  onToggleExpand: () => void;
  onSelect?: () => void;
  colSpan: number; // 横跨的列数（包括选择列）
  fixedColumnWidth?: number; // 固定列的宽度（选择列 + 应用名称列）
}

// 批次颜色配置（循环使用）
const BATCH_COLORS = [
  { bg: '#ff4d4f', text: '#ffffff', name: '红色' },      // 致命/红色
  { bg: '#722ed1', text: '#ffffff', name: '紫色' },      // 严重/紫色
  { bg: '#faad14', text: '#ffffff', name: '黄色' },      // 一般/黄色
  { bg: '#1890ff', text: '#ffffff', name: '蓝色' },      // 细微/蓝色
  { bg: '#ffffff', text: '#000000', name: '白色' },      // 空值/白色
];

/**
 * 获取批次颜色
 */
function getBatchColor(batchNumber: number) {
  return BATCH_COLORS[(batchNumber - 1) % BATCH_COLORS.length];
}

/**
 * 批次头部组件
 * 按照图片样式：作为完整的表格行（tr），横跨所有列
 * 批次标签有颜色标注，数量灰色显示
 */
export const BatchHeader: React.FC<BatchHeaderProps> = ({
  batch,
  isExpanded,
  isSelected = false,
  onToggleExpand,
  onSelect,
  colSpan,
  fixedColumnWidth = 250 // 默认：选择列50px + 应用名称列200px
}) => {
  const taskCount = batch.tasks.length;
  const batchTitle = `批次 #${batch.batchNumber}`;
  const batchColor = getBatchColor(batch.batchNumber);
  
  return (
    <tr 
      className="batch-header-row"
      style={{
        backgroundColor: '#ffffff', // 强制白色背景，不使用变量
        cursor: 'pointer',
        userSelect: 'none',
        borderTop: '2px solid #e8e8e8', // 批次区域分隔线，加粗以区分批次区域
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
        if (onSelect) {
          onSelect();
        }
        onToggleExpand();
      }}
    >
      {/* 固定列部分（批次信息） */}
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
          backgroundColor: '#ffffff', // 强制白色背景
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

          {/* 批次标签（带颜色） */}
          <div
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '2px',
              backgroundColor: batchColor.bg,
              color: batchColor.text,
              fontSize: '14px',
              fontWeight: 400,
              marginRight: '8px',
              flexShrink: 0
            }}
          >
            {batchTitle}
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

