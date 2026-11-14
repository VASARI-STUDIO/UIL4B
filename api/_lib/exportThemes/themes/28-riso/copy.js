// The book reads the brand through bookBrand(). Brand copy is printed whole, never sliced, split or replaced (12 Nov fix round).
// A rule such as "say free once" is kept by the layout (which page prints the line), not by editing the brand's own sentences.
// The one thing added is poster1, the line the first poster carries: Long Room's primary line is the intro headline, so the poster
// takes the brand's next whole line instead of printing the headline twice.
const POSTER1 = { 'Long Room': (B) => (B.lines.others || [])[0] };

export function bookBrand(ctx) {
  if (ctx._bk) return ctx._bk;
  const p1 = POSTER1[ctx.brand.name];
  return (ctx._bk = p1 ? { ...ctx.brand, poster1: p1(ctx.brand) } : ctx.brand);
}
