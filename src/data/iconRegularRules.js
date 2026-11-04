// Each pack's Regular weight excludes its alternate glyph variants. Kept apart
// from the page so scripts/snapshot-icon-heads.mjs applies the same rule the
// grid does when it records the names the default listing starts from.
export const REGULAR_RULES = {
  ph: n => !/-(?:thin|light|bold|fill|duotone)$/.test(n),
  heroicons: n => !/-solid$/.test(n),
  iconoir: n => !/-solid$/.test(n),
  tabler: n => !/-filled$/.test(n),
  mdi: n => !/-outline$/.test(n),
  'material-symbols': n => !/-(?:outline(?:-(?:rounded|sharp))?|rounded|sharp)$/.test(n),
  solar: n => /-bold(?:-duotone)?$/.test(n),
  // Every Fluent glyph repeats at 10 to 48px; the 24px Regular one is one per concept.
  fluent: n => /-24-regular$/.test(n),
  bi: n => !/-fill$/.test(n),
  // -sharp is a square-cornered alternate of the same glyph, -solid its fill.
  pixelarticons: n => !/-(?:sharp|solid)$/.test(n),
}
export const matchesRegular = (pack, name) => REGULAR_RULES[pack]?.(name) ?? true
