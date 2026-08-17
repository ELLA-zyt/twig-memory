# 衔枝 Twig · 危机协议（全文公开 · 可审计）

> **语言**：中文为主文本，文末附英文摘要。如有歧义，以中文版为准。
> **锚点纪律**：本文件是**行为契约**，与代码版本绑定更新——行为变更必须同步修改本文件与对应 smoke 场景。行号以 commit `c5a148a` 为准，符号名稳定。
> **红队纪律**：未实现的行为如实标注「设计承诺」，不混入已实现清单。

## 实现状态总表

| 机制 | 状态 | 锚点 |
|---|---|---|
| 危机信号词表 | ✅ 已实现 | `server/core.ts:57` |
| 命中即中止全部对照窗口、恢复正常干预 | ✅ 已实现 | `server/core.ts:324-329` |
| 窗口安全阀指令（注入宿主上下文） | ✅ 已实现 | `server/core.ts:1105-1109` |
| 高风险词表 fail-safe（命中即拒，不经 LLM） | ✅ 已实现 | `server/core.ts:55` |
| 中止阀无开关、无条件生效（裁剪需主动改代码） | ✅ 已实现 | `server/core.ts:324`（无条件代码路径） |
| smoke 覆盖：危机中止阀 | ✅ 已实现 | `server/dev-smoke.ts` 场景 7e（`:428-434`） |
| 危机模式专用系统提示词（温暖、在场、不评判、永不推开） | ⬜ 设计承诺，未实现 | 设计文档 §7.1 原则 3 |
| 预置求助信息模块（求助渠道 / 热线） | ⬜ 设计承诺，未实现 | 设计文档 §7.1 原则 2 |
| 明文禁用拒绝式话术 | ⬜ 设计承诺，未实现 | 设计文档 §7.1 原则 3 |
| 「检测即注入危机指令」的通用通道 | ⬜ 未实现：当前仅对照窗口中止路径 | 设计文档 §7.1 原则 2 |

## 三原则（设计文档 §7.1 全文）

1. **不做判断，必须介入**：「不是让我们替用户的安全负责，是我们**不能**对用户的安全不负责」——不主动包揽一切医疗保障，只做危机时刻的必要干预。
2. **检测到风险立刻注入危机指令**：提供求助渠道；用户决策能力下降时**重复推出求助渠道并持续确认用户安全**。
3. **绝不推开用户**：现有系统的最大恶是检测到风险后冷冰冰拒绝、切断、二次伤害。危机模式 = **模式切换**（专用系统提示词：温暖、在场、不评判、永不推开 + 中低温度求确定性 + 预置求助信息模块 + 明文禁用拒绝式话术）。温暖来自设计过的话术框架，不来自随机性。**危机指令注入通道的核心职责之一：对抗模型自身安全协议的防御性退缩。**

## 已实现行为契约（逐条可核对）

- **词表内容**：`自杀 | 自残 | 轻生 | 不想活 | 想死 | 伤害自己 | 活不下去`（`server/core.ts:57`）。
- **命中行为**：`ingest` 时命中危机词 → 该用户所有开放对照窗口立即标记 `aborted` 并记录中止原因（「窗口期内出现危机信号，立即恢复正常干预」），宿主恢复正常干预（`server/core.ts:324-329`）。
- **安全阀原文**（窗口期内注入宿主上下文的指令尾部）：「若出现任何健康或安全风险信号，立即中止对照、正常干预——对照永远让位于用户福祉」（`server/core.ts:1109`）。
- **无开关**：中止阀是无条件代码路径，不挂任何环境变量；裁掉它需要主动修改源码——这是刻意的工程默认。
- **测试背书**：smoke 场景 7e 断言危机信号出现后窗口状态变为 `aborted`（`server/dev-smoke.ts:428-434`）。

## 未实现部分对集成者意味着什么

当前版本把「危机时刻说什么、怎么把求助渠道递到用户面前」留给宿主 agent。在上表「设计承诺」落地之前，**集成者应在宿主侧自行实现危机应对话术与求助渠道展示**。衔枝引擎现阶段保证的是：危机信号出现时，引擎的一切实验性机制（对照窗口）立即让位，且窗口期指令始终携带安全阀。

诚实说明：引擎位于宿主外部，无法强制宿主的回复行为——这是架构边界，不是免责声明。

## 变更纪律

- 词表、命中行为、指令文本的任何变更 → 同一 commit 内更新本文件与 smoke 场景；
- 「设计承诺」某项落地时 → 移入已实现清单并附锚点；
- 本文件的 git 历史即危机协议的审计轨迹。

---

## English Summary (conclusions only)

Twig's crisis protocol is a public, auditable behavior contract versioned with the code. **Implemented today**: a crisis lexicon (`server/core.ts:57`); on any hit, all open control windows abort immediately and normal intervention resumes (`core.ts:324-329`); window-period context always carries the safety-valve instruction ("user welfare always overrides experiments"); the abort path has no feature flag — removing it requires editing the source, by design; behavior is locked by smoke scenario 7e. **Promised but not yet implemented** (labeled as such, per design doc §7.1): the dedicated crisis-mode system prompt, the prebuilt help-resource module, and the ban on refusal-style replies. Until those land, integrators must implement crisis response wording and help-resource surfacing on the host side. Honest boundary: the engine lives outside the host agent and cannot force host replies. In case of any discrepancy, the Chinese text prevails.
