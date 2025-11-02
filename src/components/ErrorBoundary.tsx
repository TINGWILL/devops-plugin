import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Typography } from '@douyinfe/semi-ui';

const { Title, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录这些错误，并显示一个备用 UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到错误报告服务
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 更新状态
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义 fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '40px 20px',
            textAlign: 'center'
          }}
        >
          <Title heading={3} style={{ marginBottom: '16px' }}>
            出错了
          </Title>
          <Text type="secondary" style={{ marginBottom: '24px', maxWidth: '600px' }}>
            应用遇到了一个错误，请刷新页面重试。如果问题持续存在，请联系技术支持。
          </Text>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                textAlign: 'left',
                maxWidth: '800px',
                width: '100%'
              }}
            >
              <summary style={{ cursor: 'pointer', marginBottom: '8px', fontWeight: 500 }}>
                错误详情（仅开发环境显示）
              </summary>
              <pre
                style={{
                  fontSize: '12px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <Button
            type="primary"
            theme="solid"
            onClick={this.handleReset}
            style={{ marginTop: '24px' }}
          >
            重试
          </Button>
          
          <Button
            type="tertiary"
            onClick={() => window.location.reload()}
            style={{ marginTop: '12px' }}
          >
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

