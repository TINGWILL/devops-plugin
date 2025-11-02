import React, { useState } from 'react';
import { Tag, Popover, Button, Toast } from '@douyinfe/semi-ui';
import { IconInfoCircle, IconCopy } from '@douyinfe/semi-icons';
import { DeploymentStatus, STATUS_CONFIG } from '../constants/deploymentStatus';
import * as dateFns from 'date-fns';

interface StatusTagProps {
  status: DeploymentStatus;
  className?: string;
  errorMessage?: string; // 错误信息
  errorTime?: number; // 错误发生时间
  isDarkMode?: boolean; // 是否暗色模式
}

/**
 * 状态标签组件
 * 根据部署状态显示相应的颜色标签
 * 部署失败时显示错误信息气泡卡片
 */
export const StatusTag: React.FC<StatusTagProps> = ({ 
  status, 
  className,
  errorMessage,
  errorTime,
  isDarkMode = false
}) => {
  const config = STATUS_CONFIG[status] || { color: 'grey' };
  const isFailed = status === DeploymentStatus.DEPLOYMENT_FAILED;
  const [visible, setVisible] = useState(false);
  
  // 气泡卡片内容
  const errorContent = errorMessage ? (
    <div style={{
      width: '360px',
      padding: '0',
    }}>
      <div style={{
        padding: '16px',
        backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: 600,
          color: isDarkMode ? '#ffffff' : '#262626',
        }}>
          <IconInfoCircle style={{ color: '#ff4d4f', fontSize: '16px' }} />
          <span>部署失败信息</span>
        </div>
        
        <div style={{
          backgroundColor: isDarkMode ? '#262626' : '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '12px',
          border: `1px solid ${isDarkMode ? '#434343' : '#e8e8e8'}`,
        }}>
          <div style={{
            fontSize: '13px',
            color: isDarkMode ? '#ffffff' : '#595959',
            lineHeight: '20px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {errorMessage}
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Button
            size="small"
            icon={<IconCopy />}
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();
              
              console.log('复制按钮被点击，开始复制错误信息');
              
              // 优先使用 execCommand（兼容性更好，不受权限策略限制）
              try {
                const textArea = document.createElement('textarea');
                textArea.value = errorMessage || '';
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                textArea.style.opacity = '0';
                textArea.setAttribute('readonly', '');
                document.body.appendChild(textArea);
                
                // 兼容 iOS Safari
                if (navigator.userAgent.match(/ipad|iphone/i)) {
                  const range = document.createRange();
                  range.selectNodeContents(textArea);
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  textArea.setSelectionRange(0, 999999);
                } else {
                  textArea.select();
                }
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                console.log('execCommand 复制结果:', successful);
                
                if (successful) {
                  // 使用 setTimeout 确保 Toast 在下一个事件循环中执行，避免被 Popover 事件阻止
                  setTimeout(() => {
                    console.log('显示成功提示');
                    // 优先使用飞书 SDK Toast（在飞书环境中更可靠）
                    if (window.JSSDK?.toast?.success) {
                      window.JSSDK.toast.success('错误信息已复制到剪贴板');
                    } else {
                      // 降级到 Semi-UI Toast
                      Toast.success('错误信息已复制到剪贴板');
                    }
                  }, 0);
                  // 延迟关闭气泡，让用户看到提示
                  setTimeout(() => {
                    setVisible(false);
                  }, 1500);
                } else {
                  // 降级方案：如果 execCommand 失败，尝试 Clipboard API
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    try {
                      await navigator.clipboard.writeText(errorMessage || '');
                      console.log('Clipboard API 复制成功');
                      setTimeout(() => {
                        if (window.JSSDK?.toast?.success) {
                          window.JSSDK.toast.success('错误信息已复制到剪贴板');
                        } else {
                          Toast.success('错误信息已复制到剪贴板');
                        }
                      }, 0);
                      setTimeout(() => {
                        setVisible(false);
                      }, 1500);
                    } catch (clipboardError) {
                      console.error('Clipboard API 复制失败:', clipboardError);
                      setTimeout(() => {
                        if (window.JSSDK?.toast?.error) {
                          window.JSSDK.toast.error('复制失败，请手动复制');
                        } else {
                          Toast.error('复制失败，请手动复制');
                        }
                      }, 0);
                    }
                  } else {
                    console.log('Clipboard API 不可用');
                    setTimeout(() => {
                      Toast.error('复制失败，请手动复制');
                    }, 0);
                  }
                }
              } catch (error) {
                console.error('复制失败:', error);
                // 最后尝试 Clipboard API
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  try {
                    await navigator.clipboard.writeText(errorMessage || '');
                    setTimeout(() => {
                      Toast.success('错误信息已复制到剪贴板');
                    }, 0);
                    setTimeout(() => {
                      setVisible(false);
                    }, 1500);
                  } catch (clipboardError) {
                    setTimeout(() => {
                      Toast.error('复制失败，请手动复制');
                    }, 0);
                  }
                } else {
                  setTimeout(() => {
                    Toast.error('复制失败，请手动复制');
                  }, 0);
                }
              }
            }}
          >
            复制错误信息
          </Button>
          {errorTime && (
            <span style={{
              fontSize: '12px',
              color: isDarkMode ? '#8c8c8c' : '#8c8c8c',
            }}>
              {dateFns.format(new Date(errorTime), 'yyyy-MM-dd HH:mm:ss')}
            </span>
          )}
        </div>
      </div>
    </div>
  ) : null;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Tag 
        color={config.color as any} 
        className={`semi-tag-${config.color} ${className || ''}`}
      >
        {status}
      </Tag>
      {isFailed && errorMessage && (
        <Popover
          visible={visible}
          onVisibleChange={setVisible}
          content={errorContent}
          trigger="click"
          position="bottomLeft"
          showArrow
          style={{
            padding: '0',
          }}
        >
          <span
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: visible ? '#1890ff' : '#8c8c8c',
              fontSize: '14px',
              transition: 'color 0.2s',
            }}
            title="查看错误信息"
          >
            <IconInfoCircle size="small" />
          </span>
        </Popover>
      )}
    </div>
  );
};
