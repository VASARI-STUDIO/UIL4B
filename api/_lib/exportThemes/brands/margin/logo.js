// Margin's logo: the name set beside a Plum margin rule, as a margin is ruled on a proof. The rule is a hairline that overshoots
// the name above and below (like the margin line running the full depth of a ruled page) and stands a clear gap away from it,
// so it reads as a ruled line and never as a typed "|". The primary version overshoots by 0.8 cap each way; the horizontal
// version and the symbol overshoot by 0.35 cap, tight enough for a short space. The clear-space unit is the gap beside the rule.
// Called by engine/logo.js with { brand, font, outline, capHeight }; see brands/kerbside/logo.js for the contract.
export default function marginLogo({ brand, font, outline, capHeight }) {
  const size = 100, track = 0;
  const cap = capHeight(font, size);
  const word = brand.logo.showcase.wordmark;
  const name = outline(font, word, size, track);
  const W = name.x2 - name.x1;
  const foot = Math.max(0, name.y2);                          // the lowest mark of the name (the g), baseline at 0
  const T = 0.08 * cap, gap = 0.6 * cap;                      // rule weight; the space beside it (also the clear-space unit)
  const over = { wide: 0.8 * cap, tight: 0.35 * cap };        // how far the rule runs past the cap line and past the foot
  const bar = (x, y, h) => `M${x.toFixed(2)} ${y.toFixed(2)} H${(x + T).toFixed(2)} V${(y + h).toFixed(2)} H${x.toFixed(2)} Z`;
  const place = (o, x, y, sc = 1) => `translate(${(x - o.x1 * sc).toFixed(2)} ${y.toFixed(2)})${sc === 1 ? '' : ` scale(${sc})`}`;

  // a name with its rule on the left: the rule runs from `up` above the cap line to `down` below the lowest mark `low`
  const ruled = (o, w, low, up, down) => {
    const h = cap + up + low + down;
    return { w: T + gap + w, h, parts: [{ d: bar(0, 0, h), role: 'rule', tf: '' }, { d: o.d, role: 'name', tf: place(o, T + gap, cap + up) }] };
  };
  const primary = ruled(name, W, foot, over.wide, over.wide);
  const horizontal = ruled(name, W, foot, over.tight, over.tight);

  const m = outline(font, [...word][0], size, track);
  const symbol = ruled(m, m.x2 - m.x1, 0, over.tight, over.tight);

  // stacked: the symbol over the name, both hung from the left edge; the name carries no second rule
  const k = 0.5, nameW = W * k, sgap = cap * 0.7, sw = Math.max(symbol.w, nameW);
  const stacked = {
    w: sw, h: symbol.h + sgap + (cap + foot) * k,
    parts: [
      ...symbol.parts.map((q) => ({ role: q.role, d: q.d, tf: q.tf })),
      { d: name.d, role: 'name', tf: `translate(${(-name.x1 * k).toFixed(2)} ${(symbol.h + sgap + cap * k).toFixed(2)}) scale(${k})` },
    ],
  };

  return { primary, horizontal, stacked, symbol, clearUnit: gap, roles: { name: 'name', rule: 'rule' }, geo: { W, T, cap, gap, H: primary.h, foot } };
}
