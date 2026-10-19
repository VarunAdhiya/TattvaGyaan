import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { devotionalSections, DevotionalCard, DevotionalState } from '../components/DevotionalShared';

export default function DevotionalCollection({ category }) {
  const section = devotionalSections[category];
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const deity = params.get('deity') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [query, setQuery] = useState(search);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { setQuery(search); }, [search, category]);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.getDevotionals({ category, search, ...(deity ? { deity } : {}), page }, controller.signal)
      .then(setResult).catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [category, search, deity, page, retry]);

  function update(values) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, String(value));
      else next.delete(key);
    }
    setParams(next);
  }
  return <div className="dev-page">
    <header className="dev-heading">
      <div><h1>{section.title}</h1><p className="dev-eyebrow">A moment for devotion</p><p lang="hi" className="dev-hindi-subtitle">{section.hindi}</p><p className="dev-description">{section.description}</p></div>
      <div className="dev-source-note" aria-hidden="true"><span className="dev-om">ॐ</span></div>
    </header>
    <form className="dev-search" onSubmit={event => { event.preventDefault(); update({ search: query.trim(), page: null }); }}>
      <Search size={20} aria-hidden="true" /><input aria-label={`Search ${section.title.toLowerCase()}`} placeholder="Search in Hindi or English…" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} />
      <button type="submit" className="dev-button dev-button-primary">Search</button>
    </form>
    <div className="dev-filters">
      <label>Browse by deity<select aria-label="Deity" value={deity} onChange={event => update({ deity: event.target.value, page: null })}>
        <option value="">All deities</option>{result?.deities.map(item => <option key={item.name} value={item.name}>{item.name} ({item.count})</option>)}
        {deity && !result && <option value={deity}>{deity}</option>}
      </select></label>
      <span aria-live="polite">{result ? `${result.total} ${section.title.toLowerCase()}` : 'Loading collection…'}</span>
      {(search || deity) && <button className="dev-text-button" onClick={() => { setQuery(''); setParams({}); }}>Clear filters</button>}
    </div>
    {error || !result ? <DevotionalState loading={!error} error={error} onRetry={() => setRetry(r => r + 1)} /> : <>
      {result.texts.length ? <div className="dev-grid">{result.texts.map(text => <DevotionalCard key={text.id} text={text} />)}</div> : <div className="dev-state"><h2>No prayers found</h2><p>Try another title or choose a different deity.</p><button className="dev-button" onClick={() => { setQuery(''); setParams({}); }}>View all {section.title.toLowerCase()}</button></div>}
      {result.pages > 1 && <nav aria-label="Collection pages" className="dev-pagination">
        <button className="dev-button" disabled={page <= 1} onClick={() => update({ page: page - 1 })}><ChevronLeft size={16} />Previous</button>
        <span>Page {page} of {result.pages}</span>
        <button className="dev-button" disabled={page >= result.pages} onClick={() => update({ page: page + 1 })}>Next<ChevronRight size={16} /></button>
      </nav>}
      <p className="dev-footnote">Read available prayers in Hindi or Roman transliteration. Entries without text are marked “Lyrics unavailable”.</p>
    </>}
  </div>;
}
