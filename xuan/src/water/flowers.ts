import type { FlowerRegion } from "./WaterEngine"

// 春水底图花位标定（photo UV 坐标，r 为图宽单位半径）。
// 底图：art/chunshui-bg-v1.png（1536×1024）。
// 换底图必须重新标定——见《临水轩前端技术设计文档-v1.0》第四节。
export const CHUNSHUI_FLOWERS: FlowerRegion[] = [
  { cx: 0.185, cy: 0.22, r: 0.12, phase: 0.0, speed: 0.34 }, // 左上
  { cx: 0.845, cy: 0.2, r: 0.115, phase: 2.1, speed: 0.27 }, // 右上
  { cx: 0.5, cy: 0.49, r: 0.115, phase: 4.0, speed: 0.31 }, // 正中（最大一朵）
  { cx: 0.175, cy: 0.72, r: 0.12, phase: 1.2, speed: 0.24 }, // 左下
  { cx: 0.815, cy: 0.765, r: 0.13, phase: 5.3, speed: 0.29 }, // 右下
]
