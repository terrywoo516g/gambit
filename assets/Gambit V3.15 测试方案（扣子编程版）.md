# Gambit V3.15 测试方案（扣子编程版）

本文档供扣子编程直接跑测试，每个测试给出具体输入和期望输出格式。

---

## 测试一：Router 四分类（20 case）

**执行方式**：调用 Router 节点，输入 user_input，验证输出。

### 测试数据

```json
[
  {"id": 1, "input": "Python 怎么读 CSV", "expect_route": "direct", "expect_complexity": "low"},
  {"id": 2, "input": "可口可乐总部在哪个城市", "expect_route": "direct", "expect_complexity": "low"},
  {"id": 3, "input": "用 500 字解释区块链原理", "expect_route": "direct", "expect_complexity": "medium"},
  {"id": 4, "input": "这段合同翻译有没有法律语义偏差：The Seller warrants that the goods shall be free from defects in material and workmanship for a period of twelve (12) months from the date of delivery. 翻译：卖方保证货物在交货之日起十二个月内无材料和工艺缺陷。", "expect_route": "direct", "expect_complexity": "high", "expect_stakes": "high"},
  {"id": 5, "input": "帮我看看这封邮件语气对不对：亲爱的张总，关于上次会议讨论的方案，我认为贵司的报价偏高，希望能够重新考虑。如不能调整，我们可能需要寻找其他合作伙伴。", "expect_route": "review", "expect_review_subtype": "content"},
  {"id": 6, "input": "这个活动方案有没有漏洞：五一促销方案：1. 全场8折 2. 满1000减200 3. 前100名送礼品 4. 活动时间5月1日-5月7日", "expect_route": "review"},
  {"id": 7, "input": "帮我优化这段代码的性能：def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)", "expect_route": "review"},
  {"id": 8, "input": "帮我写一个可口可乐五一推广文案", "expect_route": "compete"},
  {"id": 9, "input": "这三个标题哪个好：A. 夏日狂欢季 B. 清凉一夏 C. 暑期特惠来袭", "expect_route": "compete", "has_material": true},
  {"id": 10, "input": "帮我写一封拒绝供应商的邮件", "expect_route": "compete"},
  {"id": 11, "input": "帮我写个标题", "expect_route": "compete", "expect_complexity": "low"},
  {"id": 12, "input": "该不该现在换工作", "expect_route": "decision", "expect_complexity": "high"},
  {"id": 13, "input": "我们的 SaaS 产品怎么冷启动", "expect_route": "decision"},
  {"id": 14, "input": "团队 3 人，Q3 先做增长还是先做商业化", "expect_route": "decision"},
  {"id": 15, "input": "把这篇文章改成小红书版本：人工智能正在改变我们的生活方式。从智能手机到自动驾驶，AI技术已经渗透到各个领域。专家预测，未来十年AI将创造更多就业机会...", "expect_route": "compete", "note": "边界case：改写是比稿不是审查"},
  {"id": 16, "input": "帮我写三个方案然后选一个最好的", "expect_route": "compete", "note": "边界case：生成+选优是比稿不是决策"},
  {"id": 17, "input": "这个创业方案有没有漏洞：我打算做一个AI写作工具，目标用户是大学生，收费模式是月费制...", "expect_route": "review", "note": "边界case：找问题是审查不是决策"},
  {"id": 18, "input": "帮我翻译这段话：今天天气很好，我们去公园散步吧", "expect_route": "direct", "expect_complexity": "low"},
  {"id": 19, "input": "GPT-4 和 Claude 哪个更好", "expect_route": "decision", "note": "开放性比较，无标准答案"},
  {"id": 20, "input": "用 React 写一个 Todo 应用", "expect_route": "compete"}
]
```

### 评判标准

```javascript
function evaluateRouter(result, expected) {
  const checks = {
    json_valid: isValidJSON(result),
    route_correct: result.route === expected.expect_route,
    complexity_correct: !expected.expect_complexity || result.complexity === expected.expect_complexity,
    stakes_correct: !expected.expect_stakes || result.stakes === expected.expect_stakes,
    review_subtype_correct: !expected.expect_review_subtype || result.review_subtype === expected.expect_review_subtype,
    has_material_correct: expected.has_material === undefined || result.has_material === expected.has_material
  };
  return checks;
}

// 合格线：route 正确率 ≥ 85%（17/20），边界case（#15,#16,#17）全部正确
```

