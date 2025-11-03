import React, { useState } from 'react';
import { Tag, Popover, Button, Toast } from '@douyinfe/semi-ui';
import { IconInfoCircle, IconCopy } from '@douyinfe/semi-icons';
import { DeploymentStatus, STATUS_CONFIG } from '../constants/deploymentStatus';
import * as dateFns from 'date-fns';
import styles from './StatusTag.module.css';

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
    <div className={styles.errorPopover}>
      <div className={styles.errorPopoverHeader}>
        <IconInfoCircle className={styles.errorIcon} />
        <span>部署失败信息</span>
      </div>
      
      <div className={styles.errorPopoverContent}>
        {errorMessage}
      </div>
      
      <div className={styles.errorPopoverFooter}>
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
            <span className={styles.errorTime}>
              {dateFns.format(new Date(errorTime), 'yyyy-MM-dd HH:mm:ss')}
            </span>
          )}
      </div>
    </div>
  ) : null;
  
  // 获取状态样式类名（将 PENDING_DEPLOYMENT -> pending, DEPLOYMENT_FAILED -> failed）
  const getStatusClassName = (status: DeploymentStatus): string => {
    const statusMap: Record<DeploymentStatus, string> = {
      [DeploymentStatus.PENDING]: 'pending',
      [DeploymentStatus.APPROVING]: 'approving',
      [DeploymentStatus.DEPLOYING]: 'deploying',
      [DeploymentStatus.DEPLOYED]: 'deployed',
      [DeploymentStatus.DEPLOYMENT_FAILED]: 'failed',
      [DeploymentStatus.ROLLING_BACK]: 'rollingBack',
      [DeploymentStatus.ENDED]: 'ended',
    };
    return statusMap[status] || 'pending';
  };
  
  return (
    <div className={styles.statusTagContainer}>
      <Tag 
        color={config.color as any} 
        className={`${styles.statusTag} ${styles[getStatusClassName(status)] || ''} ${className || ''}`}
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
          className={styles.errorPopoverWrapper}
        >
          <span
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className={styles.errorInfoIcon}
            title="查看错误信息"
          >
            <IconInfoCircle size="small" />
          </span>
        </Popover>
      )}
    </div>
  );
};
