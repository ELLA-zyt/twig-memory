# Changelog

## [Unreleased] – 2026-08-21

### 服务端 / 引擎层
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

### UI / shadcn 组件接入
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
