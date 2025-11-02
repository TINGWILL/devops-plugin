import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 清理每个测试后的 DOM
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => {
    return localStorageStore[key] || null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
};

const localStorageStore: Record<string, string> = {};

global.localStorage = localStorageMock as any;

// Mock Toast - 需要在使用前 mock
vi.mock('@douyinfe/semi-ui', () => {
  return {
    Toast: {
      warning: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      config: vi.fn(),
    },
  };
});

