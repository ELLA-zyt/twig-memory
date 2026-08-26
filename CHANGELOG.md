# Changelog

## [Unreleased]

（暂无）

## [0.1.0] – 2026-08-26

衔枝首个公开 Release：从「引擎 + 评测脚本」长成「可日常使用的记忆产品」。

### 新增 · 情感层与新前端「记忆书」（2026-08-23 ~ 08-26）

- 新前端「记忆书」页面群：今日扉页 / 记忆书（日历网格 + 日卡导出）/ 故事线 / 理解文档 / 自检日志 / 设置页（引擎状态灯 + 存储占用 + 最近审计）
- 情感层三件套：日记 / 心迹 / 便签——平行于编织层、只读于引擎；用户回应经影子碎片 + ContextAnchor 进入引擎视野
- 印章与玻璃珠：8 章 × 12 珠（`shared/stamps.ts` 前后端共用注册表），盖章仪式（StampRitual + WaxSeal 真火漆压痕），一签一章不可重复
- 便签 23:00–06:00 未读弹窗；便签生成基于当日碎片与活跃线索（剥离小模型偶发前缀）
- 服务端新接口：journal / soliloquy（含 range 与 export）/ notes（current、list、单条、read、respond、stamp、generate）/ stamps（含 recent）/ calendar / threads timeline / storage / audit/last
- 装饰组件：TwigWatermark（淡水印）/ InkEmpty（留白仪轨）/ PulseLine（心跳描记线）；记忆书中缝与丝带书签
- 移除旧观测面板页面与 demo 引擎（本地存档）；`src/` 更名 `visualizer/`
- 根 README 用户化重写；`server:http` 改 tsx watch；eslint 清零
- 新增环境变量：`MUNINN_TZ` / `MUNINN_CORS_ORIGIN` / `MUNINN_RATE_LIMIT` / `MUNINN_AUTO_REFLECT` / `MUNINN_REFLECT_INTERVAL_HOURS`

### 新增 · LongMemEval-S 评测（2026-08-22）

- LongMemEval-S 首考收官：全量 500 题 **Overall 0.856 / Task-averaged 0.844 / Abstention 0.867**，零批调用失败，检索召回 turn 0.962 / session 0.989
- `eval-longmemeval.ts`：分片嵌入缓存（每题嵌完即落盘，中断只损当前实例）、`--types` 类别过滤、`--answer-model` 独立答题模型
- 修复三处测量事故：`question_date` 从未传入答题 prompt（temporal 失去时间原点）、思考型模型预算未按「思考+产出」双份给、单题级失败被计数器瞒报
- 作答 prompt 强化：有证据必须计算/推断，不许拒答（preference 类 Likely 条款）

### 服务端 / 引擎层（2026-08-21 及以前）

- **P0 缺陷修复**
  - `ThreadEvent.day` 从 `Fragment.day` 派生，避免老化偏移
  - SILENT 唤醒后清空 `silentSignals`，支持再次沉默并入池
  - abandoned 线索在热路径扑空后被归档层扫描重激活
- **P1 稳定性**
  - 新增 per-user 异步锁 `withLock`（`server/manager.ts`）
  - 损坏文件自动备份 + 告警（`server/store.ts`）
  - body 大小限制、速率限制、空 token 告警
  - 全部写操作统一走 `withLock`
  - 时区、词表、riskLevel 失效等边界修复
- **P2 改进**
  - 反转 verdict 降低关联论断置信（与“推进”区分）
  - split 合成句重新生成、审计全配对
  - 邀请过期、反转标记、`claimsUnchecked`、`fragView` 时间戳
  - `extractJson` 增加平衡括号扫描器（`visualizer/engine/llm.ts`）
- **VAD 共享层**
  - 新建 `visualizer/engine/vad.ts`，`core.ts` 与 `engine.ts` 共用同一套 VAD 估计
- **评测与接入**
  - 冲突响应测试集 22 例（基线 100%）与 LoCoMo 事实底盘（全量 1986 题总分 0.640，双口径过线）
  - MiniMax M3 传输层、BGE-M3 混合检索（BM25 + 向量 RRF + HyDE）
  - `/v1/chat` 参考宿主闭环；债务⑪合规文本公开（COMPLIANCE / CRISIS-PROTOCOL）

### UI / shadcn 组件接入（2026-08-20）

- `Dialog`：`ImportOverlay` / `ClosureOverlay` 全屏叙事浮层，支持 ESC 关闭、焦点陷阱、ARIA
- `Accordion`：`ThreadBoard.ThreadSlip` 展开态替换手写 `open/close`，获得展开动画与无障碍
- `DropdownMenu`：`AppLayout` 引擎状态卡操作菜单
- `Progress`：`UnderstandingDoc.ConvictionGauge` 替换手写 `nv-meter`
- `Select`：`ThreadBoard` 线索池切换改为下拉选择，保留键盘导航
- `Badge`：`ThreadsPage` 池数量使用标准 badge 样式，与 `Seal` 并存
- `Separator`：替换 `OverviewPage` / `ThreadsPage` 多处 `border-t` 分隔线，语义化
- `Skeleton`：`OverviewPage` 引擎 `busy` 状态显示骨架占位
- `Popover`：`UnderstandingPage` 论断证据按钮悬停/点击显示碎片摘要详情
- `Sonner` / `Toast`：`App.tsx` 挂载全局 `<Toaster>`，`DemoPage` 关键节点发送通知

### 测试

- `server/dev-smoke.ts` 新增场景 11–14（+18 断言），覆盖 P0/P1/P2 关键修复路径

### 运维

- `Dockerfile` 增加 `USER node`，以非 root 运行容器
