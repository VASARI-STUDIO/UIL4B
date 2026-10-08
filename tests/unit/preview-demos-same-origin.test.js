import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { stripHtml, stripCss, stripJs } from '../helpers/strip-comments.js'

const PUBLIC = path.resolve('public')
const PREVIEWS = path.join(PUBLIC, 'previews')
const ORIGIN = 'https://preview.invalid'

// Exceptions are scoped to an exact repository path and URL, so another file
// cannot reuse an existing exception. No current resource needs an exception.
const ALLOWLIST = []

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? htmlFiles(file) : /\.html$/i.test(file) ? [file] : []
  })
}

function attributes(tag) {
  const attrs = new Map()
  for (const match of tag.matchAll(/([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4])
  }
  return attrs
}

test('preview demos and their loaded CSS/JS use same-origin resources', (t) => {
  const queue = htmlFiles(PREVIEWS)
  assert.ok(queue.length > 0, 'No HTML files found under public/previews/')
  const scanned = new Set()
  const violations = new Set()

  function resource(file, value) {
    const url = value.trim()
    const relative = path.relative(process.cwd(), file).split(path.sep).join('/')
    if (/^(?:https?:)?\/\//i.test(url)) {
      if (!ALLOWLIST.some((entry) => entry.file === relative && entry.url === url)) {
        violations.add(`${relative}: ${url}`)
      }
      return
    }
    if (!url || /^(?:data|blob):/i.test(url)) return
    const resolved = new URL(url, new URL(relative.slice('public'.length), ORIGIN))
    if (resolved.origin !== ORIGIN || !/\.(?:css|js)$/i.test(resolved.pathname)) return
    const local = path.resolve(PUBLIC, '.' + decodeURIComponent(resolved.pathname))
    if (local.startsWith(PUBLIC + path.sep) && fs.existsSync(local)) queue.push(local)
  }

  function css(file, source) {
    const clean = stripCss(source)
    for (const match of clean.matchAll(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi)) {
      resource(file, match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5])
    }
  }

  function js(file, source) {
    const clean = stripJs(source)
    // Include side-effect imports and re-exports as well as imports with from.
    const loads = /\b(?:import\s*(?:\(\s*|(?=["'`])|[^;"'`]*?\bfrom\s*)|export\s+[^;"'`]*?\bfrom\s*|fetch\s*\(\s*|new\s+Worker\s*\(\s*)(["'`])([^"'`]*?)\1/g
    for (const match of clean.matchAll(loads)) resource(file, match[2])
  }

  function html(file, source) {
    // Raw script/style text must not be mistaken for HTML tags or attributes.
    const clean = stripHtml(source).replace(/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi, (whole, kind, attrs, body) => {
      if (kind.toLowerCase() === 'script') {
        const src = attributes(attrs).get('src')
        if (src) resource(file, src)
        js(file, body)
      } else css(file, body)
      return ' '.repeat(whole.length)
    })
    for (const match of clean.matchAll(/<(script|link|img|source|video|audio|iframe|[a-z][\w-]*)\b([^>]*?)(?:\/?>)/gi)) {
      const kind = match[1].toLowerCase()
      const attrs = attributes(match[2])
      if (attrs.has('style')) css(file, attrs.get('style'))
      if (kind === 'link') {
        if (/\b(?:stylesheet|preload|modulepreload|icon)\b/i.test(attrs.get('rel') || '') && attrs.has('href')) {
          resource(file, attrs.get('href'))
        }
      } else if (['script', 'img', 'source', 'video', 'audio', 'iframe'].includes(kind)) {
        if (attrs.has('src')) resource(file, attrs.get('src'))
        if (['img', 'source'].includes(kind) && attrs.has('srcset')) {
          // Data-URI commas are not remote URLs; inspect external candidates
          // independently, then follow local candidates with CSS/JS extensions.
          for (const candidate of attrs.get('srcset').split(',')) {
            resource(file, candidate.trim().split(/\s+/)[0])
          }
        }
      }
    }
  }

  while (queue.length) {
    const file = queue.shift()
    if (scanned.has(file)) continue
    scanned.add(file)
    const source = fs.readFileSync(file, 'utf8')
    if (/\.html$/i.test(file)) html(file, source)
    else if (/\.css$/i.test(file)) css(file, source)
    else js(file, source)
  }
  t.diagnostic(`Scanned ${scanned.size} files (${[...scanned].filter((file) => /\.html$/i.test(file)).length} HTML)`)
  assert.deepEqual([...violations].sort(), [], 'Off-origin preview resources (file: URL)')
})