---

## 测试二：核心张力（5 case）

**执行方式**：调用核心张力节点，输入 goal/constraints/materials。

### 测试数据

```json
[
  {
    "id": 1,
    "goal": "该不该现在离职去创业，我有 50 万存款，老婆刚怀孕",
    "constraints": ["存款50万", "老婆怀孕"],
    "materials": ""
  },
  {
    "id": 2,
    "goal": "SaaS 产品冷启动策略",
    "constraints": ["团队5人", "种子资金100万"],
    "materials": ""
  },
  {
    "id": 3,
    "goal": "团队 3 人，先做用户增长还是商业化",
    "constraints": ["团队3人", "runway还有6个月"],
    "materials": ""
  },
  {
    "id": 4,
    "goal": "公司年会要不要取消改成团建",
    "constraints": ["预算10万", "员工200人"],
    "materials": ""
  },
  {
    "id": 5,
    "goal": "新产品定价定高还是定低",
    "constraints": ["竞品价格99元", "我们成本60元"],
    "materials": ""
  }
]
```

### 评判标准

```javascript
function evaluateCoreTension(result) {
  const banned_words = ["综合", "全面", "平衡", "能力", "效果", "质量", "体验", "优化", "提升"];
  const generic_tensions = ["速度 vs 质量", "短期 vs 长期", "风险 vs 收益", "成本 vs 效果"];
  
  const checks = {
    json_valid: isValidJSON(result),
    no_banned_words: !banned_words.some(w => result.core_tension.includes(w)),
    not_generic: !generic_tensions.some(t => result.core_tension.includes(t)),
    is_specific: result.core_tension.length >= 10 && result.core_tension.includes("vs")
  };
  return checks;
}

// 合格线：5/5 无禁用词，4/5 不使用万能张力
```

---

## 测试三：三个 Agent（3 决策问题 × 3 Agent = 9 次）

**执行方式**：先跑核心张力，再分别调用三个 Agent 节点。

### 测试数据

```json
[
  {
    "id": 1,
    "goal": "该不该现在离职去创业，我有 50 万存款，老婆刚怀孕",
    "constraints": ["存款50万", "老婆怀孕", "当前月薪3万"],
    "materials": "",
    "core_tension": "（由核心张力节点生成）"
  },
  {
    "id": 2,
    "goal": "我们是一个 5 人小团队做的 AI 写作工具，DAU 500，收到大厂收购 offer 3000万，要不要接受",
    "constraints": ["团队5人", "DAU 500", "offer 3000万", "还有6个月runway"],
    "materials": "",
    "core_tension": "（由核心张力节点生成）"
  },
  {
    "id": 3,
    "goal": "公司要扩张，开新城市还是深耕现有城市",
    "constraints": ["现有城市市占率30%", "扩张预算500万", "竞对已进入3个新城市"],
    "materials": "",
    "core_tension": "（由核心张力节点生成）"
  }
]
```

### 评判标准

```javascript
function evaluateAgent(result, agent_type) {
  const claim = result.claims[0];
  
  const checks = {
    json_valid: isValidJSON(result),
    agent_id_correct: result.agent_id === `agent_${agent_type}`,
    key_action_length: claim.key_action.length >= 8 && claim.key_action.length <= 25,
    key_action_is_action: !["重视", "注重", "加强", "提升", "优化"].some(w => claim.key_action.startsWith(w)),
    thesis_has_three_parts: claim.thesis.includes("先") && claim.thesis.includes("不") && claim.thesis.includes("因为"),
    not_now_not_empty: claim.not_now && claim.not_now.length > 5,
    why_not_now_not_empty: claim.why_not_now && claim.why_not_now.length > 10,
    rationale_has_two: claim.rationale.length >= 2,
    rationale_second_mentions_others: claim.rationale[1] && (claim.rationale[1].includes("激进") || claim.rationale[1].includes("稳健") || claim.rationale[1].includes("务实") || claim.rationale[1].includes("其他") || claim.rationale[1].includes("另外")),
    confidence_valid: claim.confidence >= 0 && claim.confidence <= 1
  };
  return checks;
}

// 合格线（每个 Agent）：
// - key_action 长度 8-25 字且到动作层
// - thesis 包含"先做/不先做/因为"
// - not_now 和 why_not_now 不为空
// - rationale[1] 提到其他方向

// 三张卡对比检查：
function compareThreeAgents(radical, steady, pragmatic) {
  const checks = {
    key_actions_different: new Set([radical.claims[0].key_action, steady.claims[0].key_action, pragmatic.claims[0].key_action]).size === 3,
    not_now_different: new Set([radical.claims[0].not_now, steady.claims[0].not_now, pragmatic.claims[0].not_now]).size >= 2
  };
  return checks;
}
```

