// 一次性测试数据灌入：模拟用户与宿主 AI 的连续交流片段（采诗素材）。
// 用法：node scripts/seed-caishi.mjs <userId>
const uid = process.argv[2]
if (!uid) {
  console.error("用法：node scripts/seed-caishi.mjs <userId>")
  process.exit(1)
}

const SEEDS = [
  {
    title: "旧机卡顿",
    tags: ["创作", "设备"],
    text: "和 AI 吐槽说笔记本一开剪辑就风扇狂转，预览卡成幻灯片，这部纪录片下周就要交了，在考虑咬牙换台新的。",
  },
  {
    title: "深夜丢稿",
    tags: ["情绪", "创作挫折"],
    text: "凌晨两点渲染到九成电脑蓝屏，这周改的章节全没了。跟 AI 说了很多，讲到以前设备也这么坑过，讲到有点怀疑自己是不是根本不适合做这行，情绪非常低。",
  },
  {
    title: "转向的决定",
    tags: ["创作", "决策"],
    text: "冷静两天后决定不换电脑了，把攒的钱拿去报了纪录片工作坊。想清楚了一件事：卡住自己的从来不是机器，是叙事能力。",
  },
  {
    title: "第一次被肯定",
    tags: ["正反馈", "创作"],
    text: "工作坊第一支短片被老师当堂讲评，说镜头语言有直觉。回来跟 AI 说这是今年最开心的一天——旧电脑剪出来的片子也一样能打动人。",
  },
  {
    title: "新的攒钱目标",
    tags: ["计划"],
    text: "还是想换机器，但不急了，定了个半年计划：稿费攒到数就换，让设备追着作品走，而不是反过来。",
  },
  {
    title: "猫与绝育",
    tags: ["生活"],
    text: "家里的猫连续一周半夜挠门，查了应该是发情，约了周六带去做绝育，有点心疼但必须做。",
  },
]

for (const s of SEEDS) {
  const t0 = Date.now()
  const res = await fetch("http://localhost:7300/v1/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: uid, ...s }),
  })
  const body = await res.text()
  console.log(`[${res.status}] ${s.title}（${Date.now() - t0}ms）${res.ok ? "" : " → " + body.slice(0, 120)}`)
  await new Promise((r) => setTimeout(r, 800))
}
console.log("灌入完成")
