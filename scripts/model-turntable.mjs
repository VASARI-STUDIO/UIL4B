#!/usr/bin/env node
// Renders the homepage 3D tab's sample part as a turntable:
//   public/spectrum/model-turn.webp    animated WebP with alpha, one full turn
//   public/spectrum/model-poster.webp  the first frame, still
//
// The part is an L-bracket built here from extruded outlines (no outside
// model, so nothing to license), shaded in a neutral grey with its feature
// edges drawn, the way a tessellated CAD part reads once converted to a mesh.
// The background is transparent, so one file sits on either theme's ground.
//
// Frames are drawn by three.js in headless Chromium (Playwright) and encoded
// by ffmpeg, which must be on PATH with libwebp. Budgets: loop <= 400 KB,
// poster <= 40 KB; the script fails if either is over.
//
//   node scripts/model-turntable.mjs [--frames 30] [--fps 15] [--quality 55]

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'spectrum')
const THREE_DIR = path.join(ROOT, 'node_modules', 'three', 'build')
const W = 1280
const H = 720
const LOOP_BUDGET = 400 * 1024
const POSTER_BUDGET = 40 * 1024

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? Number(process.argv[i + 1]) : fallback
}
const FRAMES = arg('frames', 30)
const FPS = arg('fps', 15)
const QUALITY = arg('quality', 55)

const PAGE = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style>
<script type="importmap">{"imports":{"three":"/build/three.module.js"}}</script></head>
<body><script type="module">
import * as THREE from 'three'
const W = ${W}, H = ${H}
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(W, H)
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(26, W / H, 1, 2000)
camera.position.set(175, 118, 175)
camera.lookAt(0, 26, 0)

scene.add(new THREE.HemisphereLight(0xf2f4f8, 0x30343c, 1.4))
const key = new THREE.DirectionalLight(0xffffff, 2.2)
key.position.set(160, 260, 120)
scene.add(key)
const rim = new THREE.DirectionalLight(0xdfe6f2, 1.1)
rim.position.set(-220, 120, -180)
scene.add(rim)
const fill = new THREE.DirectionalLight(0xffffff, 0.9)
fill.position.set(220, 80, 260)
scene.add(fill)

const metal = new THREE.MeshStandardMaterial({ color: 0x9da2a9, metalness: 0.12, roughness: 0.5 })
const edgeMat = new THREE.LineBasicMaterial({ color: 0x3b3f46, transparent: true, opacity: 0.7 })

// Millimetres. Plates 6 thick; base 90 x 56, upright 90 x 60.
const T = 6, L = 90, D = 56, U = 60
const circle = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p }
const slot = (x, y, w, r) => {
  const p = new THREE.Path()
  p.moveTo(x - w / 2, y - r); p.lineTo(x + w / 2, y - r)
  p.absarc(x + w / 2, y, r, -Math.PI / 2, Math.PI / 2, false)
  p.lineTo(x - w / 2, y + r)
  p.absarc(x - w / 2, y, r, Math.PI / 2, Math.PI * 1.5, false)
  return p
}
const rounded = (w, h, r) => {
  const s = new THREE.Shape()
  s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h - r)
  s.absarc(w - r, h - r, r, 0, Math.PI / 2, false)
  s.lineTo(r, h)
  s.absarc(r, h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(0, 0)
  return s
}
const bevel = { bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2, curveSegments: 40 }
const add = (geo, place) => {
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, metal)
  place(m)
  part.add(m)
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), edgeMat)
  e.position.copy(m.position); e.rotation.copy(m.rotation)
  part.add(e)
}
const part = new THREE.Group()

// Base plate, lying flat, two mounting slots.
const base = rounded(L, D, 10)
base.holes.push(slot(22, 34, 12, 5), slot(L - 22, 34, 12, 5))
add(new THREE.ExtrudeGeometry(base, { depth: T, ...bevel }), (m) => { m.rotation.x = -Math.PI / 2; m.position.set(-L / 2, 0, D / 2 - 4) })

// Upright plate, standing at the back edge, one bored hole and two small ones.
const up = rounded(L, U, 14)
up.holes.push(circle(L / 2, U - 24, 11), circle(16, U - 16, 3.5), circle(L - 16, U - 16, 3.5))
add(new THREE.ExtrudeGeometry(up, { depth: T, ...bevel }), (m) => { m.position.set(-L / 2, 0, -D / 2 + 4 - T) })

// Two gussets between the plates.
const g = new THREE.Shape()
g.moveTo(0, 0); g.lineTo(26, 0); g.lineTo(0, 30); g.lineTo(0, 0)
for (const x of [-L / 2 + 4, L / 2 - 4 - 5]) {
  add(new THREE.ExtrudeGeometry(g, { depth: 5, ...bevel, bevelThickness: 0.4, bevelSize: 0.4 }), (m) => {
    m.rotation.y = -Math.PI / 2; m.position.set(x + 5, T, -D / 2 + 4)
  })
}

part.position.y = 0
scene.add(part)

window.renderAt = (turn) => {
  part.rotation.y = turn * Math.PI * 2 + Math.PI / 7
  renderer.render(scene, camera)
  return renderer.domElement.toDataURL('image/png')
}
window.ready = true
</script></body></html>`

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
  if (r.error) throw new Error(`ffmpeg could not start (${r.error.message}); it must be on PATH, built with libwebp`)
  if (r.status !== 0) throw new Error(`ffmpeg exited ${r.status}`)
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'turntable-'))
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  await page.route('http://turntable.local/**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: PAGE })
    if (url.pathname.startsWith('/build/')) {
      const file = path.join(THREE_DIR, path.basename(url.pathname))
      if (fs.existsSync(file)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) })
    }
    return route.fulfill({ status: 404, body: '' })
  })
  page.on('pageerror', (e) => { throw e })
  await page.goto('http://turntable.local/')
  await page.waitForFunction(() => window.ready === true)
  for (let i = 0; i < FRAMES; i++) {
    const url = await page.evaluate((t) => window.renderAt(t), i / FRAMES)
    fs.writeFileSync(path.join(tmp, `f${String(i).padStart(3, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'))
  }
} finally {
  await browser.close()
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const loop = path.join(OUT_DIR, 'model-turn.webp')
const poster = path.join(OUT_DIR, 'model-poster.webp')
ffmpeg(['-framerate', String(FPS), '-i', path.join(tmp, 'f%03d.png'), '-c:v', 'libwebp_anim', '-loop', '0',
  '-quality', String(QUALITY), '-compression_level', '6', '-pix_fmt', 'yuva420p', loop])
ffmpeg(['-i', path.join(tmp, 'f000.png'), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '70',
  '-compression_level', '6', '-pix_fmt', 'yuva420p', poster])
fs.rmSync(tmp, { recursive: true, force: true })

const sizes = [[loop, LOOP_BUDGET], [poster, POSTER_BUDGET]].map(([f, budget]) => ({ f, bytes: fs.statSync(f).size, budget }))
for (const { f, bytes, budget } of sizes) console.log(`${path.relative(ROOT, f)}  ${(bytes / 1024).toFixed(1)} KB (budget ${budget / 1024} KB)`)
const over = sizes.filter((s) => s.bytes > s.budget)
if (over.length) {
  console.error(`over budget: ${over.map((s) => path.basename(s.f)).join(', ')}; lower --quality or --frames`)
  process.exit(1)
}
