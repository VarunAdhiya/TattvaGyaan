import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const plan = JSON.parse(readFileSync(new URL('../../library/devotionals/artwork-plan.json', import.meta.url), 'utf8'));
const entries = {};
for (const entry of plan.entries) {
  const file = new URL(`../public/devotional-artwork/${entry.slug}.png`, import.meta.url);
  if (!existsSync(file)) continue;
  const bytes = readFileSync(file);
  if (bytes.subarray(1, 4).toString() !== 'PNG') throw new Error(`Invalid image: ${entry.slug}`);
  entries[entry.slug] = {
    src: `/devotional-artwork/${entry.slug}.png`,
    alt: `Devotional illustration for ${entry.title}`,
    kind: 'generated-illustration',
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/devotional-artwork.json', import.meta.url), JSON.stringify(entries, null, 2) + '\n');
console.log(`Indexed ${Object.keys(entries).length}/${plan.entries.length} unique devotional illustrations.`);
