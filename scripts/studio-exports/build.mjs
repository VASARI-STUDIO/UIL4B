import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { zipFiles } from '../../api/_lib/exportThemes/engine/files.js';
import { sampleProject } from './samples.mjs';
import { renderTemplate, esc } from './document.mjs';
import { themes, plannedThemes } from './themes.mjs';

const {values}=parseArgs({options:{out:{type:'string'},theme:{type:'string'},project:{type:'string'}}});
if (!values.out) throw new Error('Pass --out followed by the output directory.');
if (values.theme && !Object.hasOwn(themes,values.theme)) throw new Error('Unknown theme '+values.theme);
const root=path.resolve(values.out);
const project=values.project && JSON.parse(await readFile(values.project,'utf8'));
const selected=values.theme?[values.theme]:Object.keys(themes);
const titles={brand:'Brand guidelines',ui:'UI style guide'};
const browser=await chromium.launch({channel:'chromium'});
const cards=[];
const run=promisify(execFile);
const scratch=await mkdtemp(path.join(tmpdir(),'uil4b-exports-'));
try {
  for (const id of selected) {
    const data=project || sampleProject(id), theme=themes[id];
    for (const [product,title] of Object.entries(titles)) {
      const dir=path.join(root,id,product);
      await mkdir(dir,{recursive:true});
      const files={};
      let detailPage;
      const detailLabel=product==='brand'?'Brand application':'Form feedback';
      for (const layout of ['deck','a4']) {
        const {html,files:code,license}=renderTemplate(data,id,product,layout);
        Object.assign(files,code,{'LICENSES.txt':license});
        files[layout+'.html']=html;
        const htmlPath=path.join(dir,layout+'.html');
        await writeFile(htmlPath,html);
        const width=layout==='deck'?1280:794,height=layout==='deck'?720:1123;
        const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,colorScheme:'light'});
        try {
          await page.goto(pathToFileURL(htmlPath).href);
          await page.emulateMedia({media:'print'});
          await page.evaluate(()=>document.fonts.ready);
          const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
          // Chromium timestamps vary between identical renders. Preserve xref offsets.
          files[layout+'.pdf']=Buffer.from(pdf.toString('latin1').replace(/\/(?:CreationDate|ModDate)\s*\(D:\d{14}[^)]*\)/g,m=>m.replace(/\d{14}/,'20000101000000')),'latin1');
          await writeFile(path.join(dir,layout+'.pdf'),files[layout+'.pdf']);
          // Rasterise the final PDF so the previews and page images match the print composition.
          const pdfPath=path.join(dir,layout+'.pdf');
          await run('pdftoppm',['-r','192','-png',pdfPath,path.join(scratch,'page')]);
          const sheets=page.locator('main>.sheet');
          for(let i=0;i<await sheets.count();i++) {
            const sheet=sheets.nth(i), section=(await sheet.getAttribute('class')).split(' ')[1];
            const file='images/'+layout+'/'+String(i+1).padStart(2,'0')+'-'+section+'.png';
            const number=String(i+1).padStart(String(await sheets.count()).length,'0');
            files[file]=await readFile(path.join(scratch,'page-'+number+'.png'));
          }
          if(layout==='deck'){
            const detail=page.locator('main>.sheet.'+(product==='brand'?'application':'feedback'));
            detailPage=Number((await detail.getAttribute('id')).slice(5));
            for(const [label,number] of [['cover',1],['detail',detailPage]]){
              await run('pdftoppm',['-f',String(number),'-l',String(number),'-singlefile','-r','96','-jpeg',pdfPath,path.join(dir,label)]);
            }
          }
        } finally {await page.close();}
      }
      const stem=id+'-'+(product==='brand'?'brand-guidelines':'ui-style-guide');
      await writeFile(path.join(dir,stem+'.zip'),await zipFiles(files,stem));
      const prefix=id+'/'+product+'/';
      cards.push(`<article><a href="${prefix}deck.html"><img src="${prefix}cover.jpg" alt="${esc(data.name)} ${title.toLowerCase()}, ${theme.name} cover"></a><h3>${title}</h3><a class="detail" href="${prefix}deck.html#page-${detailPage}"><img loading="lazy" src="${prefix}detail.jpg" alt=""><span>${detailLabel} ↗</span></a><p><a href="${prefix}a4.html">A4 HTML</a> · <a href="${prefix}deck.html">Deck HTML</a></p><p><a href="${prefix}a4.pdf">A4 PDF</a> · <a href="${prefix}deck.pdf">Deck PDF</a></p><a class="download" href="${prefix}${stem}.zip" download>Download ZIP</a></article>`);
      console.log(theme.name+' / '+title+' complete');
    }
  }
} finally {await browser.close();await rm(scratch,{recursive:true,force:true});}
const sections=selected.map((id,i)=>`<section id="${id}"><h2>${themes[id].name}</h2><p>${themes[id].discipline} · ${esc((project || sampleProject(id)).name)}</p><div class="pair">${cards.slice(i*2,i*2+2).join('')}</div></section>`);
await writeFile(path.join(root,'index.html'),`<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UIL4B export templates</title><style>nav{display:flex;flex-wrap:wrap;gap:6px 20px;border-block:1px solid #aaa;padding:12px 0}a.detail{display:flex;gap:12px;align-items:center;margin:6px 0 14px}a.detail img{width:115px}.pair article>p{font-size:15px}section{scroll-margin-top:16px}*{box-sizing:border-box}body{margin:0;background:#f8f7f3;color:#242322;font:17px/1.5 system-ui,sans-serif}main{max-width:1140px;margin:auto;padding:48px 5vw}h1,h2,h3,p{margin:0}h1,h2{font:normal clamp(44px,7vw,88px)/1 Georgia,serif;letter-spacing:-.055em}h2{font-size:clamp(36px,5vw,62px)}h1+p{max-width:62ch;margin:18px 0}section{margin:50px 0;border-top:1px solid;padding-top:22px}section>p{margin:8px 0 18px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:28px}img{display:block;width:100%;height:auto;border:1px solid #c6c2b9}h3{margin:14px 0 5px}a{color:inherit;text-underline-offset:3px}.download{display:inline-block;background:#242322;color:white;padding:9px 15px;margin-top:10px}footer{border-top:1px solid;padding-top:18px}@media(max-width:640px){.pair{grid-template-columns:1fr}}</style><main><h1>Export templates</h1><p>Choose a theme and open a guide. Each ZIP contains both layouts as HTML, PDF and individual PNG pages. The UI style guide also includes the fonts and implementation files.</p><nav aria-label="Themes">${selected.map(id=>`<a href="#${id}">${themes[id].name}</a>`).join('')}</nav>${sections.join('')}<footer><b>Planned themes</b><p>${plannedThemes.join(' · ')}</p></footer></main></html>`);
