/**
 * HyDE 延迟探针：连续调用 expandQueryBatch 5 次取平均，验证 ≤3 秒目标。
 */
import { loadEnvLocal, registerNodeTransport } from './llm-node.ts'
import { expandQueryBatch } from './eval-locomo.ts'

loadEnvLocal()
registerNodeTransport()

const q = "What did Caroline research?"
const times: number[] = []

async function main(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now()
    try {
      const res = await expandQueryBatch([q], { extraBody: { reasoning_effort: 'low' } })
      const dur = (Date.now() - t0) / 1000
      times.push(dur)
      console.log(`  call ${i + 1}: ${dur.toFixed(2)}s -> ${res[0]?.slice(0, 60)}...`)
    } catch (err) {
      console.log(`  call ${i + 1}: FAILED ${err instanceof Error ? err.message : err}`)
      process.exit(1)
    }
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  console.log(`\n平均 ${avg.toFixed(2)}s / 5 次`)
  if (avg > 3) {
    console.log('未达标（>3s），需要继续优化 HyDE 延迟')
    process.exit(2)
  }
  console.log('达标（≤3s）')
}

main().catch((err) => { console.error(err); process.exit(1) })
