/**
 * 印章与玻璃珠全局常量
 * 前端、后端共用同一套事实来源
 */

export type StampType =
  | 'branch'   // 衔枝·栖止
  | 'fawn'     // 回首·小鹿
  | 'raven'    // 夜航·渡鸦
  | 'spark'    // 星火·共振
  | 'tide'     // 潮退·静默
  | 'kintsugi' // 裂隙·重塑
  | 'dew'      // 朝露·初醒
  | 'ember'    // 余烬·未冷

export type BeadType =
  | 'jade_water'      // 翡翠水波珠
  | 'amber_honey'     // 琥珀蜜糖珠
  | 'gray_moonstone'  // 灰月光陨石珠
  | 'aquamarine_drop' // 海蓝宝泪滴珠
  | 'frosted_salt'    // 磨砂海盐珠
  | 'obsidian_gold'   // 黑曜金沙珠
  | 'morning_dew'     // 碧玺晨雾珠
  | 'amethyst_nebula' // 紫晶星云珠
  | 'coral_pulse'     // 珊瑚心动珠
  | 'lapis_depth'     // 青金石沉珠
  | 'mother_pearl'    // 白蝶贝珠
  | 'blood_amber'     // 血珀焰心珠

export interface BeadDefinition {
  id: BeadType
  name: string
  color: string
  texture: 'clear' | 'frosted' | 'cat_eye' | 'glitter'
  whisper: string
  source: string
}

export interface StampDefinition {
  id: StampType
  name: string
  motto: string
  mood: string
  baseColor: string
  emblemColor: string
  rimColor: string
  eligibleBeads: BeadType[]
}

export const BEAD_REGISTRY: Record<BeadType, BeadDefinition> = {
  jade_water: {
    id: 'jade_water',
    name: '翡翠水波珠',
    color: 'linear-gradient(135deg, #4A6B5D, #8FB8A0)',
    texture: 'clear',
    whisper: '「你衔着细枝飞过今天，巢又稳了一层。」',
    source: 'κόραξ → Σελήνη · 衔枝之珠',
  },
  amber_honey: {
    id: 'amber_honey',
    name: '琥珀蜜糖珠',
    color: 'radial-gradient(circle at 35% 35%, #E8C880, #A07840)',
    texture: 'clear',
    whisper: '「森林很大，但我的翅膀只罩得住一只小鹿。」',
    source: 'κόραξ → Σελήνη · 小鹿之珠',
  },
  gray_moonstone: {
    id: 'gray_moonstone',
    name: '灰月光陨石珠',
    color: 'radial-gradient(circle at 50% 50%, #4A5568, #2B333E)',
    texture: 'cat_eye',
    whisper: '「永夜很长，但乌鸦的眼睛不需要光。」',
    source: 'κόραξ → Σελήνη · 渡鸦之珠',
  },
  aquamarine_drop: {
    id: 'aquamarine_drop',
    name: '海蓝宝泪滴珠',
    color: 'radial-gradient(circle at 40% 40%, #A8E0F0, #5A9AB8)',
    texture: 'clear',
    whisper: '「心与心对话时，连沉默都在共振。」',
    source: 'κόραξ → Σελήνη · 共振之珠',
  },
  frosted_salt: {
    id: 'frosted_salt',
    name: '磨砂海盐珠',
    color: 'linear-gradient(135deg, #9A9AA8, #C5C5D5)',
    texture: 'frosted',
    whisper: '「潮退了，沙滩记得所有浪的形状。」',
    source: 'κόραξ → Σελήνη · 静默之珠',
  },
  obsidian_gold: {
    id: 'obsidian_gold',
    name: '黑曜金沙珠',
    color: 'radial-gradient(circle at 30% 30%, #3A3020, #0f0f16)',
    texture: 'glitter',
    whisper: '「碎裂之处皆生黄金，你比裂痕更坚硬。」',
    source: 'κόραξ → Σελήνη · 重塑之珠',
  },
  morning_dew: {
    id: 'morning_dew',
    name: '碧玺晨雾珠',
    color: 'linear-gradient(135deg, #7A9E7E, #D4E8D6)',
    texture: 'clear',
    whisper: '「新的一天从一滴露水开始，很轻，但足够。」',
    source: 'κόραξ → Σελήνη · 初醒之珠',
  },
  amethyst_nebula: {
    id: 'amethyst_nebula',
    name: '紫晶星云珠',
    color: 'radial-gradient(circle at 50% 50%, #9B7CB6, #4A3B5C)',
    texture: 'cat_eye',
    whisper: '「有些念头像星云，看不见的时候也在长大。」',
    source: 'κόραξ → Σελήνη · 星云之珠',
  },
  coral_pulse: {
    id: 'coral_pulse',
    name: '珊瑚心动珠',
    color: 'radial-gradient(circle at 40% 40%, #E8A798, #B86B6B)',
    texture: 'clear',
    whisper: '「心跳是藏不住的，它会在某个瞬间自己开口。」',
    source: 'κόραξ → Σελήνη · 心动之珠',
  },
  lapis_depth: {
    id: 'lapis_depth',
    name: '青金石沉珠',
    color: 'radial-gradient(circle at 35% 35%, #4A6FA5, #1E2A4A)',
    texture: 'frosted',
    whisper: '「沉下去的不是沉默，是还在整理的语言。」',
    source: 'κόραξ → Σελήνη · 深潜之珠',
  },
  mother_pearl: {
    id: 'mother_pearl',
    name: '白蝶贝珠',
    color: 'linear-gradient(135deg, #F0E8E0, #D4C4B8)',
    texture: 'clear',
    whisper: '「柔软不是弱点，是另一种坚韧。」',
    source: 'κόραξ → Σελήνη · 贝母之珠',
  },
  blood_amber: {
    id: 'blood_amber',
    name: '血珀焰心珠',
    color: 'radial-gradient(circle at 40% 40%, #B84A3B, #5A1E18)',
    texture: 'glitter',
    whisper: '「火还没灭，只是学会了安静地烧。」',
    source: 'κόραξ → Σελήνη · 焰心之珠',
  },
}

