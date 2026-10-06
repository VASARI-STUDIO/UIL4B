// three.js's Draco geometry decoder and Basis Universal (KTX2) transcoder.
//
// Like the Rhino engine, each is fetched from jsDelivr at an exact version (the
// three.js version installed here) and handed to its loader only if both files
// match their pinned SHA-256 (see integrity.js). A glTF needs one only when it
// declares KHR_draco_mesh_compression or KHR_texture_basisu, so nothing is
// fetched until such a file is opened, and the verified bytes are kept for the
// rest of the visit. The loaders read the files through their LoadingManager;
// the caller answers with blob: URLs made from the verified bytes, so neither
// loader reaches the network itself.
//
// Draco uses its glTF-only build, the smaller of the two (192,420 bytes of
// wasm). vite.config.js blanks the loaders' default paths, so no copy of either
// decoder is emitted into the build.
import { fetchVerified } from '../integrity.js'

export const THREE_VERSION = '0.186.0'
const BASE = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/libs`

export const DECODERS = Object.freeze({
  draco: Object.freeze({
    label: 'The Draco decoder',
    js: `${BASE}/draco/gltf/draco_wasm_wrapper.js`,
    wasm: `${BASE}/draco/gltf/draco_decoder.wasm`,
    sha256: Object.freeze({
      js: '8bb2952d2ba7d67e1414f8df819410cb0434a666be53f671fff75f68843d76f6',
      wasm: 'a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac',
    }),
  }),
  basis: Object.freeze({
    label: 'The KTX2 texture decoder',
    js: `${BASE}/basis/basis_transcoder.js`,
    wasm: `${BASE}/basis/basis_transcoder.wasm`,
    sha256: Object.freeze({
      js: '8478b5b6d6b74e7d3082b89f6417321d8d1dc0307f2b30d4484bb11b441696a1',
      wasm: '6cf17dc889352c42e9acf8897107978d127005fe3386c36a0e3845e27967630a',
    }),
  }),
})

const pending = {}

/** A decoder's verified { js, wasm } bytes, fetched once per visit. */
export function decoderBytes(name, { signal } = {}) {
  const d = DECODERS[name]
  if (!d) throw new Error(`no decoder named ${name}`)
  if (!pending[name]) {
    pending[name] = Promise.all([
      fetchVerified(d.js, d.sha256.js, { label: `${d.label} script`, signal }),
      fetchVerified(d.wasm, d.sha256.wasm, { label: d.label, signal }),
    ]).then(([js, wasm]) => ({ js, wasm })).catch((err) => {
      delete pending[name]
      if (err?.name === 'IntegrityError' || err?.name === 'AbortError') throw err
      throw new Error(`${d.label.replace(/^The /, 'the ')} could not be fetched (${err?.message || err})`)
    })
  }
  return pending[name]
}

/**
 * blob: URLs for a decoder's verified files, and the function that revokes
 * them. Nothing is minted until the bytes have passed their check.
 * @returns {Promise<{ js: string, wasm: string, revoke: () => void }>}
 */
export async function decoderURLs(name, options) {
  const { js, wasm } = await decoderBytes(name, options)
  const urls = {
    js: URL.createObjectURL(new Blob([js], { type: 'text/javascript' })),
    wasm: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
  }
  return { ...urls, revoke: () => { URL.revokeObjectURL(urls.js); URL.revokeObjectURL(urls.wasm) } }
}

/** Forget cached bytes (tests). */
export function resetDecoders() {
  for (const k of Object.keys(pending)) delete pending[k]
}
