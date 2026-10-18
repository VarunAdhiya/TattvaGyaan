import { useLayoutEffect, useState } from 'react';
import { paginateMahabharata } from './mahabharataLayout';
import { bookTextRuns } from './bookTextRuns';

export default function useMahabharataLayout(enabled, sections, fontSize, rootRef) {
  const [layout, setLayout] = useState(null);
  useLayoutEffect(() => {
    if (!enabled || !sections.every(section => Array.isArray(section.passages))) return;
    let active = true;
    let frame;
    let lastSize = '';
    const measurementPage = document.createElement('div');
    measurementPage.className = 'book-page-content font-indic book-measure';
    measurementPage.lang = 'hi';
    measurementPage.dir = 'ltr';
    measurementPage.setAttribute('aria-hidden', 'true');
    const measure = document.createElement('p');
    measure.className = 'book-paragraph';
    measurementPage.append(measure);
    rootRef.current.append(measurementPage);
    const calculate = () => {
      if (!active) return;
      const viewport = rootRef.current.clientWidth;
      const wide = viewport >= 900;
      const stagePadding = viewport < 640 ? 20 : 80;
      const pageWidth = Math.min(wide ? 1200 : 720, viewport - stagePadding * 2) / (wide ? 2 : 1);
      const padding = viewport < 600 ? 26 : 44;
      const width = pageWidth - padding * 2;
      const pageHeight = Math.max(620, Math.min(1100, Math.max(pageWidth * 1.4, window.innerHeight - 140)));
      const height = pageHeight - padding * 2 - 100;
      const size = `${width}:${height}:${fontSize}`;
      if (size === lastSize) return;
      lastSize = size;
      const lineHeight = fontSize * 1.9;
      const gap = fontSize * .65;
      const treeHeight = Math.min(height, Math.max(320, width * .82));
      Object.assign(measurementPage.style, { width: `${width}px`, height: 'auto', fontSize: `${fontSize}px`, lineHeight: '1.9' });
      const measurements = new Map();
      const pages = paginateMahabharata(sections, { height: height - 2, lineHeight, gap, treeHeight }, (text, continued, parts, kind) => {
        const key = `${kind}:${continued}:${text}`;
        if (measurements.has(key)) return measurements.get(key);
        measure.replaceChildren(...parts.map((part, index) => {
          const outer = document.createElement('span');
          if (index && !parts[index - 1].passage.text.trimEnd().endsWith('-')) outer.append(' ');
          const span = document.createElement('span');
          span.className = 'scripture-text';
          for (const run of bookTextRuns(part.passage.text.slice(part.start, part.end), kind)) {
            if (!run.className) span.append(document.createTextNode(run.text));
            else {
              const decoration = document.createElement('span');
              decoration.className = run.className;
              decoration.textContent = run.text;
              span.append(decoration);
            }
          }
          outer.append(span);
          return outer;
        }));
        measure.className = 'book-paragraph book-block-' + kind;
        measure.style.textIndent = continued || kind !== 'paragraph' ? '0' : '1.25em';
        const measuredHeight = measure.getBoundingClientRect().height;
        measurements.set(key, measuredHeight);
        return measuredHeight;
      });
      setLayout({ pages, width, padding, pageHeight, height, treeHeight, fontSize, wide });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(calculate); };
    const observer = new ResizeObserver(schedule);
    observer.observe(rootRef.current);
    window.addEventListener('resize', schedule);
    document.addEventListener('fullscreenchange', schedule);
    const fontsChanged = () => { lastSize = ''; schedule(); };
    document.fonts.addEventListener('loadingdone', fontsChanged);
    if (document.fonts.status === 'loaded') calculate();
    else document.fonts.ready.then(schedule);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      document.removeEventListener('fullscreenchange', schedule);
      document.fonts.removeEventListener('loadingdone', fontsChanged);
      measurementPage.remove();
    };
  }, [enabled, sections, fontSize, rootRef]);
  return layout;
}
