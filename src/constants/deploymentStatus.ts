/**
 * 部署状态常量定义
 * 根据流程图重新定义状态和操作逻辑
 */

import { ButtonConfig } from '../types/deployment';

// 部署状态枚举
export enum DeploymentStatus {
  PENDING = '待部署',
  APPROVING = '审批中', 
  DEPLOYING = '部署中',
  DEPLOYED = '部署完成',
  DEPLOYMENT_FAILED = '部署失败',
  ROLLING_BACK = '回滚中',
  DEPLOYMENT_ENDED = '部署结束'
}

// 状态配置
export const STATUS_CONFIG = {
  [DeploymentStatus.PENDING]: { 
    color: 'grey', 
    order: 1,
    description: '初始状态，可以执行部署操作'
  },
  [DeploymentStatus.APPROVING]: { 
    color: 'blue', 
    order: 2,
    description: '等待审批，所有操作按钮被禁用'
  },
  [DeploymentStatus.DEPLOYING]: { 
    color: 'blue', 
    order: 3,
    description: '正在部署，所有操作按钮被禁用'
  },
  [DeploymentStatus.DEPLOYED]: { 
    color: 'blue', 
    order: 4,
    description: '部署成功，等待验证'
  },
  [DeploymentStatus.DEPLOYMENT_FAILED]: { 
    color: 'red', 
    order: 5,
    description: '部署失败，可以回滚或运维介入'
  },
  [DeploymentStatus.ROLLING_BACK]: { 
    color: 'orange', 
    order: 6,
    description: '正在回滚，可以运维介入'
  },
  [DeploymentStatus.DEPLOYMENT_ENDED]: { 
    color: 'green', 
    order: 7,
    description: '部署结束，所有操作按钮被禁用'
  }
};

// 操作按钮类型
export enum OperationType {
  DEPLOY = 'deploy',
  WHITELIST = 'whitelist', 
  VERIFY_PASS = 'verify_pass',
  ROLLBACK = 'rollback',
  OPS_INTERVENTION = 'ops_intervention',
  DELETE = 'delete'
}

// 状态流转规则
export const STATUS_TRANSITIONS = {
  [DeploymentStatus.PENDING]: [
    { action: OperationType.DEPLOY, target: DeploymentStatus.DEPLOYING },
    { action: OperationType.WHITELIST, target: DeploymentStatus.APPROVING }
  ],
  [DeploymentStatus.APPROVING]: [
    { action: 'approve', target: DeploymentStatus.PENDING },
    { action: 'reject', target: DeploymentStatus.PENDING }
  ],
  [DeploymentStatus.DEPLOYING]: [
    { action: 'success', target: DeploymentStatus.DEPLOYED },
    { action: 'failed', target: DeploymentStatus.DEPLOYMENT_FAILED }
  ],
  [DeploymentStatus.DEPLOYED]: [
    { action: OperationType.VERIFY_PASS, target: DeploymentStatus.DEPLOYMENT_ENDED },
    { action: 'verify_failed', target: DeploymentStatus.DEPLOYMENT_FAILED }
  ],
  [DeploymentStatus.DEPLOYMENT_FAILED]: [
    { action: OperationType.ROLLBACK, target: DeploymentStatus.ROLLING_BACK },
    { action: OperationType.OPS_INTERVENTION, target: DeploymentStatus.DEPLOYMENT_ENDED }
  ],
  [DeploymentStatus.ROLLING_BACK]: [
    { action: 'success', target: DeploymentStatus.DEPLOYMENT_ENDED },
    { action: OperationType.OPS_INTERVENTION, target: DeploymentStatus.DEPLOYMENT_ENDED }
  ]
};

