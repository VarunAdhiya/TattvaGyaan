import { useCallback, useLayoutEffect, useRef } from 'react';
import { spreadStart } from './readerPages';

// Transient, inert copies keep text selection and PDF rendering independent of
// the animation. Canvas pixels and scroll positions need copying explicitly.
function copyPage(page) {
  const copy = page.cloneNode(true);
  copy.className = 'reader-flip-copy';
  copy.removeAttribute('aria-label');
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  [copy, ...copy.querySelectorAll('[id]')].forEach(node => node.removeAttribute('id'));
  const canvases = copy.querySelectorAll('canvas');
  page.querySelectorAll('canvas').forEach((canvas, index) => {
    canvases[index].getContext('2d').drawImage(canvas, 0, 0);
  });
  const originals = [page, ...page.querySelectorAll('*')];
  const copies = [copy, ...copy.querySelectorAll('*')];
  const scrollPositions = originals.map((node, index) => [copies[index], node.scrollTop, node.scrollLeft]);
  return {
    element: copy,
    restoreScroll: () => scrollPositions.forEach(([node, top, left]) => { node.scrollTop = top; node.scrollLeft = left; }),
  };
}

function panel(className, snapshot) {
  const element = document.createElement('div');
  element.className = className;
  if (snapshot) element.append(snapshot.element);
  return element;
}

export default function useBookFlip(visibleKey, layoutKey) {
  const bookRef = useRef(null);
  const layerRef = useRef(null);
  const pendingRef = useRef(null);
  const cleanupRef = useRef(null);

  const cancelTurn = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    pendingRef.current = null;
    layerRef.current?.replaceChildren();
    if (bookRef.current) {
      delete bookRef.current.dataset.turning;
      delete bookRef.current.dataset.turnState;
    }
  }, []);

  const prepareTurn = useCallback(nextPage => {
    cancelTurn();
    const book = bookRef.current;
    if (!book || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = Number(book.dataset.spreadStart);
    const to = spreadStart(nextPage, book.dataset.wide === 'true');
    if (from === to) return;
    const current = [...book.querySelectorAll(':scope > .reader-visible-page')];
    if (!current.length || current.some(page => page.dataset.pageReady !== 'true' || page.querySelector('[aria-busy="true"]'))) return;
    pendingRef.current = { to, direction: to > from ? 'forward' : 'backward', snapshots: current.map(copyPage) };
  }, [cancelTurn]);

  // Zoom, fullscreen/viewport changes and unmount must never leave a sheet over
  // the reader. Reduced motion also takes effect during an in-flight turn.
  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    window.addEventListener('resize', cancelTurn);
    media.addEventListener('change', cancelTurn);
    return () => {
      window.removeEventListener('resize', cancelTurn);
      media.removeEventListener('change', cancelTurn);
      cancelTurn();
    };
  }, [cancelTurn]);

  useLayoutEffect(() => { cancelTurn(); }, [layoutKey, cancelTurn]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    const book = bookRef.current;
    const layer = layerRef.current;
    if (!pending || !book || !layer || Number(book.dataset.spreadStart) !== pending.to) return;
    const { snapshots, direction } = pending;
    book.dataset.turning = direction;
    book.dataset.turnState = 'waiting';
    const hold = panel('reader-turn-hold' + (snapshots.length === 2 ? ' reader-turn-hold--spread' : ''));
    snapshots.forEach(snapshot => hold.append(panel('reader-turn-held-page', snapshot)));
    layer.append(hold);
    snapshots.forEach(snapshot => snapshot.restoreScroll());
    let frame;
    let timer;
    let started = false;
    const observer = new MutationObserver(tryStart);
    function tryStart() {
      if (started) return;
      const targets = [...book.querySelectorAll(':scope > .reader-visible-page')];
      if (targets.some(page => page.querySelector('[role="alert"]'))) { cancelTurn(); return; }
      if (!targets.length || targets.some(page => page.dataset.pageReady !== 'true' || page.querySelector('.reader-scan[aria-busy="true"]'))) return;
      started = true;
      observer.disconnect();
      clearTimeout(timer);
      const spread = targets.length === 2;
      const forward = direction === 'forward';
      const front = spread ? snapshots[forward ? snapshots.length - 1 : 0]
        : forward ? snapshots.at(-1) : copyPage(targets[0]);
      const back = spread ? copyPage(targets[forward ? 0 : 1]) : null;
      const stationary = spread ? (snapshots.length === 2 ? snapshots[forward ? 0 : 1] : null)
        : !forward ? snapshots[0] : null;
      const scene = panel(`reader-turn-scene reader-turn-scene--${direction} reader-turn-scene--${spread ? 'spread' : 'single'}`);
      if (stationary) scene.append(panel('reader-turn-stationary', stationary));
      scene.append(panel('reader-turn-shadow'));
      const sheet = panel('reader-turn-sheet');
      sheet.append(panel('reader-turn-face reader-turn-face--front', front), panel('reader-turn-face reader-turn-face--back', back));
      scene.append(sheet);
      layer.replaceChildren(scene);
      [front, back, stationary].forEach(snapshot => snapshot?.restoreScroll());
      // A separate frame guarantees that the starting face is painted before
      // the hinge rotates; each side has its own readable, non-mirrored texture.
      frame = requestAnimationFrame(() => {
        book.dataset.turnState = 'flipping';
        scene.classList.add('reader-turn-scene--animate');
        const animation = sheet.getAnimations()[0];
        const finish = () => { if (pendingRef.current === pending) cancelTurn(); };
        if (animation) animation.finished.then(finish, finish);
        else finish();
      });
    }
    cleanupRef.current = () => { observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(timer); };
    observer.observe(book, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-page-ready', 'aria-busy'] });
    // A slow or failed request should reveal its normal loading/error UI.
    timer = setTimeout(cancelTurn, 1800);
    tryStart();
    return () => { if (pendingRef.current === pending) cancelTurn(); };
  }, [visibleKey, cancelTurn]);

  return { bookRef, layerRef, prepareTurn };
}
