# 衔枝 Twig · 叙事记忆引擎

> 现有系统记住「发生了什么」，我们的系统持续修正「我如何理解你」——
> 记忆不该是一盒卡片，该是一部还在连载的书。

**衔枝 Twig** 是一个开源的叙事记忆引擎（Narrative Memory Engine），面向一切长程 agent——陪伴、教育、医疗陪护、客户关系、NPC、个人助理。它要解决的不是「不忘记」，而是 AI 记忆的**碎片化原罪**：事实条目、事件桶、检索 top-k，治理得再好的碎片仍是碎片。人类记忆的本质不是存储而是**编织**。

当前仓库包含两部分：**前端演示（demo）**——完整实现了三层架构的可视化与交互式判定流程，可切换「实时 LLM 推理 / 预计算脚本」双轨判定；**服务端接入层**（`server/`）——无头引擎 + 真实持久化 + HTTP API + MCP server，已可接入长期会话使用（用法见 [server/README.md](server/README.md)，进展见 [当前进展](#当前进展2026-08)）。

## 三层架构

```
┌─ 认识层（长程理解层）──────────────────────────┐
│  对人/关系/主题的活叙事文档                       │
│  增量重述（改写式，非追加式）+ 版本史 + 全套防漂移机制  │
├─ 线索层（草蛇灰线系统）─────────────────────────┤
│  开放线索登记簿：追踪「未闭合的状态」               │
│  ACTIVE / DORMANT / SILENT 三池                  │
│  合成句双层结构 · 六态状态机 · merge/split/反刍节律  │
├─ 碎片层 ──────────────────────────────────────┤
│  事件桶：VAD 情感坐标 + 情绪调制衰减                │
│  （成熟机制复用层，非本项目创新主体）                │
└─────────────────────────────────────────────────┘
```

检索输出不是 top-k 卡片，而是「**叙事上下文包**」——相关碎片 + 所在线索位置 + 当前认识状态。

## 核心机制

- **草蛇灰线（线索层）**：线索的单位不是事件而是悬置的问题。登记时由 LLM 生成「回收长相」的合成猜测句并 embedding 合成句而非原句——三个月后「旧电脑终于退役了」能与「攒钱买硬盘」的线索天然相认，尽管字面零重合。判定问法去诱导化：不问「这俩相关吗」，问「Did event B modify the trajectory implied by thread A?」
- **改写式认识层**：对用户的理解是活文档，过去理解 A → 新证据重新解释 → 现在理解 B。配套防漂移机制组：证据锚定、异源反证搜索（红队 persona + HyDE 反用 + 强制裁决留痕）、conviction 分数、盲推导审计（null model 自然方差基线，系统排程触发，漂移信号对用户可见）。漂移点定位按「二分提议、反证核验」设计：单调漂移假设下以 log(n) 探针给出候选漂移点，经异源反证核验确认；非单调情形退化为分段扫描——定位尚在落地中，当前审计只做检测与标记。
- **自我实现预言断路器（四联装）**：belief/policy 解耦、endogenous 标记、对照窗口、语言去定性化——防止「认识影响回复、回复影响行为、行为反过来『验证』认识」的闭环。
- **过程评测，不是结果评测**：「她是什么样的人」不是客观标签。改为评测 AI 能否在新证据出现时合理修正认识并保留推理链——三个自建指标：Evidence Coverage / Contradiction Responsiveness / Memory Repair Test。
- **用户权利三根独立的轴**：默认全透明可见；事实层不可改、诠释层用户有最终解释权；删除降级为 `contested` 而非真忘掉或假删除。
- **危机协议**：检测到风险时模式切换而非冷冰冰拒绝——温暖、在场、不评判、永不推开；心理健康主题只记事实、不生成准诊断推断（写进架构，不写进免责条款）。

## 与相关工作的区分

| 系统 | 它做 | 我们做 |
|---|---|---|
| mem0 / Zep / Letta | 事实库（向量/图/时序） | 叙事上下文包——它们回答「你记不记得」，我们回答「AI 理解了吗」 |
| Generative Agents reflection | 追加式洞察（只变长不会变） | 改写式活文档 + 全套审计机制——日记 vs 自我认识 |
| Amory | 用叙事压缩对话历史（效率目的） | 用记忆编织对人/关系的认识——材料学 vs 关系学 |

完整论证见设计文档。

## 快速开始

```bash
npm install
npm run dev    # 默认 http://localhost:7100
```

可选：启用**实时 LLM 判定**（反例判定、伏笔回收、自由输入路由等由大模型实时推理；无 key 时自动回退到内置预计算脚本，全部功能仍可演示）：

```bash
# 在项目根目录新建 .env.local（已被 .gitignore 排除）
KIMI_API_KEY=sk-你的-Moonshot-API-Key
```

密钥只在 dev server 服务端读取，由 `/moonshot` 代理在转发时附加 Authorization 头，**不会注入客户端 bundle**。界面右侧边栏可随时切换「实时推理 / 预计算」。

```bash
npm run build   # 产物在 dist/
```

**服务端接入层**（长期会话 / 宿主 agent 接入）：

```bash
npm run server:http   # HTTP API + 远程 MCP 端点，默认 http://localhost:7300
npm run server:mcp    # MCP server（stdio，Codex / Claude Code 等可直接挂载）
```

完整 API 列表、手机 App 远程 MCP 接法、Zeabur 部署与评测管线用法，见 [server/README.md](server/README.md)。

## 仓库结构

```
src/
  engine/        叙事记忆引擎核心（事件抽取、碰撞判定、状态机、认识层更新）
  state/         EngineContext：引擎状态与双轨判定调度
  pages/         总览 / 线索层 / 认识层 / 碎片层 / 评测体系 / 用户权利 / 现场演示
  components/    聊天面板、线索看板、记忆面板、主题切换等新艺术风格组件
server/          服务端接入层：HeadlessMuninn 无头引擎、JSON 持久化、HTTP API、
                 MCP server（stdio + 远程端点）、冲突测试集与 LoCoMo 评测管线
docs/            技术设计文档 v1.3（完整机制论证与设计债务总账）
```

## 当前进展（2026-08）

- **服务端接入层已落地**：`server/` 的无头引擎（HeadlessMuninn）完整实现三层状态机、碰撞判定、SILENT 池、反刍节律（reflect）与叙事上下文包；JSON 持久化 + 多用户管理；HTTP API 与 MCP server（stdio + 远程端点）双接入——持久化、会话生命周期、宿主 agent 接口边界三个长期会话前置问题已解决。
- **设计债务 ①–⑧ 已清偿**（②为部分缓解并已如实声明）：认识层自动抽取、异源反证搜索（红队 persona + 强制裁决留痕 + 防教条化置信衰减）、盲推导审计（null model 基线 + 用户可见标记）、对照窗口 + 风险分级（含危机中止阀）、事实层本人修正标注、contested 再提门槛量化与防纠缠（两否封存）、冲突测试集构造规范。逐条对照表见 [server/README.md](server/README.md)。
- **冲突响应评测基线 22/22（100%）**：22 例场景类型学测试集 + 结构化状态迁移机械盲评（moonshot-v1-8k，2026-08），首轮跑批即抓到并修复一例负例误报。
- **LoCoMo 事实底盘验收通过（设计债务⑨已清）**：全量 10 会话 1986 题零批调用失败，**总分 0.640**——双口径均过（四类及格线宏平均 0.5551 / 文档总分口径 0.602），且高于 mem0 参照宏平均 0.617。single-hop（0.800）与 temporal（0.726）两类直接超过 mem0 参照值；open-domain（0.531 vs 0.729）为已知短板，已立项为下一靶子。配置：k=15、BM25 + BGE-M3 向量 RRF 混合检索 + HyDE 扩查询（嵌入经硅基流动），作答/判分模型 MiniMax M3（官方 API 直连）。mem0 数值为论文参照值（非同场裁判），见 [server/README.md](server/README.md)。
- **LongMemEval-S 长程记忆基线（ICLR 2025）**：全量 500 题零批调用失败，**Overall 0.856 / Task-averaged 0.844 / Abstention 0.867**。single-session-user **1.000** / single-session-assistant **0.982** / knowledge-update **0.885** / temporal-reasoning **0.820** / multi-session **0.812** / single-session-preference **0.567**。检索召回 turn-level 0.962 / session-level 0.989。管线同 LoCoMo（碎片层 + 检索，不经叙事层），判分 rubric 逐字来自官方 `evaluate_qa.py`；判分模型 MiniMax M3（官方用 GPT-4o，参照口径）。single-session-preference（0.567）为已知短板——测的是「理解偏好后个性化作答」，与叙事层评测分工。配置与明细见 [server/README.md](server/README.md)。

## Roadmap

- [ ] open-domain 跨碎片推断（0.531 vs mem0 参照 0.729）：LoCoMo 唯一未过线类别，下一个工程靶子；先跑消融对照（`--no-embed` / `--no-hyde`）与金标证据命中率分析，再动结构
- [ ] single-session-preference 个性化作答（LongMemEval 0.567）：13 道错题中 9 道证据命中但模型拒答——作答层 prompt 对偏好推断的指引不足，待修
- [x] 设计债务⑪：合规声明文本起草（not-a-medical-device / 情感数据最小化 / 命名惯例附则 → [docs/COMPLIANCE.md](docs/COMPLIANCE.md)）
- [ ] 评测系统「衔枝」独立化：冲突测试集已落地，待扩场景类型学与独立盲评流程
- [x] embedding 向量预筛进引擎碰撞候选排序（LLM 路径：配 `SF_API_KEY` 即启用，失败自动回龙脉排序；无 LLM 的规则兜底路径保留字符重合近似并继续声明）

## 文档与许可

- 技术设计文档：[docs/雾尼Muninn-技术设计文档-v1.3.md](docs/雾尼Muninn-技术设计文档-v1.3.md)
- 合规声明（不是医疗设备 / 情感数据最小化）：[docs/COMPLIANCE.md](docs/COMPLIANCE.md)
- 危机协议全文（可审计的行为契约）：[docs/CRISIS-PROTOCOL.md](docs/CRISIS-PROTOCOL.md)
- License：[MIT](LICENSE) — 其中理念渊源部分基于 OpenClaw 记忆系统框架合规重构（MIT，保留许可声明），三层架构（尤其线索层、认识层）为首次提出的独立实现
