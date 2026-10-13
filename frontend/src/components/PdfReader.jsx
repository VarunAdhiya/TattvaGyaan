import { useEffect, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Reader3D from './Reader3D';

GlobalWorkerOptions.workerSrc = workerUrl;

// Document loading is separate; both text and scans use the same reader UI.
export default function PdfReader({ edition, ...readerProps }) {
  const source = /^\/library\/[a-z0-9][a-z0-9-]*\.pdf$/.test(edition.source || '') ? edition.source : null;
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const key = `${source}:${retry}`;
  const current = result?.key === key ? result : null;

  useEffect(() => {
    if (!source) return;
    let active = true;
    const task = getDocument({ url: source, disableAutoFetch: true, disableStream: true, isEvalSupported: false });
    task.promise.then(pdfDocument => {
      if (active) setResult({ key, pdfDocument });
    }).catch(() => {
      if (active) setResult({ key, error: 'Unable to load this book. Please try again.' });
    });
    return () => { active = false; task.destroy().catch(() => {}); };
  }, [source, key]);

  if (!source || current?.error) return <div className="reader-shell theme-light items-center justify-center gap-4 p-8">
    <p role="alert">{current?.error || "This edition's PDF is unavailable."}</p>
    {source && <><button className="underline" onClick={() => setRetry(value => value + 1)}>Retry book</button><a href={source} download className="underline">Download original PDF</a></>}
  </div>;
  if (!current?.pdfDocument) return <div className="reader-shell theme-light items-center justify-center p-8" role="status">Opening book…</div>;

  return <Reader3D {...readerProps} edition={edition} pdfDocument={current.pdfDocument} />;
}
