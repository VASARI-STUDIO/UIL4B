// ── Code from a CDN runs only if it is the code we pinned ────────────────────
//
// The converter engine (ffmpegEngine.js) and the CAD engine (cadEngine.js) are
// fetched from jsDelivr at an exact version and then EXECUTED on our origin —
// in a worker that shares this origin's IndexedDB (where the auth token lives)
// and can make credentialed requests to /api. A pinned version names an
// artifact; it does not prove the bytes that arrive are that artifact. A
// compromised or mistaken CDN response would otherwise run with everything
// this origin can reach.
//
// So each file is fetched as bytes, hashed with SHA-256, and compared with the
// hash recorded beside the version. Only a match is ever turned into something
// executable (a blob: URL for importScripts / import, or a wasmBinary). A
// mismatch FAILS CLOSED: nothing is executed, and the caller says plainly that
// the engine did not match and was not run.

/** Thrown when fetched bytes do not match their pinned SHA-256. */
export class IntegrityError extends Error {
  constructor(message) {
    super(message)
    this.name = 'IntegrityError'
  }
}

const toHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

/** Lower-case hex SHA-256 of an ArrayBuffer or typed array. */
export async function sha256Hex(bytes) {
  const view = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  return toHex(await crypto.subtle.digest('SHA-256', view))
}

/**
 * Resolve if `bytes` hash to `expected`; throw IntegrityError otherwise. The
 * comparison is the whole contract — callers do nothing with the bytes until
 * this has returned.
 */
export async function assertIntegrity(bytes, expected, label) {
  if (!/^[0-9a-f]{64}$/.test(expected || '')) throw new IntegrityError(`${label} has no valid pinned fingerprint, so it was not run`)
  const got = await sha256Hex(bytes)
  if (got !== expected) {
    throw new IntegrityError(`${label} did not match its pinned fingerprint, so it was not run (expected ${expected.slice(0, 12)}…, received ${got.slice(0, 12)}…)`)
  }
}

/**
 * Fetch `url` in full, reporting `onBytes({ received, total })` as it arrives,
 * then verify it against `sha256`. Returns the verified ArrayBuffer.
 *
 * `total` is the Content-Length hint; with compression on it describes the
 * compressed body while the reader yields decompressed bytes, so callers treat
 * it as a hint. Honours `signal` for Cancel.
 */
export async function fetchVerified(url, sha256, { label = url, onBytes, signal } = {}) {
  const resp = await fetch(url, { signal, credentials: 'omit' })
  if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`)
  const total = Number(resp.headers.get('content-length')) || 0
  const reader = resp.body?.getReader?.()
  let buf
  if (!reader) {
    buf = await resp.arrayBuffer()
    onBytes?.({ received: buf.byteLength, total: buf.byteLength })
  } else {
    const chunks = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      onBytes?.({ received, total })
    }
    const data = new Uint8Array(received)
    let at = 0
    for (const c of chunks) { data.set(c, at); at += c.length }
    buf = data.buffer
  }
  await assertIntegrity(buf, sha256, label)
  return buf
}
