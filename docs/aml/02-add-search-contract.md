# AML Add / Search 接入规范（契约全文）

> 来源：https://agentmemoryleaderboard.ai/api-guide 与 https://agentmemories.ai/zh-cn/docs §05–§07（2026-09-11 抓取）

## 总则

- Add 和 Search 的接口地址由参赛方配置，请求和响应格式按现行规范固定，**不随 URL 路径变化**
- 接口必须能从平台评测环境访问；生产环境建议 HTTPS
- URL 中不得包含用户名、密码等凭据，不得指向私有、回环或链路本地地址
- 写入方式：**同步**——记忆写入完成后 Add 才返回 `HTTP 200`
- 正式评测 Top K：**100**（按返回顺序最多读取 top_k 条）
- 检索范围：**user_id**（Add 和 Search 必须使用完全相同的 user_id）

## 鉴权与健康检查

- Add / Search 支持 `Token`、`Bearer` 和 `X-Api-Key` 三种方式；`none` 仅用于公开 smoke
- Health 接口：**无需鉴权**的 GET，返回任意 2xx 即正常
- 若未单独配置 Health 地址，正式任务默认检查 **Add 同源的 `/health`**

## Add 请求（POST）

每个来源会话默认调用一次 Add；**超过 20 条消息或 2000 个词时**，平台在最近的完整消息或句子边界分段（即一次请求可能只有部分会话）。

```json
{
  "request_id": "eval:run_abc123:locomo_refined:conv-0:chunk-0",
  "messages": [{
    "role": "user",
    "timestamp": 1704067200000,
    "content": "memory text"
  }],
  "user_id": "eval:run_abc123:locomo:conv-0",
  "session_id": "eval:run_abc123:sample:0"
}
```

| 字段 | 要求 | 说明 |
|---|---|---|
| request_id | 必填 | 唯一标识；成功响应必须原样返回 |
| messages | 必填 | 按原顺序排列；每条含 `role`（user/assistant）和非空 `content`；`timestamp` 可选，Unix 毫秒 |
| user_id | 必填 | Search 唯一使用的检索范围标识；写检必须一致 |
| session_id | 必填 | 标识来源会话，可用于组织记忆，但不作为 Search 筛选条件 |

**未使用字段**：现行规范不发送 `metadata`、`app_id`、`agent_id` 或 `async_mode`。

## Add 响应（HTTP 200）

写入完成且相关记忆能立即检索后，才能返回成功。

```json
{
  "success": true,
  "request_id": "eval:run_abc123:locomo_refined:conv-0:chunk-0",
  "user_id": "eval:run_abc123:locomo:conv-0",
  "session_id": "eval:run_abc123:sample:0"
}
```

- `success` 必填，必须是布尔 `true`
- `request_id` / `user_id` / `session_id` 全部必填，且与请求完全一致
- 服务内部可异步处理，但 Add 必须等处理完成后再返回
- **不支持**返回 HTTP 202、task ID 或状态查询地址；响应中不需要 `memory_ids`

## Search 请求（POST）

所有 Add 成功后，平台针对每道题调用一次 Search。查询使用数据集原文；选择题另行传入选项。

```json
{
  "query": "Which answer best matches the memory?",
  "options": ["A. First answer", "B. Second answer"],
  "user_id": "eval:run_abc123:locomo:conv-0",
  "top_k": 100
}
```

| 字段 | 要求 | 说明 |
|---|---|---|
| query | 必填 | 按原文检索；不得替换为最终答案，不得使用评测金标 |
| options | 可选 | 选择题候选项字符串数组；开放题不发送此字段 |
| user_id | 必填 | 只能在该 user_id 范围内检索 |
| top_k | 必填 | 返回数量不得超过；正式外部评测固定 100 |

**请求格式**：现行规范不发送 `filters`、`rerank` 或 `keyword_search`。

## Search 响应（HTTP 200）

必须是 JSON 对象，`data` 为按相关性排序的数组；无结果时返回空数组。

```json
{
  "data": [{
    "id": "mem_1",
    "content": "remembered fact text",
    "score": 0.87,
    "created_at": "2026-07-01T12:00:00Z"
  }]
}
```

| 字段 | 要求 | 说明 |
|---|---|---|
| data | 必填 | 数组；不要加 `items` 包装层，也不要直接返回顶层数组 |
| id | 必填 | 非空字符串，稳定标识该条记忆 |
| content | 必填 | 非空字符串，**直接提供给平台统一作答模型** |
| score | 可选 | 数值，越大越相关 |
| created_at | 可选 | 记忆的来源时间或持久化时间 |

未声明字段（如 `metadata`）会被忽略。

## 错误处理

| HTTP | 场景 | 平台行为 |
|---|---|---|
| 400 / 422 | 请求无法解析、成功响应缺必填字段或类型错误 | **不重试**，当前阶段立即失败，修正后重跑 smoke |
| 401 | Memory System Key 无效或鉴权方式与申请不一致 | 不重试 |
| 403 | 密钥无权调用 / 服务端拒绝指定 user_id | 不重试 |
| 404 | 路径错误或平台侧 ID 无效（现行同步规范无 Add Status 查询） | 检查 URL |
| 409 | Add 暂时无法写入 / 平台任务冲突、Run Label 重复 | Add 限定次数重试；**Search 遇 409 不重试** |
| 408 / 425 | 超时 / 服务未就绪 | 有限次退避重试 |
| 429 | 限流 / 配额未恢复 | 限定次数重试 |
| 500 / 502 / 503 / 504 | 临时服务异常 | 自动退避重试 |

**关键**：
- Add 遇 408/409/425/429/5xx 会重试；Search 重试范围相同但不含 409
- **格式错误立即终止**：即使 HTTP 200，只要 Add 未返回 `success=true` 或三个 ID 不一致，或 Search 缺 `data` 数组、某条记录缺 `id`/`content`，当前阶段立即失败

## 数据安全与隐私

- 平台只发送当前任务所需的记忆片段、user/session 标识和检索问题；**不提供金标答案、评分依据或完整数据集下载**
- user_id 是唯一检索范围标识；禁止跨 user_id 返回记忆
- 平台会保留复核所需的请求结果、耗时、错误、候选记忆和格式校验记录
- **参赛方责任**：评测数据及派生副本仅用于完成当前任务，不得用于训练、微调、产品分析、数据集重建或外传；避免记录不必要的请求正文；**任务完成后 30 天内删除相关数据**（延期须书面同意）
