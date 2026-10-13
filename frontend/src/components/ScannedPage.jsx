import { useEffect, useRef, useState } from 'react';

// Each visible page owns its canvas, including while a resize is rendering.
export default function ScannedPage({ pdfDocument, pageNumber, zoom, onReady }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);
  const renderKey = `${pageNumber}:${width}:${zoom}:${retry}`;
  const current = result?.key === renderKey ? result : null;

  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    const container = containerRef.current;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Scanned page ${pageNumber}`);
    let active = true;
    let renderTask;
    let pdfPage;
    async function render() {
      try {
        pdfPage = await pdfDocument.getPage(pageNumber);
        if (!active) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: width * zoom / original.width });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = pdfPage.render({
          canvasContext: canvas.getContext('2d'), viewport,
          transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
        if (!active) return;
        container.replaceChildren(canvas);
        setResult({ key: renderKey });
        onReady(pageNumber);
      } catch (error) {
        if (active && error.name !== 'RenderingCancelledException') {
          setResult({ key: renderKey, error: 'Unable to load this scanned page.' });
        }
      } finally {
        if (!active) { pdfPage?.cleanup(); canvas.width = 0; canvas.height = 0; }
      }
    }
    render();
    return () => {
      active = false;
      renderTask?.cancel();
      container.replaceChildren();
      pdfPage?.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [pdfDocument, pageNumber, zoom, width, renderKey, onReady]);

  return <>
    {!current && <p role="status" className="text-sm py-3">Loading page…</p>}
    {current?.error && <div role="alert" className="text-sm py-3">{current.error} <button className="underline" onClick={() => setRetry(value => value + 1)}>Retry page</button></div>}
    <div ref={containerRef} className="reader-scan" aria-busy={!current} />
  </>;
}
