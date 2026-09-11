// art/ 美术母版 → art/w/*.webp 压缩（工程用图全走这里，母版保留）。
// 用法：node scripts/compress-art.mjs
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const root = path.resolve(import.meta.dirname, "..")
const srcDir = path.join(root, "art")
const outDir = path.join(srcDir, "w")

fs.mkdirSync(outDir, { recursive: true })

const files = fs
  .readdirSync(srcDir)
  .filter((f) => /\.(png|jpe?g)$/i.test(f))

let totalIn = 0
let totalOut = 0

for (const f of files) {
  const src = path.join(srcDir, f)
  const out = path.join(outDir, f.replace(/\.(png|jpe?g)$/i, ".webp"))
  const inSize = fs.statSync(src).size
  const img = sharp(src)
  const meta = await img.metadata()
  // 超宽母版限到 2048，画心/背景本就 ≤1536 不动
  const pipeline = meta.width > 2048 ? img.resize({ width: 2048 }) : img
  const info = await pipeline.webp({ quality: 82, effort: 4 }).toFile(out)
  totalIn += inSize
  totalOut += info.size
  console.log(`${f} → ${path.basename(out)}  ${Math.round(inSize / 1024)}KB → ${Math.round(info.size / 1024)}KB`)
}

console.log(`\n合计 ${Math.round(totalIn / 1024)}KB → ${Math.round(totalOut / 1024)}KB（-${Math.round((1 - totalOut / totalIn) * 100)}%）`)
