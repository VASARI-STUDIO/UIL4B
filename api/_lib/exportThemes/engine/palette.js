// Palette files for the brand kit: Adobe Swatch Exchange (binary), CSS and JSON.
import { hexToRgb } from './color.js';

// ASE: 'ASEF', version 1.0, block count, then one colour block per swatch (RGB, floats 0 to 1, big endian).
export function paletteAse(ctx) {
  const list = [...ctx.colours, ...ctx.tones].map((c) => ({ name: c.name, hex: c.hex }));
  const blocks = list.map((c) => {
    const name = Buffer.alloc((c.name.length + 1) * 2);
    for (let i = 0; i < c.name.length; i++) name.writeUInt16BE(c.name.charCodeAt(i), i * 2);
    const [r, g, b] = hexToRgb(c.hex).map((v) => v / 255);
    const body = Buffer.alloc(2 + name.length + 4 + 12 + 2);
    let o = 0;
    body.writeUInt16BE(c.name.length + 1, o); o += 2;
    name.copy(body, o); o += name.length;
    body.write('RGB ', o, 'ascii'); o += 4;
    for (const v of [r, g, b]) { body.writeFloatBE(v, o); o += 4; }
    body.writeUInt16BE(2, o); // colour type: normal
    const head = Buffer.alloc(6); head.writeUInt16BE(0x0001, 0); head.writeUInt32BE(body.length, 2);
    return Buffer.concat([head, body]);
  });
  const hdr = Buffer.alloc(12); hdr.write('ASEF', 0, 'ascii'); hdr.writeUInt16BE(1, 4); hdr.writeUInt16BE(0, 6); hdr.writeUInt32BE(blocks.length, 8);
  return Buffer.concat([hdr, ...blocks]);
}

export function paletteCss(ctx) {
  const lines = [];
  for (const c of ctx.colours) {
    lines.push(`  --palette-${c.id}: ${c.hex};`);
    for (const [k, v] of Object.entries(c.ramp)) lines.push(`  --palette-${c.id}-${k}: ${v};`);
  }
  for (const t of ctx.tones) lines.push(`  --palette-${t.id}: ${t.hex};`);
  return `/* ${ctx.brand.name} palette. Brand colours with their tint ramps, then the measured tones. */\n:root {\n${lines.join('\n')}\n}\n`;
}

export function paletteJson(ctx) {
  return {
    brand: ctx.brand.name,
    colours: ctx.colours.map((c) => ({ id: c.id, name: c.name, hex: c.hex, rgb: c.rgb, oklch: c.oklch, role: c.role, use: c.lands, ramp: c.ramp })),
    tones: ctx.tones.map((t) => ({ id: t.id, name: t.name, hex: t.hex, role: t.role, use: t.lands })),
    pairs: ctx.pairs.map((p) => ({ foreground: p.fgHex, background: p.bgHex, ratio: Number(p.ratioText), use: p.use })),
  };
}
