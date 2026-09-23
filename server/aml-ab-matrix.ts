/**
 * AML A/B 彩排战役编排器
 *
 * 串行跑完 BM25 / 向量 / HyDE / 全量 四个配置，每个配置独立 run-label，
 * 自动启停服务端、清端口、health 检查、失败重试，最后写出汇总 markdown。
 */
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(here)
const PORT = 7301
const BASE = `http://localhost:${PORT}`

interface Config {
  name: string
  env: Record<string, string>
  note: string
}

interface CategoryStat {
  cat: string
  hit: number
  total: number
  acc: number
}

interface RunResult {
  config: string
  runLabel: string
  exitCode: number
  overall: number
  overallLabel: string
  categories: CategoryStat[]
  avgLatencyMs: number
  maxLatencyMs: number
  wallMs: number
  stdout: string
  stderr: string
  error?: string
}

const CONFIGS: Config[] = [
  { name: 'C: HyDE', env: { AML_EMBED: '0', AML_HYDE: '1' }, note: 'BM25 + HyDE' },
  { name: 'D: 全量', env: { AML_EMBED: '1', AML_HYDE: '1' }, note: '完整管线（拟参赛）' },
]

function nowTs(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function killPort(): Promise<void> {
  return new Promise((resolve) => {
    const p = spawn('netstat', ['-ano'])
    let out = ''
    p.stdout.on('data', (d) => { out += d.toString() })
    p.on('close', () => {
      const pids = new Set<string>()
      for (const line of out.split('\n')) {
        const m = line.match(/0\.0\.0\.0:7301\s+\S+\s+\S+\s+(\d+)/)
        if (m) pids.add(m[1])
      }
      let killed = 0
      for (const pid of pids) {
        spawnSync('cmd', ['/c', 'taskkill', '/F', '/T', '/PID', pid], { stdio: 'ignore' })
        killed++
      }
      if (killed > 0) console.log(`  [cleanup] 清理 ${killed} 个 7301 残留进程`)
      resolve()
    })
  })
}

async function waitForHealth(timeoutSec = 60): Promise<boolean> {
  const deadline = Date.now() + timeoutSec * 1000
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/health`)
      if (r.status === 200) return true
    } catch { /* ignore */ }
    await sleep(2000)
  }
  return false
}

function parseReplay(stdout: string): Omit<RunResult, 'config' | 'runLabel' | 'exitCode' | 'wallMs' | 'stdout' | 'stderr' | 'error'> {
  const cats: CategoryStat[] = []
  for (const line of stdout.split('\n')) {
    const catMatch = line.match(/^\s+(\S[\w\-:]+)\s+(\d+)\/(\d+)\s+=\s+([\d.]+)/)
    if (catMatch) {
      cats.push({ cat: catMatch[1].trim(), hit: Number(catMatch[2]), total: Number(catMatch[3]), acc: Number(catMatch[4]) })
      continue
    }
    const overallMatch = line.match(/^\s+总体\s+(\d+)\/(\d+)\s+=\s+([\d.]+)/)
    if (overallMatch) {
      const hit = Number(overallMatch[1])
      const total = Number(overallMatch[2])
      // mutate last cat if it is overall placeholder; otherwise store separately
      cats.push({ cat: 'overall', hit, total, acc: Number(overallMatch[3]) })
    }
  }

  const overallCat = cats.find((c) => c.cat === 'overall')
  const categories = cats.filter((c) => c.cat !== 'overall')
  const overall = overallCat ? overallCat.acc : 0
  const overallLabel = overallCat ? `${overallCat.hit}/${overallCat.total}` : '0/0'

  let avgLatencyMs = 0
  let maxLatencyMs = 0
  const latencyMatch = stdout.match(/平均 search 耗时\s+([\d.]+)(ms|s)\s+·\s+最大\s+([\d.]+)(ms|s)/)
  if (latencyMatch) {
    const parse = (v: string, u: string) => u === 's' ? Math.round(Number(v) * 1000) : Math.round(Number(v))
    avgLatencyMs = parse(latencyMatch[1], latencyMatch[2])
    maxLatencyMs = parse(latencyMatch[3], latencyMatch[4])
  }

  return { overall, overallLabel, categories, avgLatencyMs, maxLatencyMs }
}

interface SliceResult {
  exitCode: number | null
  stdout: string
  stderr: string
  parsed: ReturnType<typeof parseReplay>
}

async function runSlice(idx: number, offset: number, convos: number, runLabel: string, env: NodeJS.ProcessEnv): Promise<SliceResult> {
  const replay = spawn('npx', ['tsx', 'server/aml-replay.ts', '--convos', String(convos), '--offset', String(offset), '--run-label', runLabel], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })

  let stdout = ''
  let stderr = ''
  replay.stdout.on('data', (d) => {
    const s = d.toString()
    stdout += s
    process.stdout.write(`[slice${idx}] ${s}`)
  })
  replay.stderr.on('data', (d) => {
    const s = d.toString()
    stderr += s
    process.stderr.write(`[slice${idx}] ${s}`)
  })

  const exitCode = await new Promise<number | null>((resolve) => {
    replay.on('close', (code) => resolve(code))
  })
  const parsed = exitCode === 0 ? parseReplay(stdout) : { overall: 0, overallLabel: '0/0', categories: [], avgLatencyMs: 0, maxLatencyMs: 0 }
  return { exitCode, stdout, stderr, parsed }
}

function aggregateSlices(parsed: SliceResult['parsed'][]): ReturnType<typeof parseReplay> {
  const catMap = new Map<string, { hit: number; total: number }>()
  let totalHit = 0
  let totalTotal = 0
  let weightedLatencyMs = 0
  let maxLatencyMs = 0
  for (const p of parsed) {
    const overallTotal = Number(p.overallLabel.split('/')[1]) || 0
    totalHit += Number(p.overallLabel.split('/')[0]) || 0
    totalTotal += overallTotal
    weightedLatencyMs += p.avgLatencyMs * overallTotal
    maxLatencyMs = Math.max(maxLatencyMs, p.maxLatencyMs)
    for (const c of p.categories) {
      const t = catMap.get(c.cat) ?? { hit: 0, total: 0 }
      t.hit += c.hit
      t.total += c.total
      catMap.set(c.cat, t)
    }
  }
  const categories: CategoryStat[] = []
  for (const [cat, { hit, total }] of catMap) {
    categories.push({ cat, hit, total, acc: total > 0 ? hit / total : 0 })
  }
  return {
    overall: totalTotal > 0 ? totalHit / totalTotal : 0,
    overallLabel: `${totalHit}/${totalTotal}`,
    categories,
    avgLatencyMs: totalTotal > 0 ? Math.round(weightedLatencyMs / totalTotal) : 0,
    maxLatencyMs,
  }
}

async function runConfig(config: Config, runLabel: string): Promise<RunResult> {
  console.log(`\n========== ${config.name} (${config.note}) run=${runLabel} ==========`)
  await killPort()
  await sleep(1000)

  const env = { ...process.env, ...config.env }
  const dataDir = join(ROOT, 'server', 'data-aml')
  mkdirSync(dataDir, { recursive: true })
  const logFile = join(dataDir, `server-${runLabel}.log`)
  const logStream = createWriteStream(logFile, { flags: 'a' })
  const server = spawn('npx', ['tsx', 'server/aml.ts'], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })

  server.stdout.pipe(logStream)
  server.stderr.pipe(logStream)

  console.log('  [start] 等待 health...')
  const healthy = await waitForHealth(60)
  if (!healthy) {
    server.kill('SIGTERM')
    logStream.end()
    await killPort()
    return {
      config: config.name,
      runLabel,
      exitCode: -1,
      overall: 0,
      overallLabel: '0/0',
      categories: [],
      avgLatencyMs: 0,
      maxLatencyMs: 0,
      wallMs: 0,
      stdout: '',
      stderr: '',
      error: 'health 检查失败',
    }
  }
  console.log('  [start] health 200')

  const SLICES = 3
  const totalConvos = 10
  const sliceSize = Math.ceil(totalConvos / SLICES)
  const slices: { offset: number; convos: number }[] = []
  for (let s = 0; s < SLICES; s++) {
    const offset = s * sliceSize
    if (offset >= totalConvos) break
    slices.push({ offset, convos: Math.min(sliceSize, totalConvos - offset) })
  }

  const wallStart = Date.now()

  const sliceRuns = slices.map((sl, idx) => runSlice(idx, sl.offset, sl.convos, runLabel, env))
  const sliceResults = await Promise.all(sliceRuns)
  const wallMs = Date.now() - wallStart

  const failed = sliceResults.find((s) => s.exitCode !== 0)
  const combinedStdout = sliceResults.map((s, i) => `--- slice ${i} ---\n${s.stdout}`).join('\n')
  const combinedStderr = sliceResults.map((s, i) => `--- slice ${i} ---\n${s.stderr}`).join('\n')

  console.log(`  [stop] slices exit=${sliceResults.map((s) => s.exitCode).join('/')} wall=${formatMs(wallMs)}`)
  server.kill('SIGTERM')
  logStream.end()
  await sleep(1000)
  await killPort()

  if (failed) {
    return {
      config: config.name,
      runLabel,
      exitCode: failed.exitCode ?? -1,
      overall: 0,
      overallLabel: '0/0',
      categories: [],
      avgLatencyMs: 0,
      maxLatencyMs: 0,
      wallMs,
      stdout: combinedStdout,
      stderr: combinedStderr,
      error: `某 slice 非零退出 (${failed.exitCode})，日志见 ${logFile}`,
    }
  }

  const parsed = aggregateSlices(sliceResults.map((s) => s.parsed))
  return {
    config: config.name,
    runLabel,
    exitCode: 0,
    ...parsed,
    wallMs,
    stdout: combinedStdout,
    stderr: combinedStderr,
  }
}

function formatMs(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = ((ms % 60000) / 1000).toFixed(0)
  return `${m}m${s.padStart(2, '0')}s`
}

function commitHash(): string {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' })
  return r.status === 0 ? r.stdout.trim() : 'unknown'
}

function writeReport(results: RunResult[]): void {
  const dir = join(ROOT, 'docs', 'aml')
  mkdirSync(dir, { recursive: true })
  const outFile = join(dir, '04-ab-replay-results.md')
  const ranAt = new Date().toISOString()
  const hash = commitHash()

  const catOrder = ['single-hop', 'multi-hop', 'temporal', 'open-domain', 'adversarial']
  const catHeader = catOrder.map((c) => c.replace(/-/g, ' ')).join(' | ')
  const catDivider = catOrder.map(() => '---').join(' | ')

  let md = `# AML A/B 彩排战役汇总\n\n`
  md += `- 跑批时间：${ranAt}\n`
  md += `- commit：${hash}\n`
  md += `- 数据：LoCoMo 10 会话（1986 题）\n`
  md += `- 服务端地址：${BASE}\n\n`

  md += `## 配置矩阵\n\n`
  md += `| 配置 | 说明 | AML_EMBED | AML_HYDE |\n`
  md += `|---|---|---|---|\n`
  for (const c of CONFIGS) {
    md += `| ${c.name} | ${c.note} | ${c.env.AML_EMBED} | ${c.env.AML_HYDE} |\n`
  }
  md += '\n'

  md += `## 命中率汇总\n\n`
  md += `| 配置 | 总体 | ${catHeader} | 平均耗时 | 最大耗时 | 墙钟时间 | run-label |\n`
  md += `|---|---|${catDivider}|---|---|---|---|\n`
  for (const r of results) {
    const catCells = catOrder.map((cat) => {
      const c = r.categories.find((x) => x.cat === cat)
      return c ? `${c.acc.toFixed(4)} (${c.hit}/${c.total})` : '—'
    }).join(' | ')
    md += `| ${r.config} | ${r.overall.toFixed(4)} (${r.overallLabel}) | ${catCells} | ${formatMs(r.avgLatencyMs)} | ${formatMs(r.maxLatencyMs)} | ${formatMs(r.wallMs)} | ${r.runLabel} |\n`
  }
  md += '\n'

  md += `## 结论建议\n\n`
  const best = results.filter((r) => r.exitCode === 0).sort((a, b) => b.overall - a.overall)[0]
  if (best) {
    md += `推荐参赛配置：**${best.config}**（总体命中率 ${best.overall.toFixed(4)}，run-label \`${best.runLabel}\`）。\n\n`
  } else {
    md += `所有配置均失败，需排查后再跑。\n\n`
  }

  md += `## 原始/重试记录\n\n`
  for (const r of results) {
    md += `### ${r.config} / ${r.runLabel}\n\n`
    if (r.error) md += `- 错误：${r.error}\n`
    md += `- exit code：${r.exitCode}\n`
    md += `- 总体：${r.overall.toFixed(4)} (${r.overallLabel})\n`
    md += `- 墙钟：${formatMs(r.wallMs)}\n`
    md += '- category 明细：\n'
    for (const c of r.categories) {
      md += `  - ${c.cat}: ${c.hit}/${c.total} = ${c.acc.toFixed(4)}\n`
    }
    md += '\n'
  }

  writeFileSync(outFile, md, 'utf8')
  console.log(`\n[ab-matrix] 报告已写入 ${outFile}`)
}

async function main(): Promise<void> {
  const results: RunResult[] = []
  const baseLabel = nowTs()

  for (let i = 0; i < CONFIGS.length; i++) {
    const config = CONFIGS[i]
    let attempt = 0
    let result: RunResult | null = null
    while (attempt < 2) {
      const runLabel = `${baseLabel}-${String.fromCharCode(97 + i)}${attempt > 0 ? '-retry' : ''}`
      result = await runConfig(config, runLabel)
      if (result.exitCode === 0) break
      attempt++
      console.log(`  [retry] ${config.name} 第 ${attempt} 次重试...`)
      await sleep(5000)
    }
    results.push(result!)
  }

  writeReport(results)

  console.log('\n========== 全部完成 ==========')
  for (const r of results) {
    console.log(`${r.config.padEnd(10)} ${r.exitCode === 0 ? 'OK' : 'FAIL'} 总体=${r.overall.toFixed(4)} wall=${formatMs(r.wallMs)}`)
  }
}

main().catch((err) => {
  console.error('[ab-matrix] 编排器异常：', err)
  process.exit(1)
})
