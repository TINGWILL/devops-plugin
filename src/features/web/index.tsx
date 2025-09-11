import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createRoot } from 'react-dom/client';

// 初始化JSSDK
async function initJSSDK() {
  if (window.JSSDK) {
    await window.JSSDK.shared.setSharedModules({
      React,
      ReactDOM
    });
  }
}

// 渲染应用
function renderApp() {
  // 检查是否已存在容器，如果存在则先移除
  let container = document.getElementById('app');
  if (container) {
    container.remove();
  }
  
  // 创建新容器
  container = document.createElement('div');
  container.id = 'app';
  document.body.appendChild(container);
  const root = createRoot(container);

  root.render(<App />);
}

// 启动应用
async function main() {
  try {
    await initJSSDK();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
  // 无论JSSDK初始化是否成功，都渲染应用
  renderApp();
}

// 运行应用
main();

export default main;
