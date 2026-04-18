# Gambit V3.15 决策页布局优化需求单

> 目标：将 V1.19 的优秀布局逻辑迁移到 V3.15，同时保留 V3.15 的四通路架构和数据结构。
> 
> **核心原则：最小改动，只改展示层，不动 API/数据结构**

---

## 一、问题诊断

| 问题 | V3.15 现状 | V1.19 做法（要迁移） |
|------|------------|---------------------|
| 局势简报没意义 | 输出"共识基础/关键抉择/核心权衡"都是框架描述，太泛 | 无此组件，但共识区用绿色背景强化，直接展示三个观点摘要 |
| 分歧卡看不出分歧 | 三张大卡片铺开，标题是场景描述，需通读全文 | 小卡片+折叠理由，标题是行动主张，一眼能区分 |
| 缺少"返回/重新开始" | V3.15 的 Workbench 组件没有返回按钮 | V1.19 顶部有"← 返回"+"重新开始"按钮 |
| 信息层级不清 | 共识区和分歧卡混在一起 | 先共识后分歧，绿色区=共识（先看），白色卡片=选择（再看） |

---

## 二、需要修改的文件清单

### ✅ 必须修改

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/app/page.tsx` | **前端布局** | 添加顶部导航栏（返回+重新开始按钮） |
| `src/components/Workbench.tsx` | **前端布局** | 重构 DecisionPanel，新增共识摘要区 |
| `src/lib/types.ts` | **类型扩展** | BriefingOutput 新增 `three_way_consensus` 字段 |
| `src/app/api/gambit/diverge/route.ts` | **Prompt 优化** | 局势简报 prompt 要求输出具体判断 |

### ⛔ 不能动的文件

| 文件 | 原因 |
|------|------|
| `src/lib/useGambit.ts` | 状态管理核心，动了会影响全链路 |
| `src/lib/gambit-api.ts` | API 调用层，已稳定 |
| 所有 `/api/gambit/*` 的接口契约 | 改接口会导致前后端不兼容 |

---

## 三、具体改动方案

### 3.1 顶部导航栏（page.tsx）

**位置**：`src/app/page.tsx` 的 `renderPage()` 函数

**改动**：在 `stage !== 'input'` 时，渲染顶部导航栏

```tsx
// 在 Workbench 外层包一个 header
{state.stage !== 'input' && (
  <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b z-50">
    <div className="h-14 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => gambit.updateState({ stage: 'input' })}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 返回
        </button>
        <span className="text-lg font-bold tracking-tight">
          决策模式
        </span>
        {state.stage === 'analyzing' && (
          <span className="text-xs text-muted-foreground">AI 分析中...</span>
        )}
        {state.stage === 'disagreement' && (
          <span className="text-xs text-muted-foreground">AI 们正在争论...</span>
        )}
        {state.stage === 'synthesizing' && (
          <span className="text-xs text-primary animate-pulse">正在生成最终稿...</span>
        )}
        {state.stage === 'complete' && (
          <span className="text-xs text-green-600">✓ 最终稿已生成</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => gambit.resetSession()}
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        重新开始
      </Button>
    </div>
  </header>
)}
```

**需要导入**：
```tsx
import { RefreshCw } from 'lucide-react';
```

---

### 3.2 DecisionPanel 共识区重构（Workbench.tsx）

**位置**：`src/components/Workbench.tsx` 的 `DecisionPanel` 组件

**改动**：在"核心张力"下方、三联分歧卡上方，新增**共识摘要区**

#### 3.2.1 新增共识摘要区

在 `{/* 顶部：核心张力 + 局势简报（V3.15）+ 分歧状态 */}` 区块内，**替换**原有的 `briefing` 展示：

```tsx
{/* V1.19 风格的共识摘要区 */}
<div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200/50">
  <div className="flex items-center gap-2 mb-2">
    <Sparkles className="w-4 h-4 text-emerald-600" />
    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">三个 AI 的观点</span>
  </div>
  
  {/* 观点列表 - 压缩显示 */}
  <div className="space-y-2">
    {claims.map((claim, idx) => {
      const iconColor = claim.agent_id === 'agent_radical' ? 'text-orange-500' : 
                       claim.agent_id === 'agent_steady' ? 'text-blue-500' : 
                       'text-purple-500';
      const Icon = claim.agent_id === 'agent_radical' ? Flame : 
                  claim.agent_id === 'agent_steady' ? Shield : 
                  Target;
      
      return (
        <div key={claim.claim_id} className="space-y-0.5">
          <div className="flex items-start gap-1.5">
            <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium leading-snug line-clamp-1 text-gray-800 dark:text-gray-200">
                {claim.key_action}
              </h4>
            </div>
          </div>
          
          {/* 理由 + 风险（压缩到一行） */}
          <div className="ml-5 flex gap-3 text-[11px]">
            {claim.rationale?.[0] && (
              <span className="text-muted-foreground">
                <span className="text-emerald-600 font-medium">理由</span> {claim.rationale[0].substring(0, 30)}...
              </span>
            )}
            {claim.risks?.[0] && (
              <span className="text-muted-foreground">
                <span className="text-amber-600 font-medium">风险</span> {claim.risks[0].substring(0, 30)}...
              </span>
            )}
          </div>
          
          {idx < claims.length - 1 && (
            <div className="border-t border-dashed border-emerald-200/30 mt-1.5" />
          )}
        </div>
      );
    })}
  </div>
  
  {/* 他们在吵什么 - 一句话分歧摘要 */}
  {briefing && (
    <div className="mt-3 pt-2 border-t border-emerald-200/30">
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">他们在吵什么：</span>
      <span className="text-xs text-muted-foreground ml-1">{briefing.key_tradeoff}</span>
    </div>
  )}
