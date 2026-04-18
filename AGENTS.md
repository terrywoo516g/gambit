# Gambit 项目上下文

## 产品概述

**Gambit - 国王的选择**
- 核心定位：重要决定，不该只听一个 AI 的
- 让 AI 评审团把分歧摆在用户面前，由用户做最终决断

### 支持的模式

- **审稿型（Review）**：用户已有草稿或现成方案要审
- **求解型（Solve）**：用户有目标无方案，需要 AI 给路径
- **选案型（Pick）**：即将开放
- **比较型（Compare）**：即将开放

---

## 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

---

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── api/gambit/    # API 路由
│   │   │   ├── diverge/   # 阶段1: 分歧分析
│   │   │   ├── synthesize/# 阶段2: 最终稿合成
│   │   │   └── observer/  # 旁观者意见
│   │   ├── globals.css    # 全局样式
│   │   ├── layout.tsx     # 根布局
│   │   └── page.tsx       # 主页面
│   ├── components/        # 组件
│   │   ├── InputPage.tsx          # 输入页面
│   │   ├── AnalyzingPage.tsx       # 加载分析页面
│   │   ├── FactResultPage.tsx     # 事实结果页
│   │   ├── ErrorPage.tsx          # 错误页
│   │   ├── FinalResultPage.tsx    # 最终稿展示页
│   │   └── Workbench.tsx          # 三栏工作台组件
│   └── lib/               # 工具库
│       ├── types.ts       # TypeScript 类型定义
│       ├── useGambit.ts   # 状态管理 Hook
│       └── gambit-api.ts  # API 客户端
└── AGENTS.md              # 项目规范文档
```

---

## 状态机（7 个 Stage）

```
input → analyzing → fact_result / disagreement → synthesizing → complete / error
```

| Stage | 说明 |
|-------|------|
| `input` | 首页输入 |
| `analyzing` | 后端处理中 |
| `fact_result` | 事实查询结果页 |
| `disagreement` | 国王的审阅台（核心页面） |
| `synthesizing` | Captain 合成中 |
| `complete` | 最终稿展示 |
| `error` | 错误页 |

---

## UI 设计规范

### 三栏布局比例

```
┌──────────────┬──────────────────────────────────┬──────────────┐
│   数据源      │         核心决策区              │    最终稿    │
│    15%       │           62%                   │     23%     │
└──────────────┴──────────────────────────────────┴──────────────┘
```

### 顶部导航栏（V3.15 优化）

非 input 阶段显示顶部导航栏，包含：
- "← 返回" 按钮：回到 input 阶段
- "决策模式" 标题
- 状态指示（AI 分析中 / AI 们正在争论... / 正在生成最终稿... / 最终稿已生成）
- "重新开始" 按钮

### 共识摘要区（V3.15 优化）

在核心张力和分歧卡片之间，V1.19 风格的绿色背景共识区：
- 绿色背景（`emerald-50/50`）
- 三个观点压缩显示（标题 + 理由 + 风险各一行）
- 底部显示"他们在吵什么"一句话分歧摘要

### 分歧卡片样式（V3.15 优化）

使用 `stance-card-compact` 样式：
- 紧凑高度（max-height: 320px）
- 缩小 padding
- 理由和风险区域限制行数
- Button 使用 `text-xs h-7` 尺寸

### Agent 配色映射

| Agent | 图标 | 颜色类名 |
|-------|------|----------|
| 激进派 | Flame | orange-500 |
| 稳健派 | Shield | blue-500 |
| 务实派 | Target | purple-500 |

### Briefing Prompt 格式（V3.15）

局势简报输出格式：
- `common_ground`: "三方都认为：[具体结论]"
- `king_question`: "是...还是...？"
- `key_tradeoff`: "激进派认为...，稳健派认为...，务实派认为..."
- `risk_alert`: "注意：..."

### Agent key_action 格式（V3.15）

分歧卡片的 key_action 字段要求：
- 动词开头，≤15字
- 是行动主张，不是场景描述
- 示例："All in 国产MoE，6个月追平GPT-4"

### 分歧状态 Badge

| 状态 | Badge 样式 |
|------|-----------|
| 强共识 | 蓝色（default） |
| 弱共识 | 灰色（secondary） |
| 强分歧 | 红色（destructive） |
| 伪共识 | 橙色（warning） |
| 少数派存在 | 紫色 |

---

## 包管理规范

**仅允许使用 pnpm** 作为包管理器。

```bash
pnpm install        # 安装依赖
pnpm add <package>  # 添加依赖
pnpm build          # 构建
pnpm dev            # 开发
```

---

## 开发规范

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 `typeof window`、`Date.now()`、`Math.random()` 等动态数据
2. 必须使用 `'use client'` 并配合 `useEffect` + `useState` 确保动态内容仅在客户端挂载后渲染

### LLM 集成

- 使用 `LLMClient` 从 `coze-coding-dev-sdk`
- 后端 API 路由使用 `LLMClient` 进行 LLM 调用
- 不允许在客户端代码中使用 LLM

### 分歧引擎

- 外部 HTTP API：`POST http://43.155.171.45:8000/diff`
- 超时 5s，失败时返回默认结果