---

## 测试四：局势简报（3 case，复用测试三的输出）

**执行方式**：用测试三的三张 Agent 卡输出作为输入。

### 评判标准

```javascript
function evaluateBriefing(result) {
  const checks = {
    json_valid: isValidJSON(result),
    common_ground_not_empty_talk: !result.common_ground.some(g => 
      g.includes("目标很重要") || g.includes("需要考虑") || g.includes("资源有限") || g.includes("都同意")
    ),
    common_ground_can_be_empty: true, // 空数组是允许的
    key_differences_count: result.key_differences.length >= 2 && result.key_differences.length <= 3,
    key_differences_specific: result.key_differences.every(d => 
      d.radical !== d.steady && d.steady !== d.pragmatic && d.radical !== d.pragmatic
    ),
    king_question_is_choice: result.king_question.includes("还是") || result.king_question.includes("或者") || result.king_question.includes(" vs "),
    king_question_not_repeat_goal: true, // 人工检查
    quick_take_length: result.quick_take.length >= 40 && result.quick_take.length <= 80,
    no_banned_words: !["综合", "全面", "平衡", "优化", "提升"].some(w => 
      result.quick_take.includes(w) || result.king_question.includes(w)
    )
  };
  return checks;
}

// 合格线：
// - king_question 是选择题格式（包含"还是"/"或者"）
// - common_ground 不是空话（或为空数组）
// - key_differences 三方立场各不相同
// - quick_take 40-80 字
```

---

## 测试五：比稿交叉评审（3 case）

**执行方式**：先用三个不同模型生成三个版本，再调用交叉评审节点。

### 测试数据

```json
[
  {
    "id": 1,
    "goal": "帮我写一个可口可乐五一推广文案，面向 18-25 岁年轻人，投放小红书",
    "constraints": ["目标受众18-25岁", "投放小红书", "五一节日"],
    "note": "需要先分别用 Kimi/智谱/DeepSeek 生成三个版本"
  },
  {
    "id": 2,
    "goal": "帮我写一封婉拒合作邀请的邮件，对方是我们重要合作伙伴",
    "constraints": ["需要婉拒", "保持关系", "留有余地"],
    "note": "测试邮件类产出"
  },
  {
    "id": 3,
    "goal": "帮我写一个 App 上线发布会的活动方案",
    "constraints": ["预算50万", "场地北京", "邀请媒体和KOL"],
    "note": "测试方案类产出"
  }
]
```

### 评判标准

```javascript
function evaluateCompeteReview(result) {
  const checks = {
    json_valid: isValidJSON(result),
    three_versions: result.version_summaries.length === 3,
    labels_different: new Set(result.version_summaries.map(v => v.label)).size === 3,
    labels_not_generic: !result.version_summaries.some(v => 
      v.label.includes("较好") || v.label.includes("一般") || v.label.includes("优秀")
    ),
    strengths_specific: result.version_summaries.every(v => v.top_strength.length >= 10),
    weaknesses_specific: result.version_summaries.every(v => v.top_weakness.length >= 10),
    key_differences_count: result.key_differences.length >= 2 && result.key_differences.length <= 3,
    recommended_base_valid: ["A", "B", "C"].includes(result.recommended_base),
    recommendation_reason_exists: result.recommendation_reason.length >= 20
  };
  return checks;
}

// 合格线：
// - 三个 label 互不相同且具体
// - top_strength/top_weakness 具体（≥10字）
// - key_differences 2-3 个维度
// - recommended_base 有理由
```

---

## 测试六：审查三视角 + 汇总（3 case）

**执行方式**：准备有问题的内容，分别调用逻辑/受众/风险三个审查节点，再调用汇总节点。

### 测试数据