</div>
```

#### 3.2.2 缩小分歧卡片

将 `StanceCard` 组件的样式改为更紧凑：

```tsx
// 找到 StanceCard 组件，修改以下样式
<Card className={`stance-card-compact ${colorClass.border}`}>  // 改类名
  <CardHeader className="pb-1 pt-2 px-3">  // 缩小 padding
    ...
  </CardHeader>
  <CardContent className="space-y-1.5 px-3 py-2">  // 缩小 padding
    ...
  </CardContent>
</Card>
```

在 `globals.css` 中添加：

```css
/* V3.15 紧凑型分歧卡片 */
.stance-card-compact {
  min-height: auto;
  max-height: 280px;
}

.stance-card-compact .stance-card-content {
  max-height: 180px;
  overflow-y: auto;
}
```

---

### 3.3 局势简报 Prompt 优化（API 层）

**位置**：`src/app/api/gambit/diverge/route.ts`

**改动**：修改 `BRIEFING_PROMPT` 的输出要求

**原 Prompt（问题）**：
```
输出共识基础、关键抉择、核心权衡...
```

**新 Prompt（具体）**：
```typescript
const BRIEFING_PROMPT = `
你是 Gambit 系统的局势简报官。基于三个 Agent 的分析结果，生成简报。

## 输出要求

1. **common_ground**（三方共识）
   - 必须是具体判断，不是框架描述
   - 格式："三方都认为：[具体结论]"
   - 禁止：泛泛的权衡框架、显而易见的废话
   - 示例："三方都认为：Opus 4.6 仅在需要64K+推理链的垂直场景有护城河，通用场景用它是浪费钱。"

2. **king_question**（国王的选择题）
   - 把决策简化为一个"A还是B"的选择
   - 示例："是'先占坑再算账'，还是'先算账再占坑'？"

3. **key_tradeoff**（核心分歧点）
   - 用"A主张X，B主张Y"格式
   - 示例："激进派认为应该立刻锁定3个垂直场景全力投入，稳健派认为应该先用小规模验证ROI再扩张。"

4. **risk_alert**（风险提示，可选）
   - 只在有明显风险时输出
   - 示例："注意：三方都低估了交付人力瓶颈的影响。"

## JSON 输出格式
{
  "common_ground": "三方都认为：...",
  "king_question": "是...还是...？",
  "key_tradeoff": "激进派认为...，稳健派认为...，务实派认为...",
  "risk_alert": "注意：..."
}
`;
```

---

### 3.4 分歧卡标题优化（Agent Prompt）

**位置**：`src/app/api/gambit/diverge/route.ts` 中的 Agent Prompt

**改动**：在 Agent 输出要求中增加 `key_action` 的格式约束

```typescript
// 在 AGENT_PROMPT 中添加
## key_action 字段要求
- 必须是**行动主张**，不是场景描述
- 必须能让用户**不读正文就知道这个方案在建议什么**
- 格式：动词开头，≤15字

禁止：
- "在XX场景上做XX"（太绕）
- "XX视角下的XX"（没有主张）

示例对比：
❌ "押注长链推理场景"
✅ "All in 金融建模，48小时出标杆"

❌ "小规模试点复杂长链任务"  
✅ "先跑3个测试，证明ROI再扩"
```

---

## 四、验收标准

### 4.1 UI 验收

| 检查项 | 预期结果 |
|--------|----------|
| 顶部导航栏 | 非 input 阶段显示"← 返回"和"重新开始"按钮 |
| 共识摘要区 | 绿色背景，三个观点压缩显示（标题+理由+风险各一行） |
| "他们在吵什么" | 共识区底部一句话展示分歧焦点 |
| 分歧卡片 | 高度压缩，1080p 屏幕下三张卡无需滚动 |
| 返回功能 | 点击"返回"回到 input 阶段，保留已输入内容 |
| 重新开始 | 点击"重新开始"清空所有状态，回到初始页 |

### 4.2 数据验收

| 检查项 | 预期结果 |
|--------|----------|
| briefing.common_ground | 以"三方都认为："开头，是具体判断 |
| briefing.key_tradeoff | 包含"激进派认为...稳健派认为..." |
| claim.key_action | 动词开头，≤15字，是行动主张 |

---

## 五、执行顺序

1. **先改 UI 布局**（page.tsx + Workbench.tsx + globals.css）
2. **再改 Prompt**（diverge/route.ts）
3. **测试验收**

---

## 六、不要做的事

⛔ 不要改 `useGambit.ts` 的状态结构  
⛔ 不要改 API 接口契约（输入输出字段）  
⛔ 不要删除现有的 `briefing` 字段，只改展示方式  
⛔ 不要引入新的依赖库  
⛔ 不要改动 V3.15 的四通路路由逻辑

---

## 七、参考代码片段

### V1.19 的返回按钮实现（可直接复用）

```tsx
// 来自 V1.19 page.tsx
<button 
  onClick={handleBackToHome}
  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
>
  ← 返回
</button>
```

### V1.19 的共识区样式（可参考）

```tsx
// 来自 V1.19 DisagreementCenter.tsx
<Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 relative">
  <CardContent className="p-2 pr-16">
    <div className="flex items-center gap-1 mb-1">
      <Sparkles className="w-3 h-3 text-gray-500" />
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">三个 AI 的观点</span>
    </div>
    ...
  </CardContent>
</Card>
```

---

**文档版本**：V1.0  
**生成时间**：2026-04-16  
**适用版本**：Gambit V3.15