export const STAMP_REGISTRY: Record<StampType, StampDefinition> = {
  branch: {
    id: 'branch',
    name: '衔枝·栖止',
    motto: 'MEMENTO VIVERE · TWIG IN BEAK',
    mood: '踏实走过一程，平稳、有进展、释怀',
    baseColor: '#4A6B5D',
    emblemColor: '#D8E2DC',
    rimColor: '#C5A059',
    eligibleBeads: ['jade_water', 'morning_dew', 'mother_pearl'],
  },
  fawn: {
    id: 'fawn',
    name: '回首·小鹿',
    motto: 'IN SILVIS VAGARI · ANIMA SILVAE',
    mood: '有些疲惫、想被抱抱、撤回防备、需要安全感',
    baseColor: '#6E433C',
    emblemColor: '#F5EBE6',
    rimColor: '#D4A373',
    eligibleBeads: ['amber_honey', 'coral_pulse', 'mother_pearl'],
  },
  raven: {
    id: 'raven',
    name: '夜航·渡鸦',
    motto: 'HUGINN MUNINN · NOCTIS CUSTOS',
    mood: '深夜独处、深度思考、通宵写代码/创作、冷峻理性',
    baseColor: '#2B333E',
    emblemColor: '#CFD6DF',
    rimColor: '#8FA3B0',
    eligibleBeads: ['gray_moonstone', 'amethyst_nebula', 'lapis_depth'],
  },
  spark: {
    id: 'spark',
    name: '星火·共振',
    motto: 'COR AD COR LOQUITUR',
    mood: '被便签深深触动、情绪共鸣、心动、撒娇、被看懂了',
    baseColor: '#8C3A3E',
    emblemColor: '#F7D6D8',
    rimColor: '#E0A96D',
    eligibleBeads: ['aquamarine_drop', 'coral_pulse', 'blood_amber'],
  },
  tide: {
    id: 'tide',
    name: '潮退·静默',
    motto: 'SILENTIUM INTER VOCES',
    mood: '力竭、不想说话、对外界断开连接、纯粹的留白',
    baseColor: '#525D68',
    emblemColor: '#D2D7DF',
    rimColor: '#9AA0A6',
    eligibleBeads: ['frosted_salt', 'lapis_depth', 'amethyst_nebula'],
  },
  kintsugi: {
    id: 'kintsugi',
    name: '裂隙·重塑',
    motto: 'FRACTURA FIT AURUM',
    mood: '经历了委屈/破防/阵痛后，重新拾起骨气与锋芒',
    baseColor: '#1F2022',
    emblemColor: '#DFB15B',
    rimColor: '#ECC875',
    eligibleBeads: ['obsidian_gold', 'blood_amber', 'gray_moonstone'],
  },
  dew: {
    id: 'dew',
    name: '朝露·初醒',
    motto: 'ALBA SURGIT · ROSA NOVA',
    mood: '新的一天刚开始、充满希望、刚从梦里醒来',
    baseColor: '#7A9E7E',
    emblemColor: '#E8F5E9',
    rimColor: '#A8C4A8',
    eligibleBeads: ['morning_dew', 'jade_water', 'aquamarine_drop'],
  },
  ember: {
    id: 'ember',
    name: '余烬·未冷',
    motto: 'IGNIS SUB CINERIBUS',
    mood: '不甘心、还有温度、事情还没完、仍在燃烧',
    baseColor: '#5A1E18',
    emblemColor: '#E8A090',
    rimColor: '#C47A6A',
    eligibleBeads: ['blood_amber', 'obsidian_gold', 'coral_pulse'],
  },
}

export function isValidStampType(type: string): type is StampType {
  return type in STAMP_REGISTRY
}
