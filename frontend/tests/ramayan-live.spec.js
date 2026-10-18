import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const source=JSON.parse(readFileSync(new URL('../../library/editions/drafts/ramayan-study-hi.json',import.meta.url),'utf8'));
const ready=expect.configure({ timeout:30000 });

test('live Ramayan is one collection with preserved editions, old links and source-matched database text',async({ page,request })=>{
  test.skip(!process.env.RUN_LIVE_LIBRARY,'Requires local API and imported Ramayan draft.');test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(url=>url.pathname==='/api/auth/me',r=>r.fulfill({ json:{ user:{ id:'smoke',username:'reader' } } }));
  await page.route(url=>['/api/bookmarks','/api/notes'].includes(url.pathname),r=>r.fulfill({ json:{ bookmarks:[],notes:[] } }));
  await page.route(url=>url.pathname.startsWith('/api/reading-progress'),r=>r.fulfill({ json:{ progress:null } }));
  const response=await request.get('/api/scriptures?search=Ramayan&limit=100');expect(response.ok()).toBeTruthy();
  const { scriptures }=await response.json();expect(scriptures).toHaveLength(1);
  const book=scriptures[0];expect(book.title).toBe('Ramayan');expect(book.slug).toBe('ramayana');
  const edition=book.editions[0];expect(edition.source).toBe(source.source);expect(edition.expectedPassages).toBe(1189);
  expect(book.editions.map(e=>e.id)).toEqual(expect.arrayContaining(['2c386bf4-27d6-47de-bf90-53c5f1c9aaee','d3058547-a340-42d8-89a3-cc01d3870d4e','91de66ce-7456-4a69-8454-bf68fcccb79c']));
  const legacy=await request.get('/api/scriptures/7ef9d10a-ac5f-460b-8bf7-b08d1cb6469a');expect(legacy.ok()).toBeTruthy();expect((await legacy.json()).scripture.id).toBe(book.id);
  const passagesResponse=await request.get(`/api/passages/edition/${edition.id}`);expect(passagesResponse.ok()).toBeTruthy();
  const { sections }=await passagesResponse.json();expect(sections).toHaveLength(60);
  for(const [i,section] of sections.entries()) {expect(section.passages.map(p=>p.text)).toEqual(source.sections[i].passages.map(p=>p.text));expect(section.readerBlocks.length).toBeGreaterThan(0);}
  await page.setViewportSize({ width:1440,height:1000 });await page.goto(`/scripture/${book.id}`);
  await page.getByRole('button',{ name:'Start Reading',exact:true }).click();await expect(page).toHaveURL(new RegExp(edition.id));
  await ready(page.locator('.reader-ramayan')).toBeVisible();
  await expect(page.getByRole('link',{ name:'Download original PDF' })).toHaveAttribute('href',source.sourceDocument);
  await page.getByRole('button',{ name:'Contents',exact:true }).click();await page.getByRole('button',{ name:/^अयोध्या का प्रथम राजा ·/ }).click();
  await ready(page.locator('.reader-visible-page .book-page-content').first()).toBeVisible();
  await page.screenshot({ path:'test-results/ramayan-live-desktop.png',fullPage:true });
  await page.setViewportSize({ width:390,height:844 });
  await ready.poll(()=>page.locator('.reader-visible-page .book-page-content').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>n.scrollHeight<=n.clientHeight+1&&n.scrollWidth<=n.clientWidth+1))).toBe(true);
  await page.screenshot({ path:'test-results/ramayan-live-mobile.png',fullPage:true });
  const field=page.getByLabel('Page',{ exact:true });await field.fill(await field.getAttribute('max'));await field.press('Enter');
  await ready(page.getByRole('button',{ name:'Next',exact:true })).toBeDisabled();await expect(page.locator('.reader-visible-page [data-source-page="265"]')).toBeVisible();
  expect(errors).toEqual([]);
});
