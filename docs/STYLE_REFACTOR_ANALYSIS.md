# 样式问题分析与重构建议

## 📋 问题清单

### 🔴 严重问题（必须修复）

#### 1. **未使用 CSS Modules，样式作用域混乱**
- **问题**：项目中没有任何 `.module.css` 文件，所有样式都在全局 `index.css` 中
- **影响**：样式污染、命名冲突、难以维护
- **规范违反**：违反了"组件级必须使用 CSS Modules"的核心规则

#### 2. **全局覆盖 Semi Design 类名**
- **问题**：`index.css` 中直接覆盖了 `.semi-table`、`.semi-modal`、`.semi-tag` 等 Semi Design 的全局类名
- **统计**：130 处覆盖 `semi-*` 类名
- **规范违反**：违反了"禁止全局覆盖 semi-* 类名"的规则

#### 3. **滥用 !important**
- **问题**：`index.css` 中有 105 个 `!important`
- **影响**：样式优先级混乱，难以覆盖和调试
- **规范违反**：违反了"禁止滥用 !important"的规则

#### 4. **页面专属样式侵入全局**
- **问题**：`#app`、`.app-header` 等页面专属样式放在了全局 `index.css` 中
- **影响**：全局样式文件臃肿，影响其他页面
- **规范违反**：违反了"禁止将组件/页面专属样式迁移到全局"的规则

#### 5. **内联样式和动态样式注入**
- **问题**：`App.tsx` 中使用 `dangerouslySetInnerHTML` 注入样式，以及大量内联 `style={{}}`
- **位置**：`src/features/web/App.tsx:511-630`
- **影响**：样式逻辑与组件逻辑混杂，难以维护

#### 6. **组件内联样式过多**
- **问题**：`StatusTag.tsx` 等组件使用大量内联样式
- **影响**：无法复用、难以维护、不支持主题切换

#### 7. **全局工具类缺少业务前缀**
- **问题**：`.status-tag`、`.app-header` 等全局类没有业务前缀
- **规范要求**：应该改为 `.devops-status-tag`、`.devops-app-header`

### 🟡 中等问题（建议修复）

#### 8. **样式选择器过于复杂**
- **问题**：某些选择器嵌套层级超过 3 层，如：
  ```css
  .semi-table-container .semi-table .semi-table-thead .semi-table-selection-column::before
  ```
- **影响**：维护困难，性能略差

#### 9. **缺少 CSS 变量复用**
- **问题**：硬编码颜色值（如 `#F5F7FA`、`#E5E6EB`），未使用 Semi Design 主题变量
- **规范要求**：应该使用 `var(--semi-color-bg-0)` 等变量

#### 10. **响应式样式不完整**
- **问题**：只有基础的媒体查询，缺少完整的响应式设计

---

## 🔧 重构方案

### 第一阶段：建立 CSS Modules 体系

#### 1.1 创建页面级 CSS Module
```bash
# 创建页面专属样式文件
src/features/web/App.module.css
```

**迁移内容**：
- `#app` 容器样式
- `.app-header`、`.app-header-left`、`.app-header-title` 等页面头部样式
- 页面布局相关样式

**代码示例**：
```css
/* src/features/web/App.module.css */
.appContainer {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 24px 24px 24px;
  color: var(--semi-color-text-0);
  background-color: var(--semi-color-bg-0);
  box-sizing: border-box;
}

.appHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.appHeaderLeft {
  display: flex;
  align-items: center;
}

.appHeaderTitleIndicator {
  width: 4px;
  height: 20px;
  background-color: #3250eb;
  border-radius: 2px;
  margin-right: 12px;
}

.appHeaderTitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--semi-color-text-0);
  margin: 0;
}

.appHeaderActions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 暗色模式 */
:global(body[theme-mode="dark"]) .appContainer {
  background-color: #2f3037;
}

/* 响应式 */
@media (max-width: 1200px) {
  .appContainer {
    padding: 0 16px;
  }
}

@media (max-width: 768px) {
  .appContainer {
    padding: 0 12px;
  }
}
```

**在 App.tsx 中使用**：
```typescript
import styles from './App.module.css';

// 替换
<div id="app" style={{...}}>
// 为
<div id="app" className={styles.appContainer}>
```

#### 1.2 创建表格组件 CSS Module
```bash
src/components/DeploymentTable.module.css
```

**迁移内容**：
- 所有表格相关样式（通过父级类名限定作用域）
- 表格容器、表头、表体、固定列等样式

**关键原则**：通过父级类名限定 Semi Design 样式覆盖范围

