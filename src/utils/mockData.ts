import { DeploymentTask } from '../hooks/useDeploymentStatus';
import { DeploymentStatus } from '../constants/deploymentStatus';

const DAY = 24 * 60 * 60 * 1000;

/**
 * 生成 Mock 部署任务数据
 * 用于开发测试，所有数据字段都是固定值，确保每次刷新页面时数据一致
 */
export function generateMockTasks(): DeploymentTask[] {
  const data: DeploymentTask[] = [];
  const appNames = ['用户服务', '订单服务', '支付服务', '商品服务', '库存服务', '通知服务'];
  const deployStatuses = ['success', 'failed', 'pending'];
  const podStatuses = ['running', 'pending', 'failed'];
  const clusters = [
    'CBG多业务森华机房k8s集群(1.15)',
    '输入法业务酒仙桥机房k8s集群(1.15)',
    '公研北京阿里云机房k8s集群(1.32.4)',
    '输入法北京阿里云机房k8s集群(1.32.4)'
  ];
  const namespaces = ['default', 'production', 'staging', 'development'];
  const envTags = ['prod', 'test', 'dev', 'staging', 'gray'];
  const deployers = ['张三', '李四', '王五', '赵六', '钱七'];

  // 使用固定的基准时间戳（2024-01-01 00:00:00），确保每次生成的数据一致
  const BASE_TIMESTAMP = new Date('2024-01-01T00:00:00').valueOf();

  for (let i = 0; i < 46; i++) {
    const offsetNumber = (i * 1000) % 199;
    const appIndex = i % appNames.length;
    const deployerIndex = i % deployers.length;

    // 明确指定某些任务的状态，用于测试不同状态的复选框禁用功能
    let taskStatus: DeploymentStatus;
    if (i === 8 || i === 9) {
      taskStatus = DeploymentStatus.DEPLOYING;
    } else if (i === 15 || i === 16) {
      taskStatus = DeploymentStatus.APPROVING;
    } else if (i === 22 || i === 23) {
      taskStatus = DeploymentStatus.ROLLING_BACK;
    } else {
      taskStatus = DeploymentStatus.PENDING;
    }

    data.push({
      key: String(i),
      appName: `${appNames[appIndex]}${i > 5 ? `-${i}` : ''}`,
      deployStatus: deployStatuses[i % deployStatuses.length],
      podStatus: podStatuses[i % podStatuses.length],
      version: `v1.${i % 10}.${offsetNumber % 10}`,
      cluster: clusters[i % clusters.length],
      namespace: namespaces[i % namespaces.length],
      envTag: envTags[i % envTags.length],
      deployTime: BASE_TIMESTAMP + offsetNumber * DAY,
      deployer: deployers[deployerIndex],
      avatarBg: ['grey', 'red', 'blue', 'green', 'orange'][i % 5],
      taskStatus,
      deployOrder: undefined,
      groupKey: undefined // Mock 数据默认无分组
    });
  }

  // 按照发布集群、命名空间、环境标签进行排序
  return data.sort((a, b) => {
    const clusterCompare = a.cluster.localeCompare(b.cluster);
    if (clusterCompare !== 0) return clusterCompare;

    const namespaceCompare = a.namespace.localeCompare(b.namespace);
    if (namespaceCompare !== 0) return namespaceCompare;

    return a.envTag.localeCompare(b.envTag);
  });
}