// 根据状态获取按钮配置
export const getButtonConfig = (status: DeploymentStatus): ButtonConfig => {
  const configs = {
    [DeploymentStatus.PENDING]: {
      first: { 
        text: '开始部署', 
        action: OperationType.DEPLOY, 
        enabled: true,
        type: 'primary' as const
      },
      second: { 
        text: '···', 
        action: OperationType.WHITELIST, 
        enabled: true,
        type: 'primary' as const,
        items: [
          { key: OperationType.WHITELIST, text: '申请加白', enabled: true },
          { key: OperationType.DELETE, text: '删除', enabled: true }
        ]
      }
    },
    [DeploymentStatus.APPROVING]: {
      first: { 
        text: '开始部署', 
        action: OperationType.DEPLOY, 
        enabled: false,
        type: 'primary' as const
      },
      second: { 
        text: '···', 
        action: OperationType.DELETE, 
        enabled: false,
        type: 'primary' as const,
        items: [
          { key: OperationType.DELETE, text: '删除', enabled: false }
        ]
      }
    },
    [DeploymentStatus.DEPLOYING]: {
      first: { 
        text: '开始部署', 
        action: OperationType.DEPLOY, 
        enabled: false,
        type: 'primary' as const
      },
      second: { 
        text: '···', 
        action: OperationType.DELETE, 
        enabled: false,
        type: 'primary' as const,
        items: [
          { key: OperationType.DELETE, text: '删除', enabled: false }
        ]
      }
    },
    [DeploymentStatus.DEPLOYED]: {
      first: { 
        text: '验证通过', 
        action: OperationType.VERIFY_PASS, 
        enabled: true,
        type: 'primary' as const
      },
      second: { 
        text: '···', 
        action: OperationType.DELETE, 
        enabled: true,
        type: 'primary' as const,
        items: [
          { key: OperationType.DELETE, text: '删除', enabled: true }
        ]
      }
    },
    [DeploymentStatus.DEPLOYMENT_FAILED]: {
      first: { 
        text: '开始回滚', 
        action: OperationType.ROLLBACK, 
        enabled: true,
        type: 'primary' as const
      },
      second: { 
        text: '···', 
        action: OperationType.OPS_INTERVENTION, 
        enabled: true,
        type: 'primary' as const,
        items: [
          { key: OperationType.OPS_INTERVENTION, text: '运维介入', enabled: true },
          { key: OperationType.DELETE, text: '删除', enabled: false }
        ]
      }
    },
    [DeploymentStatus.ROLLING_BACK]: {
      first: { 
        text: '运维介入', 
        action: OperationType.OPS_INTERVENTION, 
        enabled: true,
        type: 'primary' as const
      },
      second: { 
        text: '···', 
        action: OperationType.DELETE, 
        enabled: false,
        type: 'primary' as const,
        items: [
          { key: OperationType.DELETE, text: '删除', enabled: false }
        ]
      }
    },
    [DeploymentStatus.DEPLOYMENT_ENDED]: {
      first: { 
        text: '运维介入', 
        action: OperationType.OPS_INTERVENTION, 
        enabled: false,
        type: 'primary' as const
      },
      second: { 
        text: '···', 
        action: OperationType.DELETE, 
        enabled: false,
        type: 'primary' as const,
        items: [
          { key: OperationType.DELETE, text: '删除', enabled: false }
        ]
      }
    }
  };
  
  return configs[status] || { first: null, second: null };
};

// 检查操作是否适用于当前状态
export const isOperationApplicable = (status: DeploymentStatus, operation: OperationType): boolean => {
  const config = getButtonConfig(status);
  
  if (operation === OperationType.DEPLOY) {
    return status === DeploymentStatus.PENDING;
  }
  
  // 检查第一个按钮
  if (config.first && config.first.action === operation) {
    return config.first.enabled;
  }
  
  // 检查第二个按钮的下拉项
  if (config.second && config.second.items) {
    const item = config.second.items.find(item => item.key === operation);
    return item ? item.enabled : false;
  }
  
  return false;
};

// 获取操作类型的中文名称
export const getOperationTypeName = (operation: OperationType): string => {
  const names = {
    [OperationType.DEPLOY]: '部署',
    [OperationType.WHITELIST]: '申请加白',
    [OperationType.VERIFY_PASS]: '验证通过',
    [OperationType.ROLLBACK]: '回滚',
    [OperationType.OPS_INTERVENTION]: '运维介入',
    [OperationType.DELETE]: '删除'
  };
  return names[operation] || '未知操作';
};
