import { printCapture } from './print-capture.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readDesign } from '../../src/utils/styleGuideExport.js';
import { quadMatrix } from '../../api/_lib/exportThemes/engine/mockup.js';
import { esc } from './specimens.mjs';
import { printStudy } from './print-studies.mjs';
import { stationery } from './editorial.mjs';
import { ink, fontFace } from './document.mjs';

const treatments={
  flyleaf:'.front{align-items:center;text-align:center;border-inline:16px double}.front b{margin:auto}',
  'set-square':'.front{border:10px solid}.back{border-left:42px solid}.front b{border-bottom:5px solid;padding-bottom:10px}',
  dispatch:'.front{border-bottom:78px solid}.front b{margin-top:auto}.back strong{border-top:12px solid;padding-top:12px}',
  doorlist:'.front,.back{border-block:12px dashed}.front b{margin:auto 0}.front small{text-align:right}',
  'market-day':'.front{text-align:center;align-items:center}.front b{border-block:8px double}.back{border-top:12px double}',
  'contact-sheet':'.front{align-items:flex-end}.front b{writing-mode:vertical-rl;transform:rotate(180deg);font-size:64px}.front small{position:absolute;left:35px;bottom:32px}',
  workbench:'.back{border-left:42px solid}.front b{margin:auto 0;border-bottom:9px solid}.back strong{border-bottom:4px dashed}',
  soundings:'.front b{border-block:6px solid;padding:10px 0}.back{border-bottom:26px solid}',
  hearth:'.front{border-radius:90px 90px 0 0}.back strong{font-weight:400}.back{border-top:14px solid}',
  offprint:'.front{border-left:24px double}.back{border-block:12px double}.front small{align-self:flex-end}',
};

export async function photographCards(browser,root,id,project){
  if(!project.contactCard?.person) return '';
  const folder=path.join(root,stationery[id][0]);
  const scene=JSON.parse(await readFile(path.join(folder,'scene.json'),'utf8'));
  const d=readDesign(project.design),base=d.base || d.palette[0],onBase=ink(base,d.palette);
  const fonts=[...new Set([fontFace(d.heading,d.headingWeight),fontFace(d.body,d.bodyWeight)])].join('');
  const art=printStudy(id,d.palette,ink),c=project.contactCard;
  const front=`<b>${esc(project.name)}</b><small>${esc(project.headline)}</small>`;
  const back=`<span>${esc(project.name)}</span><div><strong>${esc(c.person)}</strong><p>${esc(c.role)}</p></div><small>${esc(c.contact)}</small>`;
  const surfaces=scene.quads.map((q,i)=>{
    const w=800,h=Math.round(w/q.aspect);
    return `<div class="surface"><article class="${i?'back':'front'}" style="width:${w}px;height:${h}px;transform:${quadMatrix(w,h,q.corners)}">${i?back:front}${i?'':`<div class="corner">${art}</div>`}</article></div>`;
  });
  const photo=(await readFile(path.join(folder,'scene.jpg'))).toString('base64');
  const page=await browser.newPage({viewport:{width:scene.w,height:scene.h}});
  try{
    await page.setContent(`<style>${fonts}*{box-sizing:border-box}body{margin:0}.ground,.surface{position:absolute;inset:0;width:100%;height:100%}.surface{mix-blend-mode:multiply;}article{transform-origin:0 0;position:absolute;inset:0 auto auto 0;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:35px;font:${d.bodyWeight} 31px/1.05 "${d.body}";letter-spacing:-.025em}.front{background:${base};color:${onBase}}.back{background:#f7f5ee;color:#21211e}.front b{font:${d.headingWeight} ${Math.min(120,Math.round(1250/Math.max(1,project.name?.length || 1)))}px/.94 "${d.heading}";letter-spacing:-.06em;max-width:84%}.back strong{font:${d.headingWeight} 51px/1 "${d.heading}"}p{margin:5px 0}.corner{position:absolute;right:32px;top:32px;width:88px;height:88px}.corner svg{width:100%}.front small{max-width:62%}${treatments[id]}</style><img class="ground" src="data:image/jpeg;base64,${photo}">${surfaces.join('')}`);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(x=>x.decode()));});
    return 'data:image/jpeg;base64,'+(await printCapture(page,{type:'jpeg',quality:91})).toString('base64');
  }finally{await page.close();}
}

