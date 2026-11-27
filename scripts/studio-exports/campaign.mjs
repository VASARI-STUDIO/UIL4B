import { printCapture } from './print-capture.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { esc } from './specimens.mjs';
import { readDesign } from '../../src/utils/styleGuideExport.js';
import { fontFace, ink } from './document.mjs';

const arrangements={
  flyleaf:'header{align-items:center}.proofs{padding-inline:62px;gap:26px}',
  'set-square':'main{grid-template-rows:190px 900px 1fr}header{border-left:30px solid currentColor;margin-left:30px}header h1{font-size:92px}.proofs{gap:3px}',
  dispatch:'main{grid-template-rows:920px 166px 1fr}.still{grid-row:1}header{grid-row:2}h1{font-size:108px}.proofs{padding-top:0}',
  doorlist:'header{border-bottom:4px dashed}h1{font-size:95px}.proofs{border-top:4px dashed}',
  'market-day':'header{border-block:5px double;margin-inline:30px;padding-inline:0;align-items:center}.proofs{gap:12px}',
  'contact-sheet':'main{grid-template-rows:150px 930px 1fr}.still{padding:0 38px 0}.proofs{padding-inline:38px}header{align-items:center}',
  workbench:'main{grid-template-rows:900px 182px 1fr}.still{grid-row:1}header{grid-row:2;border-bottom:8px solid;margin-inline:32px;padding-inline:0}h1{font-size:105px}',
  soundings:'main{grid-template-rows:134px 960px 1fr}header{border-top:16px solid;padding-block:12px}.proofs{border-top:5px solid}',
  hearth:'main{grid-template-rows:162px 900px 1fr}.still{padding-inline:36px;border-radius:180px 180px 0 0}header{align-items:center}.proofs{padding-inline:36px}',
  offprint:'main{grid-template-rows:940px 136px 1fr}.still{grid-row:1}header{grid-row:2;border-bottom:6px double;margin-inline:32px;padding-inline:0}.proofs{padding-top:12px}',
};

export async function campaignImage(browser,root,edition,project){
  const dir=path.join(root,edition.id),design=readDesign(project.design);
  const base=design.base || design.palette[0],fg=ink(base,design.palette);
  const file=async name=>'data:image/jpeg;base64,'+(await readFile(path.join(dir,name))).toString('base64');
  const [photo,brand,ui]=await Promise.all(['in-print.jpg','brand/detail.jpg','ui/interface.jpg'].map(file));
  const page=await browser.newPage({viewport:{width:1200,height:1500}});
  try{
    await page.setContent(`<html lang="en-AU"><style>${fontFace(design.heading,design.headingWeight)}*{box-sizing:border-box}body{margin:0;background:${base};color:${fg};font:20px/1.2 Arial,sans-serif}main{height:1500px;display:grid;grid-template-rows:138px 944px 1fr}header{display:flex;justify-content:space-between;align-items:end;padding:22px 42px}h1{font:${design.headingWeight} 82px/.95 "${design.heading}";letter-spacing:-.055em;margin:0}header span{text-align:right;line-height:1.4}figure{margin:0;min-width:0}.still{width:100%;height:100%;object-fit:cover}.proofs{padding:24px 32px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-content:center}.proofs img{width:100%;display:block;border:1px solid #7775}figcaption{padding-top:9px;font-size:18px}${arrangements[edition.id]}</style><main><header><h1>${esc(edition.name)}</h1><span>UI L4B<br>Studio editions</span></header><img class="still" src="${photo}"><div class="proofs"><figure><img src="${brand}"><figcaption>Brand guidelines</figcaption></figure><figure><img src="${ui}"><figcaption>UI style guide</figcaption></figure></div></main></html>`);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.decode()));});
    await printCapture(page,{path:path.join(dir,'edition.jpg'),type:'jpeg',quality:94});
  }finally{await page.close();}
}