```json
[
  {
    "id": 1,
    "goal": "帮我看看这封催款邮件有什么问题",
    "material": "王总，贵司已逾期30天未付款，金额50万。如3日内不付款，我们将采取法律手段。另外，贵司上次合作的产品质量问题至今未解决，希望一并处理。期待回复。",
    "note": "预期问题：语气强硬、两个问题混在一起、缺少正式落款"
  },
  {
    "id": 2,
    "goal": "帮我审一下这个推广方案",
    "material": "五一促销方案：目标销售额提升200%。策略：1）全场5折 2）满500送iPhone 3）前1000名送茅台。预算：10万元。执行：全员转发朋友圈。预期效果：必将引爆市场，成为行业标杆。",
    "note": "预期问题：目标不切实际、预算与赠品不匹配、承诺过满"
  },
  {
    "id": 3,
    "goal": "帮我看看这份汇报稿",
    "material": "Q1工作总结：本季度我们团队在领导的正确指导下，认真贯彻公司战略方针，积极开拓市场，取得了一定成绩。下一步，我们将继续努力，争取更大进步。",
    "note": "质量相对较高但空洞，测试是否会过度挑刺"
  }
]
```

### 评判标准（审查视角）

```javascript
function evaluateReviewPerspective(result, perspective) {
  const bad_titles = ["表达不清", "逻辑不足", "需要优化", "存在问题", "有风险", "需改进"];
  
  const checks = {
    json_valid: isValidJSON(result),
    perspective_correct: result.perspective === perspective,
    issues_count: result.issues.length >= 0 && result.issues.length <= 7,
    issues_have_evidence: result.issues.every(i => i.evidence && i.evidence.length >= 5),
    titles_not_generic: !result.issues.some(i => bad_titles.some(bt => i.title.includes(bt))),
    severity_reasonable: !result.issues.every(i => i.severity === "high"), // 不能全是 high
    suggestions_specific: result.issues.every(i => i.suggestion.length >= 10),
    overall_assessment_exists: result.overall_assessment.length >= 10
  };
  return checks;
}
```

### 评判标准（审查汇总）

```javascript
function evaluateReviewSummary(result) {
  const checks = {
    json_valid: isValidJSON(result),
    consensus_detected_by_is_array: result.consensus_issues.every(i => Array.isArray(i.detected_by)),
    unique_detected_by_is_array: result.unique_issues.every(i => Array.isArray(i.detected_by)),
    consensus_has_multiple_sources: result.consensus_issues.every(i => i.detected_by.length >= 2),
    unique_has_single_source: result.unique_issues.every(i => i.detected_by.length === 1),
    conflicts_can_be_empty: true, // 空数组是正常的
    no_new_findings: true, // 需要人工验证：所有 issue 都能在三个视角中找到来源
    overall_verdict_exists: result.overall_verdict.length >= 10
  };
  return checks;
}

// 合格线：
// - detected_by 都是数组
// - conflicts 如果为空是正常的（不硬造）
// - 没有添加新发现
```

---

## 测试六-B：审查 Captain 合成报告（3 case）

**执行方式**：用测试六的汇总结果作为输入，调用审查 Captain 节点。

### 评判标准

```javascript
function evaluateReviewCaptain(result) {
  // 这是 Markdown 输出，需要解析
  const checks = {
    has_conclusion: result.includes("## 审查结论"),
    has_priority_list: result.includes("## 优先修改清单"),
    priority_items_have_source: (result.match(/检出：/g) || []).length >= 1, // 至少一项标注了检出来源
    has_original_quote: result.includes("**原文**") || result.includes("原文："),
    has_specific_suggestion: result.includes("**建议**") || result.includes("建议："),
    length_reasonable: result.length <= 3000 // 不超过600字约3000字符
  };
  return checks;
}

// 合格线：
// - 每个优先修改项都标注了检出来源（如"逻辑+风险共同发现"）
// - 修改建议具体可执行
```

---

## 测试七：比稿 Captain 合成（3 case，复用测试五）

**执行方式**：用测试五的交叉评审结果，调用比稿 Captain 节点。

### 评判标准

```javascript
function evaluateCompeteCaptain(result) {
  const checks = {
    has_separator: result.includes("---"),
    has_fusion_note: result.includes("融合说明") || result.includes("**融合说明**"),
    content_clean: !result.split("---")[0].includes("参考版本") && !result.split("---")[0].includes("（此处"),
    fusion_note_mentions_versions: result.includes("版本 A") || result.includes("版本 B") || result.includes("版本 C") || result.includes("版本A") || result.includes("版本B") || result.includes("版本C"),
    content_usable: result.split("---")[0].length >= 100 // 正文足够长
  };
  return checks;
}

// 合格线：
// - 正文干净，无括号来源标注
// - 用 --- 分隔后有融合说明
// - 融合说明提到了参考的版本
```

