// Photographed mockups, for a server that cannot draw them. The engine's own mockup.js composites artwork onto scene photographs in a
// browser; a slot export draws no mockup, so this keeps the surface a theme's pages read (ctx.sceneInfo, ctx.mockup, ctx.artPage) and
// draws nothing: ctx.mockup checks the art's shape as the engine does and returns a neutral plate of the scene's size as a data: URL
// (the print documents allow images from data: only). No file, browser or process is touched.
import { SCENES } from './scenes.js';

export const setMockupCache = () => {};
export const renderMockups = async () => ({ rendered: 0, cached: 0, ms: 0 });
export const copyMockups = () => 0;
export const mockupStats = () => ({ rendered: 0, cached: 0, ms: 0 });
// eslint-disable-next-line no-unused-vars -- the geometry is left out of the index on purpose
export const sceneIndex = () => Object.values(SCENES).map(({ w, h, quads, ...entry }) => entry);

export function loadScene(id) {
  const scene = SCENES[id];
  if (!scene) throw new Error(`No mockup scene "${id}". Scenes: ${Object.keys(SCENES).join(', ')}`);
  return scene;
}

// homography from the unit square to quad q (tl, tr, br, bl), as a CSS matrix3d for a w x h element
export function quadMatrix(w, h, q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(10)).join(',')})`;
}

// Adds ctx.mockup, ctx.artPage and ctx.sceneInfo with the engine's signatures. T is the theme module (unused: no art document is built).
export function addMockups(ctx) {
  ctx.mockupsUsed = new Set();
  ctx.artPage = () => '';
  ctx.sceneInfo = (id) => loadScene(id);
  ctx.mockup = (sceneId, arts) => {
    const scene = loadScene(sceneId);
    const list = scene.surfaces.map((name, i) => (Array.isArray(arts) ? arts[i] : arts[name]) || null);
    if (!Array.isArray(arts)) for (const k of Object.keys(arts)) if (!scene.surfaces.includes(k)) throw new Error(`Scene ${sceneId} has no surface "${k}". Surfaces: ${scene.surfaces.join(', ')}`);
    if (!list.some(Boolean)) throw new Error(`mockup(${sceneId}): no art given`);
    list.forEach((a, i) => {
      if (!a) return;
      if (!(a.w > 0) || !(a.h > 0)) throw new Error(`mockup(${sceneId}): art for ${scene.surfaces[i]} needs { html, w, h }`);
      const want = scene.quads[i].aspect, got = a.w / a.h;
      if (Math.abs(got / want - 1) > 0.05) throw new Error(`mockup(${sceneId}): art for ${scene.surfaces[i]} is ${a.w} x ${a.h} (${got.toFixed(3)}) but the surface is ${want} wide to high`);
    });
    const ground = scene.ground === 'dark' ? '#2a2a2a' : '#e6e3dc';
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.w} ${scene.h}"><rect width="100%" height="100%" fill="${ground}"/></svg>`);
  };
  return ctx;
}
