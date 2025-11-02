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
    } else if (i === 5 || i === 10 || i === 18 || i === 25 || i === 30) {
      // 设置多条数据为部署失败，用于测试错误信息显示
      taskStatus = DeploymentStatus.DEPLOYMENT_FAILED;
    } else {
      taskStatus = DeploymentStatus.PENDING;
    }
    
    // 为所有部署失败的任务添加错误信息（模拟真实场景）
    let errorMessage: string | undefined;
    let errorTime: number | undefined;
    if (taskStatus === DeploymentStatus.DEPLOYMENT_FAILED) {
      // 根据索引生成不同的错误信息，模拟不同类型的失败场景
      const errorTypes = [
        // 索引 5: 镜像拉取失败
        `镜像拉取失败：Failed to pull image "registry.company.com/${appNames[appIndex]}:${`v1.${i % 10}.${offsetNumber % 10}`}"\n错误详情：Error response from daemon: Get https://registry.company.com/v2/: net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)\n建议操作：\n1. 检查镜像仓库连接是否正常\n2. 确认镜像标签是否存在\n3. 检查网络连接或代理配置`,
        // 索引 10: Pod 启动失败
        `Pod 启动失败：Failed to start container "${appNames[appIndex]}"\n错误详情：Error: ImagePullBackOff - Back-off pulling image "registry.company.com/${appNames[appIndex]}:${`v1.${i % 10}.${offsetNumber % 10}`}"\nPod状态：CrashLoopBackOff\n建议操作：\n1. 检查镜像是否存在或标签是否正确\n2. 查看 Pod 日志排查启动问题\n3. 检查资源配置是否充足`,
        // 索引 18: 资源不足
        `资源分配失败：Insufficient resources in cluster "${clusters[i % clusters.length]}"\n错误详情：0/4 nodes are available: 4 Insufficient cpu, 4 Insufficient memory\n节点资源：CPU 0.5/2.0, Memory 1Gi/4Gi\n建议操作：\n1. 检查集群资源使用情况\n2. 尝试在其他命名空间部署\n3. 联系运维扩容节点资源`,
        // 索引 25: 健康检查失败
        `健康检查失败：Readiness probe failed for container "${appNames[appIndex]}"\n错误详情：Get http://localhost:8080/health: dial tcp 127.0.0.1:8080: connect: connection refused\n检查时间：已连续失败 3 次，间隔 10 秒\n建议操作：\n1. 检查应用健康检查端点是否正常\n2. 查看容器日志排查应用启动问题\n3. 调整健康检查配置或超时时间`,
        // 索引 30: 网络配置错误
        `网络配置错误：Service endpoint creation failed\n错误详情：Failed to create service endpoint: network policy violation - pod label mismatch\n命名空间：${namespaces[i % namespaces.length]}\n建议操作：\n1. 检查 Pod 标签是否匹配 Service 选择器\n2. 验证网络策略配置是否正确\n3. 确认命名空间的网络隔离策略`
      ];
      
      const errorIndex = [5, 10, 18, 25, 30].indexOf(i);
      if (errorIndex !== -1) {
        errorMessage = errorTypes[errorIndex];
      } else {
        // 默认错误信息
        errorMessage = `部署失败：Deployment failed for application "${appNames[appIndex]}"\n错误详情：Unknown error occurred during deployment process\n集群：${clusters[i % clusters.length]}\n命名空间：${namespaces[i % namespaces.length]}\n建议操作：\n1. 查看部署日志获取详细错误信息\n2. 检查应用配置是否正确\n3. 联系运维人员协助排查`;
      }
      errorTime = BASE_TIMESTAMP + offsetNumber * DAY;
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
      groupKey: undefined, // Mock 数据默认无分组
      errorMessage, // 错误信息（仅部署失败时有值）
      errorTime // 错误发生时间（仅部署失败时有值）
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

