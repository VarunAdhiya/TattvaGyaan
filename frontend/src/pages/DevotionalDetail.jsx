import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import { api } from '../api/client';
import { devotionalSections, DevotionalState } from '../components/DevotionalShared';

export default function DevotionalDetail({ category }) {
  const { slug } = useParams();
  const section = devotionalSections[category];
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('hindi');
  const [fontSize, setFontSize] = useState(22);
  const [reading, setReading] = useState(false);
  const [copied, setCopied] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError(''); setLanguage('hindi'); setCopied(''); setReading(false);
    window.scrollTo(0, 0);
    api.getDevotional(category, slug, controller.signal).then(setResult).catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [category, slug, retry]);
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied('Link copied'); }
    catch { setCopied('Copy the page address from your browser to share.'); }
  }
  return <div className={`dev-page ${reading ? 'dev-reading-mode' : ''}`}>
    <Link to={section.path} className="dev-back"><ArrowLeft size={16} />All {section.title.toLowerCase()}</Link>
    {!result || error ? <DevotionalState loading={!error} error={error} onRetry={() => setRetry(r => r + 1)} /> : <>
      <header className="dev-detail-heading"><h1>{result.text.title}</h1><p lang="hi" className="dev-hindi-subtitle">{result.text.titleHindi}</p><p className="dev-detail-meta">{section.title} · {result.text.deity}</p></header>
      <div className="dev-detail-layout">
        <article className="dev-prayer">
          {result.text.contentStatus === 'source_text' ? <>
            <div className="dev-reader-toolbar">
              <div className="dev-language" role="group" aria-label="Prayer language"><button aria-pressed={language === 'hindi'} onClick={() => setLanguage('hindi')}>हिन्दी</button><button aria-pressed={language === 'transliteration'} onClick={() => setLanguage('transliteration')}>Transliteration</button></div>
              <div className="dev-reader-actions"><button aria-label="Decrease text size" disabled={fontSize <= 18} onClick={() => setFontSize(size => size - 2)}><Minus size={16} /></button><span aria-label={`Text size ${fontSize}`}>Aa</span><button aria-label="Increase text size" disabled={fontSize >= 34} onClick={() => setFontSize(size => size + 2)}><Plus size={16} /></button><button aria-pressed={reading} aria-label="Reading mode" onClick={() => setReading(value => !value)}>{reading ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button></div>
            </div>
            <div className="dev-prayer-text" lang={language === 'hindi' ? 'hi' : 'hi-Latn'} style={{ fontSize }}>
              <span className="dev-prayer-om" aria-hidden="true">ॐ</span>
              {result.text[language].split(/\n\n+/).map((verse, i) => <p key={i}>{verse}</p>)}
            </div>
          </> : <div className="dev-source-only"><h2>Lyrics unavailable</h2><p>This bhajan is listed in the collection, but its lyrics are not available in TattvaGyaan.</p></div>}
        </article>
        {!reading && <aside className="dev-related"><h2>More {section.title.toLowerCase()}</h2>{result.related.map(text => <Link key={text.id} to={`${section.path}/${text.slug}`}><span>{text.title}</span><small lang="hi">{text.titleHindi}</small></Link>)}<button className="dev-button" onClick={copyLink}>{copied === 'Link copied' ? <Check size={16} /> : <Copy size={16} />}Copy link</button><p role="status" className="dev-footnote">{copied}</p></aside>}
      </div>
    </>}
  </div>;
}
