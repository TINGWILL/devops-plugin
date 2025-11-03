import { DeploymentStatus, OperationType } from '../constants/deploymentStatus';

/**
 * 下拉菜单项配置
 */
export interface DropdownItemConfig {
  key: OperationType;
  text: string;
  enabled: boolean;
}

/**
 * 按钮配置项
 * 注意：实际使用中，onClick 由组件内部生成，这里定义的是配置结构
 * Semi Design Button 的 type 属性：'primary' | 'secondary' | 'tertiary' | 'danger'
 */
export interface ButtonConfigItem {
  text: string;
  type: 'primary' | 'secondary' | 'tertiary' | 'danger';
  action: OperationType;
  enabled: boolean;
  items?: DropdownItemConfig[]; // 下拉菜单项（仅第二个按钮使用）
}

/**
 * 按钮配置
 */
export interface ButtonConfig {
  first: ButtonConfigItem | null;
  second: ButtonConfigItem | null;
}

/**
 * 部署任务类型
 */
export interface DeploymentTask {
  key: string;
  appName: string;
  taskStatus: DeploymentStatus;
  deployStatus: string;
  podStatus: string;
  version: string;
  cluster: string;
  namespace: string;
  envTag: string;
  deployTime: number;
  deployer: string;
  avatarBg: string;
  deployOrder?: number;
  groupKey?: string;
  paused?: boolean;
  errorMessage?: string;
  errorTime?: number;
  ignoreFail?: boolean; // 忽略部署失败
}

/**
 * 批量操作类型
 */
export type BatchOperationType = OperationType.DEPLOY | OperationType.WHITELIST | OperationType.VERIFY_PASS | OperationType.ROLLBACK | OperationType.OPS_INTERVENTION;

