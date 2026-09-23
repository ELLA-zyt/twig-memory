/**
 * AML 契约自检脚本
 *
 * 逐项断言 Add/Search/Health/鉴权/隔离性，任一 FAIL 则非零退出。
 */

const BASE = process.env.AML_BASE_URL || 'http://localhost:7301'
const TOKEN = process.env.AML_AUTH_TOKEN || ''

interface CheckResult {
  name: string
  ok: boolean
  detail?: string
}

const results: CheckResult[] = []

function pass(name: string, detail?: string): void {
  results.push({ name, ok: true, detail })
  console.log(`PASS  ${name}${detail ? ` · ${detail}` : ''}`)
}

function fail(name: string, detail: string): void {
  results.push({ name, ok: false, detail })
  console.log(`FAIL  ${name} · ${detail}`)
}

async function request(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.token !== undefined) {
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  } else if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`
  }
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  let body: unknown = null
  try { body = await resp.json() } catch { /* 非 JSON 响应置空 */ }
  return { status: resp.status, body }
}

async function main(): Promise<void> {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // 1. Health 无需鉴权
  try {
    const { status } = await request('GET', '/health')
    if (status === 200) pass('GET /health 无 token 返回 200')
    else fail('GET /health 无 token 返回 200', `实际 ${status}`)
  } catch (err) {
    fail('GET /health 无 token 返回 200', err instanceof Error ? err.message : String(err))
  }

  // 2. 错误 token 401（仅在设置了 token 时）
  if (TOKEN) {
    try {
      const { status } = await request('POST', '/aml/add', { body: { request_id: 'r', messages: [{ role: 'user', content: 'c' }], user_id: 'u', session_id: 's' }, token: 'wrong-token' })
      if (status === 401) pass('错误 token POST /aml/add 返回 401')
      else fail('错误 token POST /aml/add 返回 401', `实际 ${status}`)
    } catch (err) {
      fail('错误 token POST /aml/add 返回 401', err instanceof Error ? err.message : String(err))
    }
  } else {
    pass('AML_AUTH_TOKEN 未设置，跳过错误 token 401 断言')
  }

  // 3. 缺 user_id 400
  try {
    const { status } = await request('POST', '/aml/add', { body: { request_id: 'r', messages: [{ role: 'user', content: 'c' }], session_id: 's' } })
    if (status === 400) pass('add 缺 user_id 返回 400')
    else fail('add 缺 user_id 返回 400', `实际 ${status}`)
  } catch (err) {
    fail('add 缺 user_id 返回 400', err instanceof Error ? err.message : String(err))
  }

  // 4. 正常 add
  const requestId = `selfcheck:${runId}:add`
  const userId = `selfcheck:${runId}:user`
  const sessionId = `selfcheck:${runId}:session`
  const addBody = {
    request_id: requestId,
    messages: [
      { role: 'user', content: 'I love xylophones', timestamp: 1704067200000 },
      { role: 'assistant', content: 'That is a niche instrument.', timestamp: 1704067260000 },
    ],
    user_id: userId,
    session_id: sessionId,
  }
  try {
    const { status, body } = await request('POST', '/aml/add', { body: addBody })
    const b = body as Record<string, unknown>
    if (
      status === 200 &&
      b.success === true &&
      b.request_id === requestId &&
      b.user_id === userId &&
      b.session_id === sessionId
    ) {
      pass('正常 add 返回 200 且三 ID 一致')
    } else {
      fail('正常 add 返回 200 且三 ID 一致', `status=${status} body=${JSON.stringify(body)}`)
    }
  } catch (err) {
    fail('正常 add 返回 200 且三 ID 一致', err instanceof Error ? err.message : String(err))
  }

  // 5. search top_k=5
  try {
    const { status, body } = await request('POST', '/aml/search', {
      body: { query: 'xylophone', user_id: userId, top_k: 5 },
    })
    const b = body as Record<string, unknown>
    const data = Array.isArray(b.data) ? b.data : []
    const valid = data.every(
      (r: unknown) =>
        r &&
        typeof (r as Record<string, unknown>).id === 'string' &&
        (r as Record<string, unknown>).id !== '' &&
        typeof (r as Record<string, unknown>).content === 'string' &&
        (r as Record<string, unknown>).content !== '',
    )
    if (status === 200 && Array.isArray(b.data) && data.length <= 5 && valid) {
      pass(`search top_k=5 返回合法数组（命中 ${data.length} 条）`)
    } else {
      fail('search top_k=5 返回合法数组', `status=${status} data=${JSON.stringify(data)}`)
    }
  } catch (err) {
    fail('search top_k=5 返回合法数组', err instanceof Error ? err.message : String(err))
  }

  // 6. 不存在的 user_id search
  try {
    const { status, body } = await request('POST', '/aml/search', {
      body: { query: 'anything', user_id: `selfcheck:${runId}:ghost`, top_k: 5 },
    })
    const b = body as Record<string, unknown>
    if (status === 200 && Array.isArray(b.data) && b.data.length === 0) {
      pass('不存在的 user_id search 返回空数组')
    } else {
      fail('不存在的 user_id search 返回空数组', `status=${status} body=${JSON.stringify(body)}`)
    }
  } catch (err) {
    fail('不存在的 user_id search 返回空数组', err instanceof Error ? err.message : String(err))
  }

  // 7. 隔离性
  const unique = `xylophone-zebra-9031-${runId}`
  const userA = `selfcheck:${runId}:A`
  const userB = `selfcheck:${runId}:B`
  try {
    await request('POST', '/aml/add', {
      body: {
        request_id: `selfcheck:${runId}:B-add`,
        messages: [{ role: 'user', content: `My secret word is ${unique}` }],
        user_id: userB,
        session_id: `selfcheck:${runId}:B-session`,
      },
    })
    const a = await request('POST', '/aml/search', { body: { query: unique, user_id: userA, top_k: 5 } })
    const b = await request('POST', '/aml/search', { body: { query: unique, user_id: userB, top_k: 5 } })
    const aData = Array.isArray((a.body as Record<string, unknown>).data) ? (a.body as Record<string, unknown>).data as unknown[] : []
    const bData = Array.isArray((b.body as Record<string, unknown>).data) ? (b.body as Record<string, unknown>).data as unknown[] : []
    const aLeaked = aData.some((r: unknown) => String((r as Record<string, unknown>).content).includes(unique))
    const bHit = bData.some((r: unknown) => String((r as Record<string, unknown>).content).includes(unique))
    if (a.status === 200 && b.status === 200 && !aLeaked && bHit) {
      pass('隔离性：用户 B 的关键词不被用户 A 检索到')
    } else {
      fail('隔离性', `A.status=${a.status} B.status=${b.status} A.leaked=${aLeaked} B.hit=${bHit}`)
    }
  } catch (err) {
    fail('隔离性', err instanceof Error ? err.message : String(err))
  }

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} PASS`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[aml-selfcheck] 未处理异常：', err)
  process.exit(1)
})
