import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { loadScene, quadMatrix } from '../../api/_lib/exportThemes/engine/mockup.js';
import { readDesign } from '../../src/utils/styleGuideExport.js';
import { esc } from './specimens.mjs';
import { fontFace, ink } from './document.mjs';

import { editions } from './editions.mjs';

const scenes = {
  ...Object.fromEntries(Object.entries(editions).map(([id,e])=>[id,e.scenes])),
  flyleaf: ['bench-book-hands','room-hall-laptop'],
  'set-square': ['hoarding-site','bench-laptop-shoulder'],
  dispatch: ['billboard-underpass','kerb-crossing-phone'],
  doorlist: ['late-door-poster','late-door-scan'],
  'market-day': ['counter-jar-market','counter-tablet-till'],
};

export async function findScenes(configured) {
  if(configured) return path.resolve(configured);
  let dir=process.cwd();
  while(true){
    const candidate=path.join(dir,'export-systems','engine','scenes');
    try {await access(path.join(candidate,'index.json'));return candidate;} catch { /* Look in the parent workspace. */ }
    const up=path.dirname(dir);
    if(up===dir) throw new Error('Pass --scenes with the UIL4B export-systems/engine/scenes directory.');
    dir=up;
  }
}

function physicalFace(id,p,lead) {
  const name=esc(p.name), title=esc(lead.title || p.headline || p.name);
  const detail=esc(lead.detail || p.headline), price=esc(lead.price);
  if(id==='contact-sheet')return `<small>${name}</small><strong>${title}</strong><p>${detail}</p>`;
  if(id==='workbench')return `<b>${name}</b><strong>${title}</strong><p>${detail}</p><b>${price}</b>`;
  if(id==='soundings')return `<b>${name}</b><strong>${title}</strong><p>${detail}</p>`;
  if(id==='hearth')return `<small>${name}</small><strong>${esc(p.headline || p.name)}</strong><p>${title}</p>`;
  if(id==='offprint')return `<b>${name}</b><strong>${esc(p.headline || p.name)}</strong>`;
  if(id==='flyleaf')return `<small>${name}</small><strong>${title}</strong><div class="ellipses" aria-hidden="true"></div><p>${detail}</p>`;
  if(id==='set-square')return `<b>${name}</b><strong>${esc(p.headline || p.name)}</strong><p>${title}</p>`;
  if(id==='dispatch')return `<strong>${esc(p.headline || p.name)}</strong><b>${name}</b>`;
  if(id==='doorlist')return `<small>${name}</small><strong>${title}</strong><div class="ticket-line">${detail}<br>${price}</div>`;
  return `<strong>${name}</strong><p>${esc(p.headline || lead.title)}</p>`;
}

function digitalFace(p, portrait) {
  const rows=(p.items||[]).slice(0,3).map(v=>`<li><b>${esc(v.title)}</b><span>${esc(v.price)}</span></li>`).join('');
  return `<small>${esc(p.name)}</small><strong>${esc(p.screenTitle || p.name)}</strong>${portrait?`<div class="screen-feature"><b>${esc(p.items?.[0]?.title || p.headline || p.name)}</b><p>${esc(p.items?.[0]?.detail || p.screenDetail)}</p></div>`:''}<ul>${rows}</ul><b class="action">${esc(p.action || 'Save changes')}</b>`;
}

// Photograph the project's artwork on the calibrated surface. Only the flattened photograph goes into the download.
export async function makePhotographs(browser,root,id,p) {
  const d=readDesign(p.design), accent=d.base || d.palette[0], fg=ink(accent,d.palette);
  const font=[...new Set([fontFace(d.heading,d.headingWeight),fontFace(d.body,d.bodyWeight)])].join('');
  const parts={};
  for(const [i,sceneId] of scenes[id].entries()){
    const s=loadScene(sceneId), q=s.quads[0], width=800,height=Math.round(width/q.aspect);
    const raw=await readFile(path.join(root,sceneId,'scene.jpg'));
    const page=await browser.newPage({viewport:{width:s.w,height:s.h},deviceScaleFactor:1});
    try{
      const content=i?digitalFace(p,q.aspect<.8):physicalFace(id,p,p.items?.[0] || {});
      const css=`${font}*{box-sizing:border-box}body{margin:0;overflow:hidden;background:#fff}img{position:absolute;width:100%;height:100%}article{position:absolute;left:0;top:0;transform-origin:0 0;transform:${quadMatrix(width,height,q.corners)};width:${width}px;height:${height}px;background:${accent};color:${fg};padding:5%;padding:42px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;font:${d.bodyWeight} 28px/1.14 "${d.body}";mix-blend-mode:multiply}strong,b{font-family:"${d.heading}";font-weight:${d.headingWeight}}strong{font-size:90px;line-height:.96;letter-spacing:-.045em}p,ul{margin:0}small{font-size:31px}article.flyleaf strong{font-size:142px;max-width:8ch}.ellipses{height:30%;border:7px double;border-radius:50%;transform:rotate(-19deg)}article.set-square{border:16px solid currentColor;padding:17px 30px}article.set-square strong{font-size:64px}article.dispatch strong{font-size:86px}article.doorlist{padding:45px 28px}article.doorlist strong{font-size:130px;overflow-wrap:anywhere}.ticket-line{border-top:5px dashed;padding:23px 0;font-size:39px}.market-day strong{font-size:107px}.market-day p{font-size:42px}article.contact-sheet,article.hearth{padding:55px}article.workbench b:last-child{border-top:5px solid;padding-top:14px}article.soundings{border-block:20px solid}article.offprint strong{font-size:81px}article.electronic{background:white;color:#181818;mix-blend-mode:normal;gap:20px;justify-content:flex-start;padding:32px}article.electronic strong{font-size:62px}.electronic ul{list-style:none;padding:0}.electronic li{display:flex;justify-content:space-between;border-top:2px solid #bbb;gap:16px;padding:14px 0;font-size:26px}.action{align-self:flex-start;padding:13px 22px;background:${accent};color:${fg}}.screen-feature{padding:36px 25px;background:${accent};color:${fg};min-height:28%;display:grid;align-content:space-evenly}.screen-feature b{font-size:76px;line-height:1}.screen-feature p{font-size:39px}.electronic.portrait{justify-content:space-between;padding:42px;gap:32px}.portrait small{font-size:42px}.electronic.portrait strong{font-size:95px}.portrait li{font-size:39px;padding:28px 0}.portrait .action{align-self:stretch;font-size:44px;text-align:center;padding:25px 12px}`;
      await page.setContent(`<style>${css}</style><img src="data:image/jpeg;base64,${raw.toString('base64')}"><article class="${i?(q.aspect<.8?'electronic portrait':'electronic'):id}">${content}</article>`);
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
      const jpg=await page.screenshot({type:'jpeg',quality:87});
      parts[i?'digital':'physical']='data:image/jpeg;base64,'+jpg.toString('base64');
    }finally{await page.close();}
  }
  return parts;
}
