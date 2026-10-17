export const MAHABHARATA_SOURCE = 'urn:sha256:eb00713009dd7b6a81feec459c7518a494f851dc79d77e5d67856e4d8d70d809';

export function isMahabharataProse(edition) {
  return edition.language === 'hi' && edition.source === MAHABHARATA_SOURCE;
}

const treeReferences = ['3.15', '3.16', '3.17', '3.18', '3.19', '3.20', '3.21', '3.24', '3.25', '3.26', '3.27'];

// Coordinates and reading order checked against the original PDF, page 6.
// Each label still points to the imported passage, including both halves of 3.16.
export function familyTreeNodes(passages) {
  const byReference = new Map(passages.map(passage => [passage.reference, passage]));
  const node = (reference, x, y, half) => {
    const passage = byReference.get(reference);
    const newline = passage.text.indexOf('\n') + 1;
    return { passage, x, y, start: half === 1 ? newline : 0,
      end: half === 0 ? newline : passage.text.length };
  };
  return [node('3.15', 40, 7), node('3.16', 12, 28, 0), node('3.16', 62, 28, 1),
    node('3.17', 12, 41), node('3.18', 36, 48), node('3.24', 80, 48),
    node('3.19', 51, 68), node('3.25', 87, 68), node('3.20', 51, 80),
    node('3.26', 87, 80), node('3.21', 51, 92), node('3.27', 87, 92)];
}

export function readingBlocks(section) {
  const passages = section.passages || [];
  const tree = section.slug === 'chapter-3' && treeReferences.every(ref => passages.some(p => p.reference === ref));
  const blocks = [];
  let previous;
  for (const passage of passages) {
    if (tree && treeReferences.includes(passage.reference)) continue;
    const part = { passage, start: 0, end: passage.text.length };
    const last = blocks.at(-1);
    // Join only unfinished prose at a documented source page/column boundary.
    // Dialogue, complete sentences and question/answer blocks remain separate.
    const continuation = previous && previous.sourceNotes !== passage.sourceNotes &&
      !/[।॥.!?…:：”"’')\-–—]\s*$/u.test(previous.text);
    if (continuation && last?.kind === 'paragraph') last.parts.push(part);
    else blocks.push({ kind: 'paragraph', parts: [part] });
    previous = passage;
  }
  if (tree) blocks.push({ kind: 'tree', parts: treeReferences.map(ref => {
    const passage = passages.find(p => p.reference === ref);
    return { passage, start: 0, end: passage.text.length };
  }) });
  return blocks;
}

export function partText(parts) {
  return parts.map((part, index) => {
    const previous = parts[index - 1];
    const separator = previous && previous.passage.id !== part.passage.id &&
      !previous.passage.text.slice(previous.start, previous.end).trimEnd().endsWith('-') ? ' ' : '';
    return separator + part.passage.text.slice(part.start, part.end);
  }).join('');
}

function words(parts) {
  return parts.flatMap(part => [...part.passage.text.slice(part.start, part.end).matchAll(/\s*\S+\s*/gu)]
    .map(match => ({ passage: part.passage, start: part.start + match.index, end: part.start + match.index + match[0].length })));
}

function compact(parts) {
  const result = [];
  for (const part of parts) {
    const last = result.at(-1);
    if (last?.passage.id === part.passage.id && last.end === part.start) last.end = part.end;
    else result.push({ ...part });
  }
  return result;
}

// Measurement is supplied by the browser using the same font, width and CSS as
// the visible pages. Splits retain source offsets, never rewrite scripture text.
export function paginateMahabharata(sections, { height, lineHeight, gap, treeHeight }, measure) {
  const heightOf = (parts, continued) => {
    const compacted = compact(parts);
    return measure(partText(compacted), continued, compacted);
  };
  const pages = [{ type: 'cover' }, { type: 'toc' }];
  let blocks = [];
  let used = 0;
  let pageSection;
  const flush = () => {
    if (!blocks.length) return;
    const passages = [...new Map(blocks.flatMap(block => block.parts.map(part => [part.passage.id, part.passage]))).values()];
    pages.push({ type: 'content', sectionId: pageSection.id, sectionTitle: pageSection.title,
      sectionIds: [...new Set(blocks.map(block => block.sectionId))], blocks, passages });
    blocks = [];
    used = 0;
  };
  for (const section of sections) {
    // Continue the next chapter on the same leaf, reserving its heading and
    // at least two lines of prose so that a heading never sits alone.
    if (blocks.length && height - used < lineHeight * 3.5 + gap * 2) flush();
    if (blocks.length) {
      blocks.push({ kind: 'heading', sectionId: section.id, title: section.title, parts: [] });
      used += lineHeight * 1.5 + gap;
    } else pageSection = section;
    for (const block of readingBlocks(section)) {
      if (block.kind === 'tree') {
        if (blocks.length && used + gap + treeHeight > height) flush();
        if (!blocks.length) pageSection = section;
        blocks.push({ ...block, sectionId: section.id });
        used += treeHeight + gap;
        continue;
      }
      let remaining = words(block.parts);
      let continued = false;
      while (remaining.length) {
        if (!blocks.length) pageSection = section;
        const available = height - used - (blocks.length ? gap : 0);
        const fullHeight = heightOf(remaining, continued);
        if (fullHeight <= available) {
          blocks.push({ kind: 'paragraph', sectionId: section.id, parts: compact(remaining), continued });
          used += fullHeight + (blocks.length > 1 ? gap : 0);
          break;
        }
        // Avoid leaving a lone line at the foot or head of a page.
        if (blocks.length && available < lineHeight * 2) { flush(); continue; }
        let low = 0;
        let high = remaining.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          if (heightOf(remaining.slice(0, mid), continued) <= available) low = mid;
          else high = mid - 1;
        }
        if (!low && blocks.length) { flush(); continue; }
        low = Math.max(1, low);
        if (heightOf(remaining.slice(low), true) < lineHeight * 2) {
          let lower = 1;
          let upper = low;
          while (lower < upper) {
            const mid = Math.ceil((lower + upper) / 2);
            if (heightOf(remaining.slice(0, mid), continued) <= available - lineHeight) lower = mid;
            else upper = mid - 1;
          }
          low = lower;
        }
        blocks.push({ kind: 'paragraph', sectionId: section.id, parts: compact(remaining.slice(0, low)), continued });
        remaining = remaining.slice(low);
        continued = true;
        flush();
      }
    }
  }
  flush();
  return pages;
}

export function pageForPassage(pages, id, offset = 0) {
  return pages.findIndex(page => page.blocks?.some(block => block.parts.some(part =>
    part.passage.id === id && part.start <= offset && part.end > offset)));
}
