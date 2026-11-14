// The library data as plain named exports, for build scripts and tests.
//
// Uses top-level await, so the API request path must NOT import this module;
// it awaits loadLibrary() from load.js inside the handler instead.
import { loadLibrary } from './load.js'

const lib = await loadLibrary()

export const DATA_SOURCE = lib.source
export const GALLERY_PALETTES = lib.GALLERY_PALETTES
export const BRAND_PALETTES = lib.BRAND_PALETTES
export const CURATED_LIBRARY_PALETTES = lib.CURATED_LIBRARY_PALETTES
export const BRAND_LIBRARY_PALETTES = lib.BRAND_LIBRARY_PALETTES
export const LIBRARY_PALETTES = lib.LIBRARY_PALETTES
export const GALLERY_GRADIENTS = lib.GALLERY_GRADIENTS
export const COMMUNITY_PROMPTS = lib.COMMUNITY_PROMPTS
export const LIBRARIES = lib.LIBRARIES