**代码示例**：
```css
/* src/components/DeploymentTable.module.css */

/* 通过父级类名限定作用域，不直接覆盖 .semi-table */
.tableContainer {
  background: var(--semi-color-bg-0);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 280px);
  margin-bottom: 0;
  overflow: hidden;
}

.tableContainer :global(.semi-table) {
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

/* 通过父级限定表头样式 */
.tableContainer :global(.semi-table .semi-table-thead tr th) {
  background-color: var(--semi-color-fill-1);
  border-right: 1px solid var(--semi-color-border);
  border-bottom: 1px solid var(--semi-color-border);
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--semi-color-text-0);
}

/* 通过父级限定表体样式 */
.tableContainer :global(.semi-table .semi-table-tbody tr td) {
  background-color: var(--semi-color-bg-0);
  border-right: 1px solid var(--semi-color-border);
  border-bottom: 1px solid var(--semi-color-border);
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: var(--semi-color-text-0);
}

/* 暗色模式通过父级限定 */
:global(body[theme-mode="dark"]) .tableContainer :global(.semi-table .semi-table-thead tr th) {
  background-color: #2a2a2a;
  color: #ffffff;
  border-color: #4a4a4a;
}
```

#### 1.3 创建组件级 CSS Modules

**StatusTag.module.css**：
```css
/* src/components/StatusTag.module.css */
.statusTag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
}

.pending {
  background-color: #FFF7E6;
  color: #FA8C16;
}

.deploying {
  background-color: #E6F4FF;
  color: #1890FF;
}

.deployed {
  background-color: #F6FFED;
  color: #52C41A;
}

.failed {
  background-color: #FFF1F0;
  color: #F5222D;
}

.rollingBack {
  background-color: #FFF7E6;
  color: #FA8C16;
}

.ended {
  background-color: #F5F5F5;
  color: #8C8C8C;
}
```

**StatusTag.tsx 使用示例**：
```typescript
import styles from './StatusTag.module.css';

// 替换内联样式为
<div className={styles.statusTag}>
  <Tag 
    color={config.color} 
    className={styles[status.toLowerCase()]}
  >
    {status}
  </Tag>
</div>
```

### 第二阶段：清理全局样式

#### 2.1 保留在 index.css 的内容（仅限）

```css
/* src/features/web/index.css - 仅保留全局基础样式 */

/* 1. 浏览器重置（如需要） */
* {
  box-sizing: border-box;
}

html, body {
  height: auto;
  min-height: 100vh;
  overflow-x: hidden;
}

/* 2. 全局滚动条样式（跨页面复用） */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--semi-color-fill-0);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--semi-color-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--semi-color-text-2);
}

/* 3. 暗色模式滚动条（全局） */
:global(body[theme-mode="dark"]) ::-webkit-scrollbar-track {
  background: #3a3a3a;
}

:global(body[theme-mode="dark"]) ::-webkit-scrollbar-thumb {
  background: #666666;
}

/* 4. 带业务前缀的全局工具类（如需要） */
.devops-textHint {
  color: var(--semi-color-text-2);
  font-size: 12px;
}

.devops-textError {
  color: var(--semi-color-danger);
  font-size: 12px;
}
```

#### 2.2 移除的内容（迁移到 CSS Modules）

- ❌ 所有 `.semi-*` 类名覆盖
- ❌ `#app` 容器样式 → 迁移到 `App.module.css`
- ❌ `.status-tag` → 迁移到 `StatusTag.module.css`
- ❌ 表格相关样式 → 迁移到 `DeploymentTable.module.css`
- ❌ 弹窗位置调整 → 迁移到对应 Modal 组件的 CSS Module

### 第三阶段：移除内联样式和动态注入

#### 3.1 移除 App.tsx 中的动态样式注入

**删除**：
```typescript
// ❌ 删除这段
<style dangerouslySetInnerHTML={{
  __html: `...大量样式...`
}} />

// ❌ 删除内联样式
<div id="app" style={{...}}>
```

**替换为**：
```typescript
import styles from './App.module.css';

<div id="app" className={styles.appContainer}>
```

#### 3.2 重构组件内联样式

**StatusTag.tsx 重构示例**：

```typescript
// ❌ 删除所有内联 style={{...}}
// ✅ 使用 CSS Modules

import styles from './StatusTag.module.css';

// 气泡卡片内容也使用 CSS Modules
const errorContent = (
  <div className={styles.errorPopover}>
    <div className={styles.errorPopoverHeader}>
      <IconInfoCircle className={styles.errorIcon} />
      <span>部署失败信息</span>
    </div>
    <div className={styles.errorPopoverContent}>
      {errorMessage}
    </div>
    {/* ... */}
  </div>
);
```

### 第四阶段：优化 Semi Design 样式覆盖

#### 4.1 通过父级类名限定作用域

**原则**：永远不直接覆盖 `.semi-table`，而是通过父级限定