---

## 关键文件说明

### src/lib/types.ts
所有 TypeScript 类型定义，包括：
- Stage 状态机类型
- Mode 原型类型
- Claim 相关类型
- DiffResult 分歧引擎结果
- FinalOutput 最终稿结构

### src/lib/useGambit.ts
状态管理 Hook，提供：
- `setInput` - 设置输入
- `handleDivergeResponse` - 处理分歧响应
- `selectClaim` - 选择卡片
- `setUserThoughts` - 设置用户想法
- `startSynthesizing` - 开始合成
- `setFinalOutput` - 设置最终稿

### src/components/Workbench.tsx
核心三栏布局组件：
- `SourcesPanel` - 左栏数据源
- `DecisionPanel` - 中栏决策区
- `ResultPanel` - 右栏最终稿
- `StanceCard` - 分歧卡片

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/gambit/diverge` | POST | 阶段1: 获取分歧结果 |
| `/api/gambit/synthesize` | POST | 阶段2: Captain 合成 |
| `/api/gambit/observer` | POST | 旁观者意见 |

---

## LLM 模型配置

### 最终模型清单

| 接口 | 角色 | 模型 ID | Temperature |
|------|------|---------|-------------|
| diverge | Router | `doubao-seed-2-0-lite-260215` | 0.7 |
| diverge | Captain 核心张力 | `deepseek-r1-250528` | 0.7 |
| diverge | 激进派 Agent | `kimi-k2-5-260127` | **0.6** |
| diverge | 稳健派 Agent | `glm-5-0-260211` | 0.7 |
| diverge | 务实派 Agent | `deepseek-v3-2-251201` | 0.7 |
| diverge | Blindspot | `glm-5-turbo-260316` | 0.5 |
| synthesize | Captain 合成 | `deepseek-r1-250528` | 0.7 |
| observer | Observer | `qwen-3-5-plus-260215` | 0.7 |

### 模型厂商分布

| 厂商 | 模型 | 用途 |
|------|------|------|
| 豆包 (Doubao) | `doubao-seed-2-0-lite-260215` | Router |
| DeepSeek | `deepseek-r1-250528` | Captain (核心张力 + 合成) |
| Moonshot (Kimi) | `kimi-k2-5-260127` | 激进派 |
| 智谱 (GLM) | `glm-5-0-260211` | 稳健派 |
| DeepSeek | `deepseek-v3-2-251201` | 务实派 |
| 智谱 (GLM) | `glm-5-turbo-260316` | Blindspot |
| 阿里 (Qwen) | `qwen-3-5-plus-260215` | Observer |

### 重要注意事项

1. **Kimi 只允许 temperature=0.6**，其他值会报错
2. **JSON 解析需处理 markdown 代码块**：部分模型返回的 JSON 可能被 ` ```json ... ``` ` 包裹
3. **不可用模型**：`doubao-seed-1-6-thinking-*` 已停运，请勿使用

---

## 环境变量

无需额外配置，环境变量由 coze-coding-dev-sdk 自动加载。

---

## 访问地址

开发环境：`http://localhost:5000`

生产环境：使用 `COZE_PROJECT_DOMAIN_DEFAULT` 环境变量
