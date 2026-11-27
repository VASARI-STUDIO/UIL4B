import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProject } from '../../scripts/studio-exports/samples.mjs';
import { renderTemplate } from '../../scripts/studio-exports/document.mjs';
import { themes } from '../../scripts/studio-exports/themes.mjs';

for (const id of Object.keys(themes)) {
  test(id+' keeps sparse projects usable in both formats',()=>{
    for(const colours of [['#0A7562','#033C31','#4A9FBC','#D9E6E1'],['#818181','#888888','#909090'],['#737373']]){
      const project=sampleProject(id);
      project.design.palette={base:colours[0],colors:colours};
      delete project.design.logo;
      project.icons=[];
      delete project.profile;
      delete project.message;
      const brand=renderTemplate(project,id,'brand','a4');
      const ui=renderTemplate(project,id,'ui','deck');
      assert.match(brand.html,/aria-label="Logo placeholder"/);
      assert.doesNotMatch(brand.html,/Your logo goes here|UI L4B<\/b>/);
      assert.match(brand.html,/One sentence, 12 to 20 words/);
      assert.match(ui.html,/Icon selection/);
      for (const c of colours) assert.ok(brand.html.includes(c));
      assert.deepEqual(Object.keys(ui.files).sort(),['components.css','fonts.css','form-example.html','tailwind.css','tokens.css','tokens.json']);
      assert.doesNotThrow(()=>JSON.parse(ui.files['tokens.json']));
      assert.equal(brand.pages,11);
      assert.equal(ui.pages,11);
    }
  });
}
test('entered mission and voice survive export as text',()=>{
  const project={...sampleProject('flyleaf'), mission:'Publish <local> authors',voice:'Friendly and direct'};
  const {html}=renderTemplate(project,'flyleaf','brand','deck');
  assert.ok(html.includes('Publish &lt;local&gt; authors'));
  assert.ok(html.includes(project.voice));
  assert.ok(!html.includes('One sentence, 12 to 20 words'));
});

test('the interactive guides fit a phone and validate the example offline', async t => {
  const { chromium } = await import('@playwright/test');
  let browser;
  try { browser = await chromium.launch({channel:'chromium'}); }
  catch { return t.skip('Chromium is unavailable'); }
  try {
    const context = await browser.newContext({offline:true, viewport:{width:390,height:900}});
    const page = await context.newPage();
    for (const id of Object.keys(themes)) {
      const { html } = renderTemplate(sampleProject(id),id,'ui','deck');
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),390,id);
      const form = page.locator('.feedback-form');
      await form.locator('button').click();
      assert.equal(await form.locator('input').getAttribute('aria-invalid'),'true',id);
      await form.locator('input').fill('Example');
      await form.locator('input').press('Enter');
      assert.equal(await form.locator('output').innerText(),'Example submitted.',id);
    }
  } finally { await browser.close(); }
});

test('the studio deck covers keep distinct layouts for the same project', async t => {
  const { chromium } = await import('@playwright/test');
  let browser;
  try { browser = await chromium.launch({channel:'chromium'}); }
  catch { return t.skip('Chromium is unavailable'); }
  try {
    const page = await browser.newPage({viewport:{width:1280,height:720}});
    await page.emulateMedia({media:'print'});
    const project = sampleProject('flyleaf');
    const layouts = new Set();
    for (const id of Object.keys(themes)) {
      const {html} = renderTemplate(project,id,'brand','deck');
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      const title = page.locator('.cover h1');
      assert.equal(await title.innerText(), project.name);
      const position = await title.boundingBox();
      assert.ok(position.x >= 0 && position.x + position.width <= 1281,id);
      layouts.add([position.x,position.y,position.width].map(n=>Math.round(n/32)).join(','));
    }
    assert.equal(layouts.size, Object.keys(themes).length);
  } finally { await browser.close(); }
});

test('each layout diagram and interface keep their own structure for the same project', async () => {
  const { gridProof, interfaceProof } = await import('../../scripts/studio-exports/grid-proofs.mjs');
  const project = sampleProject('flyleaf');
  const grids = new Set();
  const interfaces = new Set();
  for (const id of Object.keys(themes)) {
    const diagram = gridProof(id,project,'<b>Mark</b>');
    grids.add([...diagram.matchAll(/grid-column:([^"]+)/g)].map(match=>match[1]).join(','));
    const screen = interfaceProof(id,project);
    assert.match(screen,/href="#try-feedback"/);
    assert.ok(screen.includes(project.action));
    interfaces.add(screen.match(/class="app-body([^"]*)"/)[1]);
  }
  assert.equal(grids.size,Object.keys(themes).length);
  assert.equal(interfaces.size,Object.keys(themes).length);
});

test('each colour proof draws with the colours listed on that page', () => {
  const project = sampleProject('set-square');
  const palette = ['#110011','#220022','#330033','#440044','#550055','#660066','#770077','#880088'];
  project.design.palette = {base:palette[0],colors:palette};
  const result = renderTemplate(project,'set-square','brand','deck');
  const plates = [...result.html.matchAll(/<div class="ink-study"><figure>(.*?)<\/figure>/gs)].map(match=>match[1]);
  assert.equal(plates.length,2);
  assert.ok(plates[0].includes(palette[0]));
  assert.ok(plates[1].includes(palette[6]));
  assert.ok(!plates[1].includes(palette[0]));
});

test('sample editions preserve all authored email paragraphs and include their brand profile', () => {
  for(const id of Object.keys(themes)){
    const project=sampleProject(id);
    const brand=renderTemplate(project,id,'brand','a4');
    const ui=renderTemplate(project,id,'ui','deck');
    assert.equal(brand.pages,11,id);
    assert.equal(ui.pages,11,id);
    assert.match(brand.html,/<section class="sheet profile"/);
    const match=ui.html.match(/<section class="sheet correspondence-sheet"[^>]*>([\s\S]*?)<\/section>/);
    assert.ok(match,id);
    const paragraphs=Array.isArray(project.message.body)?project.message.body:[project.message.greeting,project.message.body];
    for(const line of paragraphs)assert.ok(match[1].includes(line.replaceAll('&','&amp;').replaceAll("'",'&#39;')),id);
  }
});
