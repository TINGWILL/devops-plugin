import { DeploymentTask } from '../hooks/useDeploymentStatus';

/**
 * 部署任务列表API响应接口
 */
export interface DeploymentTasksResponse {
  tasks: DeploymentTask[];
  timestamp: number; // 服务器时间戳，用于判断数据是否更新
}

/**
 * 单个任务状态更新响应接口
 */
export interface TaskStatusUpdate {
  taskKey: string;
  taskStatus: string;
  deployStatus?: string;
  podStatus?: string;
  errorMessage?: string;
  errorTime?: number;
  updatedAt: number; // 更新时间戳
}

/**
 * WebSocket消息类型
 */
export interface WebSocketMessage {
  type: 'status_update' | 'task_added' | 'task_deleted' | 'error' | 'ping' | 'pong';
  data?: TaskStatusUpdate | DeploymentTask | string;
  timestamp?: number;
}

/**
 * API配置
 */
export interface DeploymentApiConfig {
  baseUrl?: string;
  pollingInterval?: number; // 轮询间隔（毫秒），默认5秒
  enableWebSocket?: boolean; // 是否启用WebSocket，默认false
  wsUrl?: string; // WebSocket URL
  onError?: (error: Error) => void; // 错误回调
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<DeploymentApiConfig> = {
  baseUrl: '/api/deployments',
  pollingInterval: 5000,
  enableWebSocket: false,
  wsUrl: '/api/deployments/ws',
  onError: (error) => console.error('部署API错误:', error)
};

/**
 * 部署任务API服务
 * 支持轮询和WebSocket两种方式获取实时数据
 */
export class DeploymentApiService {
  private config: Required<DeploymentApiConfig>;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private wsReconnectDelay = 3000;

  constructor(config: DeploymentApiConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 获取所有部署任务列表（轮询方式）
   */
  async fetchTasks(): Promise<DeploymentTasksResponse> {
    try {
      // TODO: 替换为真实API调用
      // const response = await fetch(`${this.config.baseUrl}/tasks`);
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      // const data = await response.json();
      // return data;

      // Mock数据：模拟API延迟和响应
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 从localStorage读取当前数据作为"后端返回"
      const storedTasks = localStorage.getItem('devops_tasks_data');
      const tasks: DeploymentTask[] = storedTasks ? JSON.parse(storedTasks) : [];
      
      return {
        tasks,
        timestamp: Date.now()
      };
    } catch (error) {
      this.config.onError(error as Error);
      throw error;
    }
  }

  /**
   * 获取指定任务的当前状态
   */
  async fetchTaskStatus(taskKey: string): Promise<DeploymentTask | null> {
    try {
      // TODO: 替换为真实API调用
      // const response = await fetch(`${this.config.baseUrl}/tasks/${taskKey}`);
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      // const task = await response.json();
      // return task;

      // Mock数据
      const allTasks = await this.fetchTasks();
      const task = allTasks.tasks.find(t => t.key === taskKey);
      return task || null;
    } catch (error) {
      this.config.onError(error as Error);
      return null;
    }
  }

  /**
   * 批量获取指定任务的状态（用于轮询多个任务）
   */
  async fetchTasksStatus(taskKeys: string[]): Promise<Map<string, DeploymentTask>> {
    try {
      // TODO: 替换为真实API调用
      // const response = await fetch(`${this.config.baseUrl}/tasks/batch`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ keys: taskKeys })
      // });
      // const data = await response.json();
      // return new Map(data.tasks.map((t: DeploymentTask) => [t.key, t]));

      // Mock数据
      const allTasks = await this.fetchTasks();
      const taskMap = new Map<string, DeploymentTask>();
      taskKeys.forEach(key => {
        const task = allTasks.tasks.find(t => t.key === key);
        if (task) {
          taskMap.set(key, task);
        }
      });
      return taskMap;
    } catch (error) {
      this.config.onError(error as Error);
      return new Map();
    }
  }

  /**
   * 连接WebSocket（如果启用）
   */
  connectWebSocket(
    onMessage: (update: TaskStatusUpdate | DeploymentTask) => void,
    onError?: (error: Event) => void
  ): void {
    if (!this.config.enableWebSocket) {
      return;
    }

    try {
      const ws = new WebSocket(this.config.wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        console.log('WebSocket连接已建立');
        this.wsReconnectAttempts = 0;
        
        // 发送ping保持连接
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // 每30秒发送一次ping
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            // 收到pong响应，连接正常
            return;
          }
          
          if (message.type === 'status_update' && message.data) {
            onMessage(message.data as TaskStatusUpdate);
          } else if (message.type === 'task_added' && message.data) {
            onMessage(message.data as DeploymentTask);
          } else if (message.type === 'error') {
            this.config.onError(new Error(message.data as string));
          }
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        if (onError) {
          onError(error);
        }
        this.config.onError(new Error('WebSocket连接错误'));
      };

      ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        this.ws = null;
        
        // 自动重连
        if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
          this.wsReconnectAttempts++;
          this.wsReconnectTimer = setTimeout(() => {
            console.log(`尝试重连WebSocket (${this.wsReconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connectWebSocket(onMessage, onError);
          }, this.wsReconnectDelay);
        } else {
          console.error('WebSocket重连失败，已达到最大重连次数');
        }
      };
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    this.wsReconnectAttempts = 0;
  }

  /**
   * 获取当前WebSocket连接状态
   */
  getWebSocketState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | null {
    if (!this.ws) {
      return null;
    }
    const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
    return states[this.ws.readyState] as any;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DeploymentApiConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 创建全局API服务实例（单例模式）
 */
let apiServiceInstance: DeploymentApiService | null = null;

/**
 * 获取或创建API服务实例
 */
export function getDeploymentApiService(config?: DeploymentApiConfig): DeploymentApiService {
  if (!apiServiceInstance) {
    apiServiceInstance = new DeploymentApiService(config);
  }
  if (config) {
    apiServiceInstance.updateConfig(config);
  }
  return apiServiceInstance;
}

