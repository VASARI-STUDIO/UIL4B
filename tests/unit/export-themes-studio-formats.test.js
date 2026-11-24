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
      const brand=renderTemplate(project,id,'brand','a4');
      const ui=renderTemplate(project,id,'ui','deck');
      assert.match(brand.html,/Your logo goes here/);
      assert.match(brand.html,/One sentence, 12 to 20 words/);
      assert.match(ui.html,/Icon selection/);
      for (const c of colours) assert.ok(brand.html.includes(c));
      assert.deepEqual(Object.keys(ui.files).sort(),['components.css','fonts.css','form-example.html','tailwind.css','tokens.css','tokens.json']);
      assert.doesNotThrow(()=>JSON.parse(ui.files['tokens.json']));
      assert.equal(brand.pages,7);
      assert.equal(ui.pages,8);
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

test('the five interactive guides fit a phone and validate the example offline', async t => {
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
