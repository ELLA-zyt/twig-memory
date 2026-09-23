// 春水 · 波场水引擎（本仓库自研实现，非嵌入第三方代码）
// 路线：CPU 粗网格双缓冲波动方程 → LUMINANCE 波高纹理 →
// WebGL shader 折射/漫射/亮斑/天光带 → 2D canvas 叠加程序化桃瓣与星芒。

export interface FlowerRegion {
  cx: number // 花心 x，photo UV（0-1，左起）
  cy: number // 花心 y，photo UV（0-1，上起）
  r: number // 漩涡作用半径（图宽单位）
  phase: number
  speed: number
}

const BLOOM_SLOTS = 5

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uWater;
uniform sampler2D uSim;
uniform vec2 uSimel;
uniform vec2 uCrop;
uniform float uAspect;
uniform float uRefr;
uniform float uLight;
uniform float uTime;
uniform vec3 uBloom[${BLOOM_SLOTS}];   // cx, cy, r（photo uv）
uniform vec4 uBloomA[${BLOOM_SLOTS}];  // rot, offX, offY, scale

float wave(vec2 p) { return texture2D(uSim, p).r - 0.5; }

void main() {
  vec2 e = uSimel;
  vec2 g = vec2(
    wave(vUv + vec2(e.x, 0.0)) - wave(vUv - vec2(e.x, 0.0)),
    wave(vUv + vec2(0.0, e.y)) - wave(vUv - vec2(0.0, e.y)));

  vec2 puv = (vUv - 0.5) * uCrop + 0.5;

  // 花位局部摆流：让画进来的花随波轻旋、微移、呼吸
  for (int i = 0; i < ${BLOOM_SLOTS}; i++) {
    vec2 d = puv - uBloom[i].xy;
    d.y *= uAspect;
    float dist = length(d);
    float r = uBloom[i].z;
    if (dist < r) {
      float f = smoothstep(r, r * 0.25, dist);
      float a = uBloomA[i].x * f;
      float cs = cos(a);
      float sn = sin(a);
      vec2 rd = mat2(cs, sn, -sn, cs) * d;
      rd *= mix(1.0, uBloomA[i].w, f);
      puv = uBloom[i].xy + vec2(rd.x, rd.y / uAspect) + uBloomA[i].yz * f;
    }
  }

  puv = clamp(puv + g * uRefr, 0.002, 0.998);
  vec3 col = texture2D(uWater, puv).rgb;

  // 漫射 + 波峰亮斑（泥金偏暖）
  float shade = (g.x + g.y) * 2.2;
  col += shade * vec3(1.0, 0.99, 0.95);
  col += max(0.0, shade - 0.05) * 5.0 * vec3(1.0, 0.98, 0.9);

  // 慢移天光带
  float band = sin(dot(vUv, vec2(1.1, 1.4)) * 2.2 - uTime * 0.18);
  col += smoothstep(0.8, 1.0, band) * 0.05 * uLight;

  // 游移光池
  vec2 sc = vec2(0.5 + 0.2 * cos(uTime * 0.06), 0.4 + 0.16 * sin(uTime * 0.08));
  col += (1.0 - smoothstep(0.0, 0.6, distance(vUv, sc))) * 0.05 * uLight;

  gl_FragColor = vec4(col, 1.0);
}`

// 宋式淡彩胭脂：程序桃瓣调色板（底图花瓣资产到位后可换 sprite）
const PETAL_PALETTE = [
  { petal: "#f5d3dc", edge: "#fdf0f3", deep: "#dfaec0" },
  { petal: "#f0c4d2", edge: "#fae7ec", deep: "#cf93a8" },
  { petal: "#fbe6ea", edge: "#fef7f8", deep: "#e7bcc9" },
]

const NX = 160

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 桃瓣 sprite：尖端收拢，绢质渐变 */
function makePetalSprite(px: number, pal: (typeof PETAL_PALETTE)[number], rnd: () => number): HTMLCanvasElement {
  const S = Math.ceil(px * 2.6)
  const cv = document.createElement("canvas")
  cv.width = cv.height = S
  const c = cv.getContext("2d")!
  c.translate(S / 2, S / 2)
  c.rotate(rnd() * Math.PI * 2)
  c.globalAlpha = 0.85
  const g = c.createLinearGradient(-px * 0.5, 0, px * 0.8, 0)
  g.addColorStop(0, pal.edge)
  g.addColorStop(0.45, pal.petal)
  g.addColorStop(1, pal.edge)
  c.fillStyle = g
  c.beginPath()
  c.moveTo(-px * 0.5, 0)
  c.bezierCurveTo(-px * 0.2, -px * 0.46, px * 0.3, -px * 0.5, px * 0.72, -px * 0.06)
  c.quadraticCurveTo(px * 0.85, 0, px * 0.72, px * 0.06) // 桃瓣收尖
  c.bezierCurveTo(px * 0.3, px * 0.5, -px * 0.2, px * 0.46, -px * 0.5, 0)
  c.fill()
  c.globalAlpha = 0.4
  c.strokeStyle = pal.deep
  c.lineWidth = Math.max(0.5, px * 0.02)
  c.beginPath()
  c.moveTo(-px * 0.3, 0)
  c.quadraticCurveTo(px * 0.2, -px * 0.06, px * 0.6, 0)
  c.stroke()
  c.globalAlpha = 0.7
  c.strokeStyle = "rgba(255,255,255,0.9)"
  c.lineWidth = Math.max(0.6, px * 0.025)
  c.beginPath()
  c.moveTo(-px * 0.5, 0)
  c.bezierCurveTo(-px * 0.2, -px * 0.46, px * 0.3, -px * 0.5, px * 0.72, -px * 0.06)
  c.stroke()
  return cv
}

interface Petal {
  nx: number
  ny: number
  vx: number
  vy: number
  rot: number
  vr: number
  phase: number
  px: number
  sprite: CanvasImageSource
  dw: number
  dh: number
}

interface Sparkle {
  x: number
  y: number
  life: number
  max: number
  size: number
  rot: number
  vy: number
  gold: boolean
}

export class WaterSurface {
  private stage: HTMLElement
  private glCv: HTMLCanvasElement
  private fxCv: HTMLCanvasElement
  private fctx: CanvasRenderingContext2D
  private gl!: WebGLRenderingContext
  private uni: Record<string, WebGLUniformLocation | null> = {}
  private texWater: WebGLTexture | null = null
  private texSim: WebGLTexture | null = null
  private flowers: FlowerRegion[]
  private kicks: number[] = []
  private bloomArr = new Float32Array(BLOOM_SLOTS * 3)
  private bloomAArr = new Float32Array(BLOOM_SLOTS * 4)

  private W = 0
  private H = 0
  private DPR = 1
  private photoW = 1
  private photoH = 1
  private cropX = 1
  private cropY = 1
  private nx = NX
  private ny = 160
  private u!: Float32Array
  private uPrev!: Float32Array
  private simBytes!: Uint8Array

  private petals: Petal[] = []
  private petalImgs: HTMLImageElement[] = []
  private sparkles: Sparkle[] = []
  private rnd = lcg(20260911)
  private petalCount = 8

  private raf = 0
  private lastT = 0
  private breathT = 0
  private lastMx = -1
  private lastMy = -1
  private running = false
  private reduced: boolean
  private disposed = false
  private ro: ResizeObserver

  private constructor(stage: HTMLElement, flowers: FlowerRegion[]) {
    this.stage = stage
    this.flowers = flowers.slice(0, BLOOM_SLOTS)
    this.kicks = this.flowers.map(() => 0)
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    this.glCv = document.createElement("canvas")
    this.glCv.className = "water-gl"
    this.fxCv = document.createElement("canvas")
    this.fxCv.className = "water-fx"
    this.fctx = this.fxCv.getContext("2d")!
    stage.append(this.glCv, this.fxCv)

    this.DPR = Math.min(window.devicePixelRatio || 1, 2)

    this.ro = new ResizeObserver(() => this.layout())
    this.ro.observe(stage)
    this.layout()

    if (!this.reduced) {
      stage.addEventListener("pointermove", this.onMove)
      stage.addEventListener("pointerdown", this.onDown)
      stage.addEventListener("pointerleave", this.onLeave)
      document.addEventListener("visibilitychange", this.onVis)
    }
  }

  static async create(
    stage: HTMLElement,
    imageUrl: string,
    flowers: FlowerRegion[],
    petalUrls: string[] = [],
  ): Promise<WaterSurface> {
    const ws = new WaterSurface(stage, flowers)
    const gl = ws.glCv.getContext("webgl", { antialias: false })
    if (!gl) throw new Error("WebGL 不可用")
    ws.gl = gl as WebGLRenderingContext
    const img = new Image()
    img.src = imageUrl
    // 不用 img.decode()——部分 Chromium 环境对缓存大图 decode 永不回调；onload 已足够上传纹理
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error("春水底图加载失败"))
    })
    ws.initGL()
    ws.uploadPhoto(img)
    if (petalUrls.length) {
      ws.setPetalImages(await ws.loadPetals(petalUrls))
    }
    // 预布几圈入场涟漪，像花瓣初落
    if (!ws.reduced) {
      for (let i = 0; i < 4; i++) {
        window.setTimeout(() => {
          if (!ws.disposed)
            ws.drop(ws.rnd() * NX, ws.ny * (0.3 + ws.rnd() * 0.4), 4, 1.4)
        }, 500 + i * 700)
      }
      ws.start()
    } else {
      ws.renderStatic()
    }
    return ws
  }

  // ---------- GL ----------

  private compile(type: number, src: string): WebGLShader {
    const { gl } = this
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader 编译失败")
    return s
  }

  private initGL(): void {
    const { gl } = this
    const prog = gl.createProgram()!
    gl.attachShader(prog, this.compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, this.compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "program 链接失败")
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    for (const n of ["uWater", "uSim", "uSimel", "uCrop", "uAspect", "uRefr", "uLight", "uTime", `uBloom[0]`, `uBloomA[0]`]) {
      this.uni[n] = gl.getUniformLocation(prog, n)
    }
    gl.uniform1i(this.uni.uWater, 0)
    gl.uniform1i(this.uni.uSim, 1)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    this.allocSim()
    this.uploadSim()
  }

  private uploadPhoto(img: HTMLImageElement): void {
    const { gl } = this
    this.photoW = img.naturalWidth
    this.photoH = img.naturalHeight
    this.texWater = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texWater)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    this.updateCrop()
  }

  private uploadSim(): void {
    const { gl } = this
    if (this.texSim) gl.deleteTexture(this.texSim)
    this.texSim = gl.createTexture()
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.texSim)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.nx, this.ny, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.simBytes)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  // ---------- 波场（CPU 粗网格） ----------

  private allocSim(): void {
    this.ny = Math.max(90, Math.min(288, Math.round((NX * this.H) / Math.max(this.W, 1))))
    this.u = new Float32Array(this.nx * this.ny)
    this.uPrev = new Float32Array(this.nx * this.ny)
    this.simBytes = new Uint8Array(this.nx * this.ny).fill(128)
  }

  private drop(gx: number, gy: number, radius: number, strength: number): void {
    const { nx, ny, u } = this
    const r2 = radius * radius
    const x0 = Math.max(1, Math.floor(gx - radius))
    const x1 = Math.min(nx - 2, Math.ceil(gx + radius))
    const y0 = Math.max(1, Math.floor(gy - radius))
    const y1 = Math.min(ny - 2, Math.ceil(gy + radius))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - gx
        const dy = y - gy
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const k = Math.cos((Math.sqrt(d2) / radius) * Math.PI * 0.5)
          u[y * nx + x] += strength * k * k
        }
      }
    }
  }

  private stepWater(): void {
    const { nx, ny, u, uPrev } = this
    const damp = 0.979
    for (let y = 1; y < ny - 1; y++) {
      const row = y * nx
      for (let x = 1; x < nx - 1; x++) {
        const i = row + x
        const v = (u[i - 1] + u[i + 1] + u[i - nx] + u[i + nx]) * 0.5 - uPrev[i]
        uPrev[i] = v * damp
      }
    }
    const t = u
    this.u = uPrev
    this.uPrev = t
  }

  private packSim(): void {
    const { u, simBytes } = this
    for (let i = 0; i < u.length; i++) {
      const v = 128 + u[i] * 26
      simBytes[i] = v < 1 ? 1 : v > 254 ? 254 : v
    }
  }

  private gradAt(gx: number, gy: number): [number, number, number] {
    const { nx, ny, u } = this
    const x = Math.max(1, Math.min(nx - 2, gx | 0))
    const y = Math.max(1, Math.min(ny - 2, gy | 0))
    const i = y * nx + x
    return [u[i + 1] - u[i - 1], u[i + nx] - u[i - nx], u[i]]
  }

  // ---------- 布局 ----------

  private layout(): void {
    if (this.disposed) return
    this.W = this.stage.clientWidth
    this.H = this.stage.clientHeight
    if (!this.W || !this.H) return
    this.glCv.width = this.W * this.DPR
    this.glCv.height = this.H * this.DPR
    this.fxCv.width = this.W * this.DPR
    this.fxCv.height = this.H * this.DPR
    this.fctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0)
    if (this.gl) {
      this.allocSim()
      this.uploadSim()
      this.gl.viewport(0, 0, this.glCv.width, this.glCv.height)
      this.updateCrop()
    }
    this.petals = []
    this.syncPetals()
  }

  private updateCrop(): void {
    const s = Math.max(this.W / this.photoW, this.H / this.photoH)
    this.cropX = this.W / (s * this.photoW)
    this.cropY = this.H / (s * this.photoH)
    const { gl, uni } = this
    gl.uniform2f(uni.uCrop, this.cropX, this.cropY)
    gl.uniform2f(uni.uSimel, 1 / this.nx, 1 / this.ny)
    gl.uniform1f(uni.uAspect, this.photoH / this.photoW)
  }

  // ---------- 花位摆动 ----------

  private updateBlooms(t: number): void {
    const { flowers, kicks, bloomArr, bloomAArr, gl, uni } = this
    for (let i = 0; i < BLOOM_SLOTS; i++) {
      const f = flowers[i]
      const k3 = i * 3
      const k4 = i * 4
      if (!f) {
        bloomArr[k3] = -10
        bloomArr[k3 + 1] = -10
        bloomArr[k3 + 2] = 0.001
        bloomAArr[k4] = 0
        bloomAArr[k4 + 1] = 0
        bloomAArr[k4 + 2] = 0
        bloomAArr[k4 + 3] = 1
        continue
      }
      const su = ((f.cx - 0.5) / this.cropX + 0.5) * this.nx
      const sv = ((f.cy - 0.5) / this.cropY + 0.5) * this.ny
      const [dx, dy, h] = this.gradAt(su, sv)
      kicks[i] += ((dx + dy) * 0.5 - kicks[i]) * 0.08
      const kick = Math.max(-0.12, Math.min(0.12, kicks[i]))
      bloomArr[k3] = f.cx
      bloomArr[k3 + 1] = f.cy
      bloomArr[k3 + 2] = f.r
      bloomAArr[k4] = Math.sin(t * f.speed + f.phase) * 0.05 + Math.sin(t * f.speed * 1.63 + f.phase * 1.7) * 0.02 + kick
      bloomAArr[k4 + 1] = Math.sin(t * 0.2 + f.phase) * 0.004 + dx * 0.02
      bloomAArr[k4 + 2] = Math.cos(t * 0.17 + f.phase * 1.6) * 0.0036 + dy * 0.02
      bloomAArr[k4 + 3] = 1 + Math.sin(t * 0.45 + f.phase) * 0.013 + h * 0.02
    }
    gl.uniform3fv(uni[`uBloom[0]`], bloomArr)
    gl.uniform4fv(uni[`uBloomA[0]`], bloomAArr)
  }

  // ---------- 花瓣与星芒（2D 叠加） ----------

  /** 换上真花瓣 sprite（art/petal-*.png，透明底）；加载失败的条目自动跳过 */
  setPetalImages(imgs: HTMLImageElement[]): void {
    this.petalImgs = imgs
    this.petals = []
    this.syncPetals()
  }

  private loadPetals(urls: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(
      urls.map(
        (u) =>
          new Promise<HTMLImageElement | null>((res) => {
            const img = new Image()
            img.onload = () => res(img)
            img.onerror = () => res(null)
            img.src = u
          }),
      ),
    ).then((xs) => xs.filter((x): x is HTMLImageElement => x !== null))
  }

  private syncPetals(): void {
    while (this.petals.length < this.petalCount) {
      const rnd = this.rnd
      const px = (0.022 + rnd() * 0.02) * Math.min(this.W, this.H)
      const img = this.petalImgs.length ? this.petalImgs[(rnd() * this.petalImgs.length) | 0] : null
      let sprite: CanvasImageSource
      let dw: number
      let dh: number
      if (img) {
        dw = px * 2.4
        dh = dw * (img.naturalHeight / img.naturalWidth)
        sprite = img
      } else {
        const c = makePetalSprite(px * this.DPR, PETAL_PALETTE[(rnd() * PETAL_PALETTE.length) | 0], rnd)
        dw = dh = c.width / this.DPR
        sprite = c
      }
      this.petals.push({
        nx: 0.08 + ((this.petals.length * 0.37 + rnd() * 0.3) % 0.84),
        ny: 0.1 + ((this.petals.length * 0.53 + rnd() * 0.3) % 0.8),
        vx: 0,
        vy: 0,
        rot: rnd() * Math.PI * 2,
        vr: (rnd() - 0.5) * 0.002,
        phase: rnd() * Math.PI * 2,
        px,
        sprite,
        dw,
        dh,
      })
    }
  }

  private updatePetals(dt: number, t: number): void {
    for (const p of this.petals) {
      const [dx, dy] = this.gradAt(p.nx * this.nx, p.ny * this.ny)
      p.vx += dx * 0.0017
      p.vy += dy * 0.0017
      p.vx += Math.sin(t * 0.18 + p.phase) * 0.0000065
      p.vy += Math.cos(t * 0.14 + p.phase * 1.7) * 0.0000065
      const pad = 0.05
      if (p.nx < pad) p.vx += (pad - p.nx) * 0.0007
      if (p.nx > 1 - pad) p.vx -= (p.nx - (1 - pad)) * 0.0007
      if (p.ny < pad) p.vy += (pad - p.ny) * 0.0007
      if (p.ny > 1 - pad) p.vy -= (p.ny - (1 - pad)) * 0.0007
      p.vx *= 0.984
      p.vy *= 0.984
      p.nx += p.vx * dt * 60
      p.ny += p.vy * dt * 60
      p.rot += p.vr + dx * 0.012
    }
  }

  private drawPetals(t: number): void {
    const { fctx } = this
    for (const p of this.petals) {
      const h = this.gradAt(p.nx * this.nx, p.ny * this.ny)[2]
      const x = p.nx * this.W
      const y = p.ny * this.H + h * 3
      const sw = p.dw
      const sh = p.dh
      fctx.save()
      fctx.translate(x + p.px * 0.16, y + p.px * 0.26)
      fctx.rotate(p.rot)
      fctx.globalAlpha = 0.2
      fctx.fillStyle = "rgba(70, 100, 110, 0.6)"
      fctx.beginPath()
      fctx.ellipse(0, 0, p.px * 0.8, p.px * 0.4, 0, 0, Math.PI * 2)
      fctx.fill()
      fctx.restore()
      fctx.save()
      fctx.translate(x, y)
      fctx.rotate(p.rot + Math.sin(t * 1.1 + p.phase) * 0.04)
      fctx.scale(1 + h * 0.15, 1 + h * 0.15)
      fctx.drawImage(p.sprite, -sw / 2, -sh / 2, sw, sh)
      fctx.restore()
    }
  }

  private addSparkle(x: number, y: number, big: boolean): void {
    const base = Math.max(1, Math.min(this.W, this.H) * 0.0042)
    this.sparkles.push({
      x,
      y,
      life: 0,
      max: 0.5 + this.rnd() * (big ? 1.1 : 0.8),
      size: base * ((big ? 1.6 : 1) + this.rnd() * (big ? 2.2 : 1.4)),
      rot: this.rnd() * Math.PI,
      vy: -(2 + this.rnd() * 5),
      gold: this.rnd() < 0.35,
    })
  }

  private burst(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2
      const r = this.rnd() * Math.min(this.W, this.H) * 0.05
      this.addSparkle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, true)
    }
  }

  private updateSparkles(dt: number): void {
    const { fctx } = this
    if (!document.hidden) {
      let n = 16 * dt
      while (n > 0) {
        if (this.rnd() < n) this.addSparkle(this.rnd() * this.W, this.rnd() * this.H, false)
        n -= 1
      }
    }
    fctx.save()
    fctx.globalCompositeOperation = "lighter"
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i]
      s.life += dt
      if (s.life > s.max) {
        this.sparkles.splice(i, 1)
        continue
      }
      const k = s.life / s.max
      const al = Math.sin(k * Math.PI)
      const y = s.y + s.vy * s.life
      const sz = s.size * (0.6 + 0.4 * al)
      fctx.save()
      fctx.translate(s.x, y)
      fctx.rotate(s.rot + k * 0.7)
      const col = s.gold ? "255, 236, 190" : "255, 255, 255"
      const g0 = fctx.createRadialGradient(0, 0, 0, 0, 0, sz * 2.2)
      g0.addColorStop(0, `rgba(${col}, ${0.85 * al})`)
      g0.addColorStop(1, `rgba(${col}, 0)`)
      fctx.fillStyle = g0
      fctx.beginPath()
      fctx.arc(0, 0, sz * 2.2, 0, Math.PI * 2)
      fctx.fill()
      fctx.strokeStyle = `rgba(${col}, ${al})`
      fctx.lineWidth = 1
      fctx.lineCap = "round"
      fctx.beginPath()
      fctx.moveTo(-sz * 1.9, 0)
      fctx.lineTo(sz * 1.9, 0)
      fctx.moveTo(0, -sz * 1.9)
      fctx.lineTo(0, sz * 1.9)
      fctx.stroke()
      fctx.restore()
    }
    fctx.restore()
  }

  // ---------- 交互 ----------

  private onMove = (e: PointerEvent): void => {
    const r = this.stage.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    if (this.lastMx >= 0) {
      const d = Math.hypot(px - this.lastMx, py - this.lastMy)
      if (d > 3) this.drop((px / this.W) * this.nx, (py / this.H) * this.ny, 2.4, 0.4)
    }
    this.lastMx = px
    this.lastMy = py
  }

  private onDown = (e: PointerEvent): void => {
    const r = this.stage.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    this.drop(((px / this.W) * this.nx) | 0, ((py / this.H) * this.ny) | 0, 6, 2.2)
    this.burst(px, py, 14)
    this.lastMx = px
    this.lastMy = py
  }

  private onLeave = (): void => {
    this.lastMx = -1
    this.lastMy = -1
  }

  private onVis = (): void => {
    if (document.hidden) this.pause()
    else if (!this.reduced && !this.disposed) this.start()
  }

  // ---------- 主循环 ----------

  private renderGL(t: number): void {
    const { gl, uni } = this
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.texSim)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.nx, this.ny, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.simBytes)
    gl.uniform1f(uni.uRefr, 0.42)
    gl.uniform1f(uni.uLight, 1)
    gl.uniform1f(uni.uTime, t)
    this.updateBlooms(t)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private frame = (now: number): void => {
    if (!this.running) return
    const dt = Math.min(0.05, (now - this.lastT) / 1000)
    this.lastT = now
    const t = now / 1000

    // 环境呼吸：水面不时被轻吻一下
    this.breathT -= dt
    if (this.breathT <= 0) {
      this.breathT = 0.4 + Math.random() * 1.3
      this.drop(2 + Math.random() * (this.nx - 4), 2 + Math.random() * (this.ny - 4), 2, 0.14)
    }

    this.stepWater()
    this.packSim()
    this.renderGL(t)

    this.fctx.clearRect(0, 0, this.W, this.H)
    this.updatePetals(dt, t)
    this.drawPetals(t)
    this.updateSparkles(dt)

    this.raf = requestAnimationFrame(this.frame)
  }

  private renderStatic(): void {
    this.renderGL(0)
  }

  start(): void {
    if (this.running || this.reduced || this.disposed) return
    this.running = true
    this.lastT = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  pause(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  dispose(): void {
    this.disposed = true
    this.pause()
    this.ro.disconnect()
    this.stage.removeEventListener("pointermove", this.onMove)
    this.stage.removeEventListener("pointerdown", this.onDown)
    this.stage.removeEventListener("pointerleave", this.onLeave)
    document.removeEventListener("visibilitychange", this.onVis)
    const { gl } = this
    if (this.texWater) gl.deleteTexture(this.texWater)
    if (this.texSim) gl.deleteTexture(this.texSim)
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    this.glCv.remove()
    this.fxCv.remove()
  }
}
