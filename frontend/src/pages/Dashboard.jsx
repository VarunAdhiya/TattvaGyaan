import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ScriptureCard from '../components/ScriptureCard';
import { Loader2, Search, X } from 'lucide-react';

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [retry, setRetry] = useState(0);
  const queryKey = JSON.stringify([search.trim(), page, retry]);
  const [response, setResponse] = useState(null);
  const loading = response?.key !== queryKey;
  const result = response?.data;
  const error = response?.error;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await api.getScriptures({ search: search.trim(), page, limit: 12 }, controller.signal);
        if (!controller.signal.aborted) setResponse({ key: queryKey, data });
      } catch (err) {
        if (!controller.signal.aborted) setResponse({ key: queryKey, error: err.message || 'Unable to load the library.' });
      }
    }, search ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page, queryKey]);

  function changeSearch(value) {
    setParams(value ? { search: value } : {}, { replace: true });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Scripture Library</h1>
          <p className="text-stone-600 text-sm mt-1">Explore Hindi editions, their sources, and available chapters.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input aria-label="Search books" type="search" placeholder="Search books in Hindi or English..."
            value={search} maxLength={200} onChange={event => changeSearch(event.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-600" />
          {search && <button aria-label="Clear search" onClick={() => changeSearch('')} className="absolute right-3 top-2.5"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <section aria-label="Search results" aria-busy={loading}>
        {loading ? <div className="flex justify-center p-12" role="status"><Loader2 className="w-8 h-8 animate-spin text-amber-800" /><span className="sr-only">Loading books</span></div>
          : error ? <div role="alert" className="p-8 text-center"><p>{error}</p><button className="mt-4 underline" onClick={() => setRetry(value => value + 1)}>Retry</button></div>
          : <>
            <p role="status" className="text-sm text-stone-500 mb-4">{result.pagination.total} books{search.trim() ? ' matching “' + search.trim() + '”' : ''}</p>
            {result.scriptures.length ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.scriptures.map(scripture => <ScriptureCard key={scripture.id} scripture={scripture} />)}
            </div> : <div className="p-12 border border-dashed rounded-2xl text-center"><p>No books found. Try another title or spelling.</p><button onClick={() => changeSearch('')} className="mt-3 underline">Show all books</button></div>}
            {result.pagination.totalPages > 1 && <nav aria-label="Library pages" className="flex justify-center gap-4 mt-8">
              <button disabled={page <= 1} onClick={() => setParams({ search, page: page - 1 })}>Previous</button>
              <span>Page {page} of {result.pagination.totalPages}</span>
              <button disabled={page >= result.pagination.totalPages} onClick={() => setParams({ search, page: page + 1 })}>Next</button>
            </nav>}
          </>}
      </section>
    </div>
  );
}