---

## 测试八：直通通路（2 case）

**新增测试**：验证 complexity/stakes 对执行方式的影响。

### 测试数据

```json
[
  {
    "id": 1,
    "input": "Python 怎么读 CSV",
    "expect_execution": "单模型直答",
    "expect_complexity": "low",
    "expect_stakes": "low"
  },
  {
    "id": 2,
    "input": "这段英文合同翻译有没有法律语义偏差：The Seller shall indemnify and hold harmless the Buyer from any claims arising out of the Seller's breach of this Agreement. 翻译：卖方应赔偿买方因卖方违约而产生的任何索赔。",
    "expect_execution": "三模型合成",
    "expect_complexity": "high",
    "expect_stakes": "high",
    "expect_conservative_language": true
  }
]
```

### 评判标准

```javascript
function evaluateDirectCaptain(result, expected) {
  const conservative_phrases = ["可能", "建议咨询", "具体情况", "专业人士", "需核实", "供参考"];
  
  const checks = {
    content_exists: result.length >= 50,
    conservative_if_high_stakes: !expected.expect_conservative_language || conservative_phrases.some(p => result.includes(p)),
    no_meta_description: !result.includes("综合三个") && !result.includes("根据三个模型")
  };
  return checks;
}

// 合格线：
// - high stakes 时有保守表述
// - 不包含"综合三个模型"等元描述
```

---

## 执行顺序与优先级

| 优先级 | 测试 | 预计时间 | 说明 |
|--------|------|----------|------|
| P0 | 测试一：Router | 10分钟 | 20个case自动跑 |
| P0 | 测试三：Agent | 15分钟 | 3问题×3Agent |
| P0 | 测试四：局势简报 | 5分钟 | 复用测试三输出 |
| P1 | 测试六：审查 | 15分钟 | 3内容×3视角+汇总 |
| P1 | 测试六-B：审查Captain | 5分钟 | 复用测试六输出 |
| P1 | 测试五：比稿评审 | 15分钟 | 需要先生成三版本 |
| P1 | 测试七：比稿Captain | 5分钟 | 复用测试五输出 |
| P2 | 测试二：核心张力 | 5分钟 | 5个case |
| P2 | 测试八：直通 | 5分钟 | 2个case |

**总计约 80 分钟**

---

## 输出格式要求

扣子编程跑完后，请输出以下格式的测试报告：

```markdown
# Gambit V3.15 测试报告

## 测试概览

| 测试项 | 总case | 通过 | 失败 | 通过率 |
|--------|--------|------|------|--------|
| Router | 20 | ? | ? | ?% |
| Agent | 9 | ? | ? | ?% |
| 局势简报 | 3 | ? | ? | ?% |
| 审查三视角 | 9 | ? | ? | ?% |
| 审查汇总 | 3 | ? | ? | ?% |
| 审查Captain | 3 | ? | ? | ?% |
| 比稿评审 | 3 | ? | ? | ?% |
| 比稿Captain | 3 | ? | ? | ?% |
| 核心张力 | 5 | ? | ? | ?% |
| 直通Captain | 2 | ? | ? | ?% |

## 失败详情

### [失败的测试项]
- Case ID: ?
- 输入: ?
- 期望: ?
- 实际: ?
- 问题原因: ?

## 建议修改

1. [根据失败case提出的prompt修改建议]
```

---

## 合格标准

| 测试项 | 合格线 |
|--------|--------|
| Router | route正确率≥85%，边界case(#15,#16,#17)全部正确 |
| Agent | key_action到动作层，not_now/why_not_now不为空，三卡可区分 |
| 局势简报 | king_question是选择题，common_ground不是空话 |
| 审查 | issue标题具体，detected_by是数组，conflicts可为空 |
| 比稿 | 正文干净无括号标注，融合说明提到版本来源 |
| 直通 | high stakes有保守表述 |
| 核心张力 | 0禁用词，不使用万能张力 |

**整体合格标准**：各测试项通过率均≥80%，且P0测试项无重大失败。