```css
/* ✅ 正确：通过父级类名限定 */
.tableContainer :global(.semi-table) {
  /* 样式 */
}

.tableContainer :global(.semi-table .semi-table-thead tr th) {
  /* 样式 */
}

/* ❌ 错误：直接覆盖全局 */
.semi-table {
  /* 样式 */
}
```

#### 4.2 使用 Semi Design 主题变量

```css
/* ✅ 正确：使用主题变量 */
.tableContainer :global(.semi-table .semi-table-thead tr th) {
  background-color: var(--semi-color-fill-1);
  color: var(--semi-color-text-0);
  border-color: var(--semi-color-border);
}

/* ❌ 错误：硬编码颜色 */
.tableContainer :global(.semi-table .semi-table-thead tr th) {
  background-color: #F5F7FA;
  color: #262626;
  border-color: #E5E6EB;
}
```

#### 4.3 减少 !important 使用

**策略**：
1. 提高选择器特异性（通过父级类名）
2. 使用 `:global()` 包装 Semi Design 类名
3. 仅在必要时使用 `!important`

```css
/* ✅ 正确：通过特异性覆盖 */
.tableContainer :global(.semi-table .semi-table-thead tr th) {
  background-color: var(--semi-color-fill-1);
}

/* ❌ 错误：滥用 !important */
.semi-table th {
  background-color: #F5F7FA !important;
}
```

---

## 📝 重构步骤清单

### Step 1: 准备工作（1小时）
- [ ] 创建 `src/features/web/App.module.css`
- [ ] 创建 `src/components/DeploymentTable.module.css`
- [ ] 创建各组件 CSS Module 文件（StatusTag、Modal 等）

### Step 2: 迁移页面样式（2小时）
- [ ] 将 `#app` 样式迁移到 `App.module.css`
- [ ] 将页面头部样式迁移到 `App.module.css`
- [ ] 更新 `App.tsx` 使用 CSS Modules
- [ ] 移除 `App.tsx` 中的 `dangerouslySetInnerHTML`
- [ ] 移除 `App.tsx` 中的内联样式

### Step 3: 迁移表格样式（3小时）
- [ ] 将表格容器样式迁移到 `DeploymentTable.module.css`
- [ ] 将所有表格相关样式迁移（通过父级类名限定）
- [ ] 使用 Semi Design 主题变量替换硬编码颜色
- [ ] 减少 `!important` 使用（从 105 个减少到 < 10 个）
- [ ] 更新表格组件使用 CSS Modules

### Step 4: 迁移组件样式（2小时）
- [ ] 迁移 `StatusTag` 组件样式
- [ ] 迁移 Modal 组件样式
- [ ] 迁移其他组件内联样式

### Step 5: 清理全局样式（1小时）
- [ ] 清理 `index.css`，仅保留全局基础样式
- [ ] 添加业务前缀到必要的全局工具类
- [ ] 验证样式功能正常

### Step 6: 测试验证（1小时）
- [ ] 测试明暗主题切换
- [ ] 测试响应式布局
- [ ] 测试表格功能（固定列、分组等）
- [ ] 检查是否有样式冲突

**总计时间估算**：10 小时

---

## 🎯 重构后的目录结构

```
src/
├── features/
│   └── web/
│       ├── App.tsx
│       ├── App.module.css          # 页面专属样式
│       └── index.tsx
├── components/
│   ├── DeploymentTable.tsx
│   ├── DeploymentTable.module.css   # 表格样式（通过父级限定）
│   ├── StatusTag.tsx
│   ├── StatusTag.module.css        # 组件样式
│   ├── BatchHeader.tsx
│   ├── BatchHeader.module.css
│   └── ...
└── features/
    └── web/
        └── index.css                # 仅保留全局基础样式
```

---

## ⚠️ 注意事项

1. **CSS Modules 的 `:global()` 使用**：
   - 仅在需要覆盖 Semi Design 组件时使用
   - 通过父级类名限定作用域

2. **Semi Design 主题变量**：
   - 优先使用 `var(--semi-color-*)`
   - 参考 [Semi Design 主题变量文档](https://semi.design/zh-CN/basic/tokens)

3. **测试覆盖**：
   - 确保明暗主题都正常
   - 确保响应式布局正常
   - 确保表格所有功能正常

4. **渐进式迁移**：
   - 可以分批次迁移，不需要一次性完成
   - 建议先迁移页面样式，再迁移组件样式

---

## 📚 参考资源

- [CSS Modules 官方文档](https://github.com/css-modules/css-modules)
- [Semi Design 主题变量](https://semi.design/zh-CN/basic/tokens)
- [Semi Design 样式覆盖指南](https://semi.design/zh-CN/start/customize-theme)

