import { useState, useEffect } from 'react';

/**
 * 飞书项目系统主题检测 Hook
 */
export function useFeishuTheme(): boolean {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    /**
     * 检测飞书项目系统主题
     */
    const detectFeishuTheme = (): boolean => {
      const body = document.body;
      const html = document.documentElement;

      // 检查页面元素主题标识
      const hasDarkClass = body.classList.contains('dark') || html.classList.contains('dark');
      const hasDarkAttr =
        body.getAttribute('data-theme') === 'dark' ||
        html.getAttribute('data-theme') === 'dark' ||
        body.getAttribute('theme-mode') === 'dark' ||
        html.getAttribute('theme-mode') === 'dark';

      if (hasDarkClass || hasDarkAttr) {
        return true;
      }

      // 检查背景色
      const bgColor = window.getComputedStyle(body).backgroundColor;
      if (bgColor && (bgColor.includes('rgb(31, 31, 31)') || bgColor.includes('#1f1f1f'))) {
        return true;
      }

      // 检查 localStorage
      try {
        const storedTheme =
          localStorage.getItem('theme') ||
          localStorage.getItem('theme-mode') ||
          localStorage.getItem('feishu-theme');
        if (storedTheme === 'dark') {
          return true;
        }
      } catch {
        // 忽略 localStorage 访问错误
      }

      return false;
    };

    /**
     * 设置主题
     */
    const setTheme = (dark: boolean) => {
      setIsDarkMode(dark);
      const body = document.body;
      const appContainer = document.getElementById('app');

      if (dark) {
        body.setAttribute('theme-mode', 'dark');
        appContainer?.setAttribute('theme-mode', 'dark');
      } else {
        body.removeAttribute('theme-mode');
        appContainer?.removeAttribute('theme-mode');
      }
    };

    // 初始化主题
    setTheme(detectFeishuTheme());

    // 定期检查主题变化
    const checkInterval = setInterval(() => {
      const shouldBeDark = detectFeishuTheme();
      const isCurrentlyDark = document.body.getAttribute('theme-mode') === 'dark';

      if (shouldBeDark !== isCurrentlyDark) {
        setTheme(shouldBeDark);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, []);

  return isDarkMode;
}

