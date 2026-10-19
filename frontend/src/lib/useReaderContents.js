import { useLayoutEffect, useMemo, useState } from 'react';

// Measure the same rows used on paper so wrapped Hindi titles also fit.
export default function useReaderContents(sections, sourcePages, rootRef, layout) {
  const entries = useMemo(() => sections.flatMap(section => [{
    ...section, pageIndex: sourcePages.findIndex(page => page.sectionId === section.id || page.sectionIds?.includes(section.id)),
  }, ...(section.readerBlocks || []).filter(block => block.kind === 'chapter').map(block => ({
    id: section.id + '-' + block.chapterKey, title: block.title,
    pageIndex: sourcePages.findIndex(page => page.sectionId === section.id && page.chapterKey === block.chapterKey),
    passageId: section.passages?.find(passage => passage.reference === block.parts[0]?.reference)?.id,
  }))]), [sections, sourcePages]);
  const [groups, setGroups] = useState(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    let frame;
    const calculate = () => {
      const paper = root.querySelector('.reader-visible-page');
      if (!paper) return;
      const style = getComputedStyle(paper);
      const width = paper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = paper.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const measure = document.createElement('div');
      measure.className = 'reader-contents-measure';
      measure.setAttribute('aria-hidden', 'true');
      measure.inert = true;
      measure.style.width = `${width}px`;
      const heading = document.createElement('h2');
      heading.className = 'reader-contents-title';
      heading.textContent = 'Table of Contents';
      measure.append(heading);
      root.append(measure);
      // Reserve the heading, continuation label, folio, and page-corner controls.
      const available = Math.max(100, height - heading.getBoundingClientRect().height - 90);
      const next = [[]];
      let used = 0;
      entries.forEach((entry, index) => {
        const row = document.createElement('button');
        row.className = 'reader-contents-row';
        const title = document.createElement('span');
        title.textContent = entry.title;
        const number = document.createElement('span');
        number.textContent = '00000';
        row.append(title, number);
        measure.append(row);
        const rowHeight = row.getBoundingClientRect().height;
        if (used + rowHeight > available && next.at(-1).length) { next.push([]); used = 0; }
        next.at(-1).push(index);
        used += rowHeight;
        row.remove();
      });
      measure.remove();
      setGroups(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(calculate); };
    calculate();
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    window.addEventListener('resize', schedule);
    document.fonts.addEventListener('loadingdone', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      document.fonts.removeEventListener('loadingdone', schedule);
    };
  }, [entries, rootRef, layout]);

  return useMemo(() => {
    const chunks = groups || [entries.map((_, index) => index)];
    const contents = entries.map(entry => ({ ...entry, pageIndex: entry.pageIndex < 0 ? -1 : entry.pageIndex + chunks.length - 1 }));
    const leaves = chunks.map((indices, index) => ({ type: 'toc', contents: indices.map(i => contents[i]).filter(Boolean), contentsPage: index + 1, contentsTotal: chunks.length }));
    return { contents, contentsReady: groups !== null, pages: [sourcePages[0], ...leaves, ...sourcePages.slice(2)] };
  }, [entries, groups, sourcePages]);
}
