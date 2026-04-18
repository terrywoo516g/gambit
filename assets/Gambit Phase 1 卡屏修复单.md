# Gambit Phase 1 卡屏修复单

**用途**：发给扣子编程，先修复 Phase 1 决策通路卡在第一屏“评审团分析”页面的问题。  
**注意**：本轮不要继续做 Phase 2-4，只修复 Phase 1 决策通路闭环。

---

## 一、当前问题

当前不是“继续开发新通路”的问题，而是 **Phase 1 决策通路没有真正跑通**。

### 现象
前端卡在第一屏“评审团分析”页面，无法进入审阅台 / 最终稿流程。

### 这说明
你当前完成的是：
- 节点级改造
- Prompt 替换
- 部分前端适配

但 **Decision 通路的前后端状态闭环没有打通**。

所以现在不能算“Phase 1 完成”，只能算“后端节点和部分前端改造完成，但交互主链路未跑通”。

---

## 二、本轮任务范围

### 只做这件事
**修复 Phase 1 决策通路卡屏问题，让决策主链路真实跑通。**

### 不要做这些事
- 不要继续做 Phase 2：审查通路
- 不要继续做 Phase 3：比稿通路
- 不要继续做 Phase 4：直通通路
- 不要把“字段测试通过”当作“Phase 1 完成”

---

## 三、你需要排查并修复的重点

### 1. 检查 `/api/gambit/diverge` 的真实返回结构

请不要只看类型定义或预期 schema，**要打印真实返回 JSON**，确认以下字段在决策通路下都存在并且值正常：

- `route`
- `task_package`
- `core_tension`
- `claims`
- `diff_result`
- `briefing`
- `blindspot`（如触发）
- `observer`（如触发）

### 重点确认
- 后端是否真的返回了 `briefing`
- 前端是否读取的是同名字段
- 是否还残留旧字段名：
  - `detected_prototype`
  - `reflection_done`
  - `mode`
  - `consensus_summary` 被当成主摘要字段

如果真实接口响应和前端读取字段不一致，先修这个。

---

### 2. 检查前端状态机是否真的完成升级

请重点检查以下文件：

- `useGambit.ts`
- `page.tsx`
- `AnalyzingPage.tsx`
- `Workbench.tsx`

### 预期流程应该是

```text
input
→ decision_analyzing
→ 收到完整 decision 数据后
→ decision_workbench
→ 用户点击卡片或 Captain
→ decision_synthesizing
→ decision_complete
```

### 重点排查
- 是否仍然残留旧 stage：
  - `disagreement`
  - `complete`
  - `reflection_done`
- 是否 analyzing 页的“完成条件”仍依赖旧字段
- 是否 briefing 完成后没有触发 stage 切换
- 是否因为 claims / diff_result / briefing 任一缺失，导致页面一直停在 analyzing

---

### 3. 检查 analyzing 页的完成条件

当前最可能的问题是：

你把 `reflection_done` 改成了 `briefing_done`，  
但前端“进入下一页”的逻辑没有彻底同步。

### 需要明确检查
- `analyzing_progress` 的结构是否已经改成新版
- 前端判断“分析完成”的条件是什么
- `setStage(...)` 是否真的在 briefing 完成后执行

### 正确标准
只要以下数据都就绪，就必须进入 workbench：
- `core_tension`
- `3 个 claims`
- `diff_result`
- `briefing`

不要再等待旧的 `reflection_done` 或其他已废弃条件。

---

### 4. 检查 Workbench 对 V3.15 数据结构的兼容

请确认 `Workbench.tsx` 当前渲染使用的字段是：

- `core_tension`
- `claims`
- `diff_result`
- `briefing.quick_take`
- `briefing.common_ground`
- `briefing.key_differences`
- `briefing.king_question`

### 不要继续依赖旧字段
- `consensus_summary` 作为主摘要
- `reflection`
- `detected_prototype`

如果 `briefing` 已经在接口返回里，但页面没显示，说明 Workbench 没有真正适配完成。

---

### 5. 检查 Captain 按钮是否可触发

即使 workbench 能显示，也要继续确认：

- 不选卡时能否直接点 Captain
- 选卡后是否能正常调用 `/api/gambit/synthesize`
- synthesize 输入是否包含：
  - `goal`
  - `constraints`
  - `core_tension`
  - `claims`
  - `diff_state`
  - `briefing`
  - `user_choice`
  - `user_thoughts`

### 重点
如果 synthesize 没传 `briefing`，说明你只改了 prompt，没有改通数据链路。

---

## 四、最可能的根因（优先排查顺序）

请优先按下面顺序排查：

### 根因 1：前端 stage 切换条件仍是旧逻辑
最可疑。  
表现：AnalyzingPage 一直停留，不跳转。

### 根因 2：`briefing_done` 虽然有了，但前端没用它触发完成
表现：后端跑完了，前端还在等旧字段。

### 根因 3：API 返回结构和前端读取结构不一致
表现：接口有数据，但页面拿不到。

### 根因 4：Workbench 依赖字段缺失或字段名不一致
表现：可以进入页面，但页面空白或卡死。

### 根因 5：Captain 触发链路没适配 V3.15
表现：评审台看得到，但点不动、无法生成最终稿。

---

## 五、本轮验收方式

不要只做字段测试，请做一次 **真实端到端验证**。

### 测试输入

```text
团队只有 3 个人，Q3 应该先做用户增长还是先做商业化？
```

### 必须满足的验收标准

1. 前端能从输入页进入 `decision_analyzing`
2. analyzing 完成后自动进入 `decision_workbench`
3. workbench 能看到：
   - `core_tension`
   - 三张卡
   - `diff_result`
   - `briefing`
4. 用户可以直接点 Captain
5. 最终稿成功生成
6. 整个过程不刷新、不报错、不卡死

### 如果以上任何一步不成立
都不能宣称“Phase 1 已完成”。

---

## 六、完成后请输出的内容

本轮修复完成后，请只输出以下四项：

### 1. 根因分析
说明卡在第一屏的真实原因是什么。

### 2. 修复文件清单
列出修改了哪些文件，例如：
- `useGambit.ts`
- `page.tsx`
- `AnalyzingPage.tsx`
- `Workbench.tsx`
- `/api/gambit/diverge`
- `/api/gambit/synthesize`

### 3. 真实端到端测试结果
用上面的测试输入跑一遍，说明每一步是否成功。

### 4. 是否满足 Phase 1 完成标准
只允许输出两种结论：
- **已满足**
- **未满足，原因是 ...**

不要再输出“Router 测试通过”“Agent 字段通过”这类节点级单测作为完成依据。

---

## 七、执行原则

### 本轮只做“打通”，不做“扩展”
现在最重要的不是多做节点，而是把：

```text
输入 → analyzing → workbench → synthesize → final
```

这条决策主链路跑通。

### 不要误判任务完成
- 节点级测试通过 ≠ 功能完成
- Prompt 替换完成 ≠ 前端可用
- TypeScript 编译通过 ≠ 用户链路跑通

### 先打通，再做 Phase 2-4
只有当决策通路完整可用后，才继续做审查、比稿、直通。

---

## 八、给你的直接任务总结

你现在需要做的是：

> **修复 Phase 1 决策通路卡在第一屏的问题，并用真实端到端流程证明它已经跑通。**

不是继续扩展新功能，不是继续写总结，不是继续做局部字段测试。

---

**文档结束**
