import { printCapture } from './print-capture.mjs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {quadMatrix} from '../../api/_lib/exportThemes/engine/mockup.js';

// Some scenes have two open pages or a group of three hanging sheets.
export const settings = {
  flyleaf: ['book-standing',['cover']],
  'set-square':['notebook-site',['cover','composition']],
  dispatch:['kerb-shelter-morning',['cover']],
  doorlist:['poster-venue-night-2',['cover']],
  'market-day':['counter-wall-poster',['cover']],
  'contact-sheet':['sheets-gallery-wall',['cover','colour','specimen']],
  workbench:['bench-press-tray',['cover']],
  soundings:['kerb-wharf-board',['cover']],
  hearth:['brochure-stack',['cover']],
  offprint:['print-studio-wall',['cover']],
};

export async function photographPrint(browser,scenes,root,id,plates) {
  const [sceneId,subjects]=settings[id];
  const folder=path.join(scenes,sceneId);
  const scene=JSON.parse(await readFile(path.join(folder,'scene.json'),'utf8'));
  const photo='data:image/jpeg;base64,'+(await readFile(path.join(folder,'scene.jpg'))).toString('base64');
  const faces=subjects.map((subject,i)=>{
    const q=scene.quads[i],w=794,h=Math.round(794/q.aspect);
    const art='data:image/png;base64,'+plates[subject].toString('base64');
    return `<div class="surface"><img src="${art}" style="object-fit:contain;background:#f6f4ef;width:${w}px;height:${h}px;transform:${quadMatrix(w,h,q.corners)}"></div>`;
  });
  // Keep the paper grain and the light already falling on the photographed surface.
  const page=await browser.newPage({viewport:{width:scene.w,height:scene.h},deviceScaleFactor:1});
  try{
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0}.ground,.surface{position:absolute;inset:0;width:100%;height:100%}.surface{mix-blend-mode:multiply}.surface img{position:absolute;top:0;left:0;transform-origin:0 0}</style><img class="ground" src="${photo}">${faces.join('')}`);
    await page.evaluate(()=>Promise.all([...document.images].map(x=>x.decode())));
    const corners=scene.quads.flatMap(q=>q.corners);
    const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
    const cx=(Math.max(...xs)+Math.min(...xs))/2, cy=(Math.max(...ys)+Math.min(...ys))/2;
    const width=Math.min(scene.w,Math.max(scene.h*1.15,(Math.max(...xs)-Math.min(...xs))*1.18));
    const x=Math.max(0,Math.min(scene.w-width,cx-width/2));
    const height=Math.min(scene.h,width*.84),y=Math.max(0,Math.min(scene.h-height,cy-height/2));
    await printCapture(page,{path:path.join(root,id,'in-print.jpg'),type:'jpeg',quality:95,clip:{x,y,width,height}});
  }finally{await page.close();}
}

