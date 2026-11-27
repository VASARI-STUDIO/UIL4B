import { esc } from './specimens.mjs';

// These illustrations are composed in a square so the artwork can be used on paper and screens.
const repeat = (count, draw) => Array.from({length:count}, (_, i) => draw(i)).join('');
const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const circle = (x,y,r,fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const rect = (x,y,w,h,fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const stroke = (d,colour,width) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}"/>`;
const drawings = {
  flyleaf: ([paper,ink,spot]) => {
    const leaves = repeat(17, i => stroke(`M42 298 Q90 ${120-i*4} 197 ${241-i*7} Q262 ${98-i*3} 357 ${81+i*5}`,ink,2.7));
    return path('M42 298 Q117 139 197 241 Q267 121 357 162 L347 196 Q280 171 199 272 Q123 206 42 298Z',spot)+leaves;
  },
  'set-square': ([paper,ink,spot]) =>
    repeat(7,i=>{const x=38+34*i,y=267-24*i;return path(`M${x} ${y} l56 -32 41 23 -56 32 Z`,spot)+path(`M${x} ${y} l41 23 v28 l-41 -23 Z`,ink)+path(`M${x+41} ${y+23} l56 -32 v28 l-56 32 Z`,paper)+stroke(`M${x+41} ${y+51} l56 -32 v-28`,ink,1.3)}),
  dispatch: ([paper,ink,spot]) =>
    repeat(6,i=>path(`M${-165+i*65} 36 h40 l128 156 -128 172 h-40 l126 -172 Z`,i===4?spot:ink)),
  doorlist: ([paper,ink,spot]) => {
    const rays=repeat(46,i=>{const a=i*2*Math.PI/46;return stroke(`M200 200 L${200+Math.cos(a)*184} ${200+Math.sin(a)*184}`,ink,i%2?4:7)});
    return rays+circle(200,200,54,paper)+circle(200,200,29,spot)+circle(200,200,7,ink);
  },
  'market-day': ([paper,ink,spot]) => {
    const seed=(x,y,r)=>circle(x,y,r,ink)+circle(x-4,y-5,r*.65,spot)+path(`M${x-8} ${y-r-3} q-18 -32 -43 -27 11 27 38 33Z`,ink);
    return seed(137,184,62)+seed(225,240,78)+seed(272,132,51);
  },
  'contact-sheet': ([paper,ink,spot]) =>
    repeat(7,i=>{const w=280-i*32;return `<g transform="translate(200 200) rotate(${i*8-24})">`+rect(-w/2,-w/2,w,w,i%2?paper:ink)+'</g>'})+rect(177,176,48,48,spot),
  workbench: ([paper,ink,spot]) => {
    const hinge=(x,y)=>circle(x,y,9,paper)+circle(x,y,3,ink);
    return stroke('M54 312 L152 99 L213 302 L337 83',ink,31)+stroke('M152 99 L213 302',spot,30)+hinge(152,99)+hinge(213,302)+repeat(15,i=>stroke(`M${59+i*6} ${295-i*13} l9 4`,paper,2));
  },
  soundings: ([paper,ink,spot]) =>
    repeat(12,i=>stroke(`M-20 ${76+i*17} C88 ${76+i*17} 117 ${43+i*14} 205 ${150+i*11} S307 ${205+i*12} 422 ${192+i*14}`,ink,2.6))+stroke('M44 280 L312 67',spot,5)+circle(44,280,11,ink)+circle(312,67,11,ink),
  hearth: ([paper,ink,spot]) =>
    circle(268,101,67,spot)+path('M39 244 L177 111 L337 245 L315 266 L177 151 L61 266Z',ink)+path('M81 251 L177 162 L285 255 L285 316 L81 316Z',ink)+repeat(10,i=>stroke(`M${82+i*20} 318 l55 -56`,paper,3)),
  offprint: ([paper,ink,spot]) =>
    repeat(7,i=>stroke(`M${-140+i*36} 0 V180 Q${-140+i*36} ${316-i*10} ${-8+i*36} ${316-i*10} H420`,i===4?spot:ink,i===4?13:6)),
};

export function printStudy(id,colours,inkFor) {
  const base=colours[0], ink=inkFor(base,colours);
  const spot=colours.find(c=>c!==ink && c!==base && inkFor(c,[base])===base) || colours.find(c=>c!==ink && c!==base) || ink;
  return `<svg class="print-study" viewBox="0 0 400 400" aria-hidden="true" focusable="false">${rect(0,0,400,400,base)}${drawings[id]([base,ink,spot])}</svg>`;
}

// Names describe the construction without assuming the customer's industry or brand name.
export const studyNames = {
  flyleaf:'Folded leaves', 'set-square':'Stepped elevation', dispatch:'Direction of travel',
  doorlist:'Radial impression', 'market-day':'Fruit and seed', 'contact-sheet':'Nested apertures',
  workbench:'Folding rule', soundings:'Crossing lines', hearth:'Roof and sun', offprint:'Lane turns',
};

export function paletteStudy(art, id, rows) {
  return `<div class="ink-study"><figure>${art}<figcaption>${studyNames[id]}</figcaption></figure><dl>${rows.map(({name,hex,foreground,ratio,usage})=>`<div style="--sample:${hex};--sample-ink:${foreground}"><dt><i style="background:${hex}"></i>${esc(name)}</dt><dd><code>${hex}</code><small>${ratio}:1 · ${foreground}</small>${usage?`<p>${esc(usage)}</p>`:''}</dd></div>`).join('')}</dl></div>`;
}

export function actionProof(project,art,photo,caption) {
  const first=project.items?.[0];
  return `<aside class="action-proof"><div class="action-art">${photo?`<img src="${photo}" alt="${esc(caption)}">`:art}</div><div class="action-copy"><small>${esc(project.screenTitle || project.name)}</small><strong>${esc(first?.title || project.headline || project.name)}</strong>${first?.detail?`<p>${esc(first.detail)}</p>`:''}</div></aside>`;
}

