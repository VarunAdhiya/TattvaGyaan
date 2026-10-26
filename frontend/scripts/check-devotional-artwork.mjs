import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const catalog = JSON.parse(readFileSync(new URL('../../library/devotionals/hinduaarti-2026.json', import.meta.url), 'utf8')).texts;
const artwork = JSON.parse(readFileSync(new URL('../src/data/devotional-artwork.json', import.meta.url), 'utf8'));
const hashes = new Set();
assert.equal(Object.keys(artwork).length, catalog.length, 'Every catalog entry needs one image');
for (const text of catalog) {
  const item = artwork[text.slug];
  assert.ok(item, `Missing artwork: ${text.slug}`);
  assert.equal(item.src, `/devotional-artwork/${text.slug}.png`);
  assert.equal(item.kind, 'generated-illustration');
  const bytes = readFileSync(new URL(`../public${item.src}`, import.meta.url));
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash, item.sha256, `Changed asset: ${text.slug}`);
  assert.ok(!hashes.has(hash), `Repeated image: ${text.slug}`);
  hashes.add(hash);
  assert.equal(bytes.readUInt32BE(16), item.width);
  assert.equal(bytes.readUInt32BE(20), item.height);
  assert.ok(item.width >= 1024 && item.height >= 768, `Undersized artwork: ${text.slug}`);
  assert.ok(Math.abs(item.width / item.height - 1.5) < .01, `Unexpected framing: ${text.slug}`);
}

console.log(`Verified ${catalog.length} distinct, full-resolution devotional illustrations.`);
