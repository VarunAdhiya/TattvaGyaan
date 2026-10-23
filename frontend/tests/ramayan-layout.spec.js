import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const source=JSON.parse(readFileSync(new URL('../../library/editions/drafts/ramayan-study-hi.json',import.meta.url),'utf8'));
const layout=JSON.parse(readFileSync(new URL('../../backend/data/layouts/ramayan-study.json',import.meta.url),'utf8'));
const sections=source.sections.map(s=>({ ...s,id:s.slug,_count:{ passages:s.passages.length },readerBlocks:layout.sections[s.slug].blocks,
  passages:s.passages.map(p=>({ ...p,id:p.reference,sectionId:s.slug })) }));
const originals=new Map(sections.flatMap(s=>s.passages.map(p=>[p.id,p])));
const ready=expect.configure({ timeout:30000 });

async function setup(page) {
  const state={ errors:[],ai:[],progress:null,bookmarks:[],notes:[] };
  page.on('pageerror',error=>state.errors.push(error.message));
  await page.route(url=>url.pathname.startsWith('/api/'),async route=>{
    const path=new URL(route.request().url()).pathname;
    const body=route.request().method()==='POST'?route.request().postDataJSON():null;
    let json;
    if(path==='/api/auth/me')json={ user:{ id:'fixture',username:'reader' } };
    else if(path==='/api/scripture-editions/ramayan')json={ edition:{ ...source,id:'ramayan',contentStatus:'draft',scripture:{ title:'Ramayan',slug:'ramayana' } } };
    else if(path==='/api/passages/edition/ramayan')json={ sections };
    else if(path.startsWith('/api/reading-progress')) { if(body)state.progress=body;json={ progress:state.progress }; }
    else if(path==='/api/bookmarks'||path==='/api/notes') {
      const key=path.slice(5);if(body)state[key].push({ ...body,id:key+'-1' });
      json=body?{ [key==='notes'?'note':'bookmark']:state[key].at(-1) }:{ [key]:state[key] };
    } else if(path.startsWith('/api/ai/')) {state.ai.push(body);json={ content:'Ramayan test explanation.',conversationId:'conversation' };}
    else return route.fulfill({ status:404,json:{ error:path } });
    await route.fulfill({ json });
  });return state;
}
async function checkPages(page) {
  const content=page.locator('.reader-visible-page .book-page-content');
  await ready(content.first()).toBeVisible();
  await ready.poll(()=>content.evaluateAll(nodes=>nodes.every(n=>n.scrollHeight<=n.clientHeight+1&&n.scrollWidth<=n.clientWidth+1))).toBe(true);
  for(const leaf of await page.locator('.reader-visible-page[data-prose-content="true"]').all()) {
    const sourcePage=Number(await leaf.locator('[data-source-page]').getAttribute('data-source-page'));
    for(const part of await leaf.locator('.scripture-text').evaluateAll(nodes=>nodes.map(n=>({ id:n.dataset.passageId,start:+n.dataset.sourceStart,end:+n.dataset.sourceEnd,text:n.textContent })))) {
      expect(part.text).toBe(originals.get(part.id).text.slice(part.start,part.end));
      expect(originals.get(part.id).sourcePage).toBe(sourcePage);
    }
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
}
async function chapter(page,title) {
  const section=sections.find(s=>s.title===title);
  await page.getByRole('button',{ name:'Contents',exact:true }).click();
  await page.getByRole('button',{ name:new RegExp('^'+title) }).click();
  await ready(page.locator(`.reader-visible-page [data-passage-id="${section.passages[0].id}"]`)).toBeVisible();
  await checkPages(page);
}

test('Ramayan has fresh topics, source-page labels, readable comparisons and responsive controls',async({ page })=>{
  test.setTimeout(150000);const state=await setup(page);
  await page.setViewportSize({ width:1440,height:1000 });
  await page.goto('/reader/ramayana/ramayan?passage=pdf-49.1');
  await checkPages(page);await expect(page.locator('.reader-ramayan')).toBeVisible();
  await expect(page.locator('.reader-visible-page .book-block-topic').filter({ hasText:'वाल्मीकि रामायण के अनुसार' })).toBeVisible();
  await page.screenshot({ path:'test-results/ramayan-desktop.png',fullPage:true });
  for(const title of ['सीता का जन्म','रावण वध','राम और सीता का पुनर्मिलन'])await chapter(page,title);
  for(const width of [900,390,320]) {
    await page.setViewportSize({ width,height:844 });await chapter(page,'अयोध्या का प्रथम राजा');
    const nav=await page.getByRole('navigation',{ name:'Page navigation' }).boundingBox();
    expect(nav.width).toBeLessThan(Math.min(width,400));
  }
  await page.setViewportSize({ width:390,height:844 });
  await page.getByRole('button',{ name:'Increase font size' }).click();await checkPages(page);
  for(const theme of ['dark','sepia','light']) { await page.getByLabel('Reading theme').selectOption(theme);await checkPages(page); }
  await page.screenshot({ path:'test-results/ramayan-mobile.png',fullPage:true });
  await page.goto('/reader/ramayana/ramayan?passage=pdf-18.1');await checkPages(page);
  await expect(page.locator('.reader-visible-page .book-block-contents-entry').first()).toBeVisible();
  await page.screenshot({ path:'test-results/ramayan-contents.png',fullPage:true });
  const field=page.getByLabel('Page',{ exact:true });await field.fill(await field.getAttribute('max'));await field.press('Enter');
  await ready(page.getByRole('button',{ name:'Next',exact:true })).toBeDisabled();await checkPages(page);
  expect(state.errors).toEqual([]);
});

test('Ramayan keeps selected text, annotations, summaries and saved positions attached to source passages',async({ page })=>{
  test.setTimeout(120000);const state=await setup(page);
  await page.setViewportSize({ width:390,height:844 });await page.goto('/reader/ramayana/ramayan?passage=pdf-49.3');await checkPages(page);
  const passage=page.locator('.reader-visible-page [data-passage-id="pdf-49.3"]').first();
  const selectedText=(await passage.textContent()).slice(0,22).trim();
  await passage.evaluate(node=>{const range=document.createRange();range.setStart(node.firstChild,0);range.setEnd(node.firstChild,22);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);node.dispatchEvent(new MouseEvent('mouseup',{ bubbles:true }));});
  await page.getByRole('button',{ name:'Ask AI about selected text' }).click();
  await expect(page.getByText('Ramayan test explanation.')).toBeVisible();expect(state.ai.at(-1)).toMatchObject({ passageId:'pdf-49.3',selectedText });
  await page.goto('/reader/ramayana/ramayan');await chapter(page,'सीता का जन्म');
  await page.getByRole('button',{ name:'Summarize Section',exact:true }).click();await expect(page.getByText('Ramayan test explanation.')).toBeVisible();
  expect(state.ai.at(-1)).toMatchObject({ editionId:'ramayan',sectionId:sections.find(s=>s.title==='सीता का जन्म').id });
  await page.reload();await chapter(page,'सीता का जन्म');await page.getByRole('button',{ name:'Passage tools',exact:true }).click();
  await page.screenshot({ path: 'test-results/passage-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/passage-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button',{ name:'Bookmark verse' }).click();await page.getByRole('button',{ name:'Add or edit note' }).click();
  await page.getByLabel('Note text').fill('Ramayan reading note');await page.getByRole('button',{ name:'Save note' }).click();await page.keyboard.press('Escape');
  expect(state.notes[0].passageId).toBe(state.bookmarks[0].passageId);
  await ready.poll(()=>state.progress?.passageId).toBeTruthy();const saved=state.progress.passageId;
  await page.setViewportSize({ width:1440,height:1000 });await checkPages(page);await page.reload();
  await ready(page.locator(`.reader-visible-page [data-passage-id="${saved}"]`).first()).toBeVisible();expect(state.errors).toEqual([]);
});
