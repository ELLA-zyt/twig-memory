# 衔枝 Twig · 合规声明（COMPLIANCE）

> **语言**：中文为主文本，文末附英文摘要（仅结论，不展开论证）。如有歧义，以中文版为准。
> **锚点纪律**：每个第②层的条目都指向代码实现（`文件:行号`；行号以 commit `c5a148a` 为准，符号名稳定）。本文件不出现代码里不存在的行为——合规文本也是 claims，超前宣传的纪律在这里同样适用。
> **读者**：第一读者是评估「要不要把衔枝嵌进自己产品」的集成者与评审。每个第①层写成白话，集成者可原样转述给自己的终端用户。

---

## 声明一：这不是医疗设备（not-a-medical-device）

### ① 它是什么、不是什么

衔枝（雾尼 Muninn）是一个开源的叙事记忆引擎——给长期运行的 AI agent 提供「记住并理解人」的基础设施。

它**不是**医疗设备，**不是**心理健康服务，不提供诊断、治疗、预防或康复建议。它对心理健康相关主题只做事实层面的记录（如「这周三次提到失眠」），不生成任何准诊断推断（不写「抑郁恶化」）。

如果你的产品面向有心理健康需求的用户，衔枝不构成其中的任何医疗或临床组成部分，也不能替代专业帮助。

### ② 架构上如何保证

- **论断权限墙写进生成层**：认识层反刍与盲推导的 prompt 均硬性规定「心理健康相关主题只记事实，不生成准诊断推断」（`src/engine/llm.ts:209` 规则 7、`src/engine/llm.ts:406`）。
- **风险分级 fail-safe**：对照窗口（系统的自我验证机制）仅对 `low` 风险论断开放；高风险词表（医院/失眠/抑郁/自杀/债务等）命中即拒，不经 LLM、零成本、fail-safe（`server/core.ts:55`）；LLM 不可用时保守判 `medium` 拒绝开窗——宁可不开窗，不可错开窗（`server/core.ts:806-810`）。
- **危机信号优先于一切实验机制**：见 [CRISIS-PROTOCOL.md](CRISIS-PROTOCOL.md)。

### ③ 给集成者的建议（非强制）

- 不要把衔枝的论断或叙事上下文包包装成健康评估、心理测评、情绪诊断等功能对外呈现。
- 面向终端用户转述时，可直接使用第①层文本。
- 保留危机协议（见 [CRISIS-PROTOCOL.md](CRISIS-PROTOCOL.md)）——它是承重安全组件，不是可选装饰。

---

## 声明二：情感数据最小化

### ① 白话层

衔枝会记录对话事件的三维情感坐标（VAD：效价 / 唤醒 / 支配）与线索的情感权重。这些信号只有一个用途：**维持陪伴的连续性**——决定什么该淡忘、什么该沉淀、什么在沉默中保留权重。它们不用于、也不应被用于生成任何健康评估或心理画像结论。

记忆数据默认存储在**部署者自己的服务器**上（每用户一个 JSON 文件），不上传给引擎作者；引擎没有遥测。

### ② 架构上如何保证

- 情感坐标定义为三维连续信号，仅服务于衰减与池管理（`src/engine/types.ts:6-9`；SILENT 入池判定使用情感权重，`server/core.ts:230-242`）。
- 「不输出健康评估」由论断权限墙保证（同上，`src/engine/llm.ts:209`、`:406`）。
- **用户权利三轴在代码层面成立**：论断全量可见（`GET /v1/claims`，`server/http.ts:8`）；事实层本人修正——碎片原文永不改动，只追加标注，判定层经统一视图看到修正后的事实（`server/core.ts:44-49`、`:508`）；删除降级为 `contested` 而非抹除（`server/core.ts:490`；两次否决即永久退出再提通道，`:495`、`:649`）。
- 数据驻留：持久化目录由部署者控制（`MUNINN_DATA_DIR`，`server/store.ts:11`）。
- 对应 smoke 场景：修正标注与两否封存（`server/dev-smoke.ts` 场景八，`:457-471`）。

### ③ 给集成者的建议（非强制）

- 最小化再往下一层：只 ingest 维持连续性所需的事件，不要把整条会话流水无差别灌入。
- 不要把碎片库 / 论断库二次用于训练、画像或广告定向。
- 向你的终端用户提供查看、修正、否决记忆的入口（API 已具备）。

---

## 附则：命名惯例（社区规范，非许可证条款）

衔枝以 MIT 许可证发布——我们不、也不能在许可证上附加使用限制。作为社区规范：**移除了危机协议（[CRISIS-PROTOCOL.md](CRISIS-PROTOCOL.md) 所述机制）的部署，请不要自称「基于雾尼 Muninn / 衔枝 Twig」，也不要暗示其具有与本项目相当的安全行为。** 这不是法律义务，是署名诚实。

---

## English Summary (conclusions only)

Twig (Muninn) is an open-source narrative memory engine for long-running agents. **It is not a medical device** and provides no diagnosis, treatment, or mental-health assessment; on mental-health topics it records facts only and never generates quasi-diagnostic inferences — this wall is enforced in the generation prompts themselves (`src/engine/llm.ts`), not merely in this disclaimer. **Affective data (VAD coordinates, emotional weights) serves continuity of companionship only** — decay and pool management — and must not be repurposed for health profiling; memory data stays on the deployer's own storage, with user rights (full visibility, annotation-based correction, contested-instead-of-deletion) implemented in code. The crisis protocol is a **load-bearing safety component**; deployments that remove it should not present themselves as "based on Muninn/Twig" (community norm, not a license condition — the license remains MIT). In case of any discrepancy, the Chinese text prevails.
