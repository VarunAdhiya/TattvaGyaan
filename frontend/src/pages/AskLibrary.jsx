import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../library-ai.css';

export default function AskLibrary() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState('');
  const [revision, setRevision] = useState(0);
  const [question, setQuestion] = useState('');
  const [editionId, setEditionId] = useState('');
  const [responseLang, setResponseLang] = useState(user?.preferredLang === 'en' ? 'en' : 'hi');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [clearing, setClearing] = useState(false);
  const requestRef = useRef(null);
  const resultHeading = useRef(null);
  const questionInput = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    api.getLibraryAICatalog(controller.signal).then(data => {
      if (!controller.signal.aborted) { setCatalog(data); setCatalogError(''); }
    }).catch(err => { if (!controller.signal.aborted) setCatalogError(err.message); });
    api.getLibraryAIHistory(controller.signal).then(data => {
      if (!controller.signal.aborted) { setHistory(data.answers); setHistoryError(''); }
    }).catch(() => { if (!controller.signal.aborted) setHistoryError('Recent answers could not be loaded.'); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);

  async function ask(event) {
    event.preventDefault();
    if (requestRef.current || question.trim().length < 3) return;
    const controller = new AbortController(); requestRef.current = controller;
    setBusy(true); setError(''); setResult(null);
    try {
      const answer = await api.askLibrary({ question: question.trim(), responseLang, ...(editionId ? { editionId } : {}) }, controller.signal);
      if (!controller.signal.aborted) {
        setResult(answer);
        setHistory(items => [answer, ...items.filter(item => item.id !== answer.id)].slice(0, 10));
      }
    } catch (err) { if (!controller.signal.aborted) setError(err.message || 'Unable to answer. Please try again.'); }
    finally { if (!controller.signal.aborted) { setBusy(false); requestRef.current = null; } }
  }

  function chooseExample(text) { setQuestion(text); questionInput.current?.focus(); }
  async function clearHistory() {
    setClearing(true); setHistoryError('');
    try { await api.clearLibraryAIHistory(); setHistory([]); }
    catch { setHistoryError('Recent answers could not be cleared. Please try again.'); }
    finally { setClearing(false); }
  }

  return <div className="library-ai-page">
    <header className="library-ai-intro">
      <h1>Ask the library</h1>
      <p lang="hi" className="library-ai-hindi">जिज्ञासा से समझ की ओर</p>
      <p>Ask in everyday Hindi or English. Explore an explanation, then read the passages behind it.</p>
    </header>
    <form className="library-ai-form" onSubmit={ask} aria-busy={busy}>
      <label htmlFor="library-question">What would you like to understand?</label>
      <textarea ref={questionInput} id="library-question" value={question} onChange={e => setQuestion(e.target.value)}
        placeholder="कर्म और उसके फल के बारे में गीता क्या कहती है?" required minLength={3} maxLength={1000} rows={3}
        aria-describedby="library-question-help" disabled={busy} />
      <div className="library-ai-controls">
        <div className="library-ai-field"><label htmlFor="library-scope">Search in</label><select id="library-scope" value={editionId} onChange={e => setEditionId(e.target.value)} disabled={busy || !catalog}>
          <option value="">All available books</option>
          {catalog?.editions.map(edition => <option key={edition.id} value={edition.id}>{edition.scripture.title}</option>)}
        </select></div>
        <div className="library-ai-field"><label htmlFor="library-language">Answer language</label><select id="library-language" value={responseLang} onChange={e => setResponseLang(e.target.value)} disabled={busy}>
          <option value="hi">हिन्दी</option><option value="en">English</option>
        </select></div>
        <button className="library-ai-submit" type="submit" disabled={busy || !catalog?.ready || question.trim().length < 3}>
          {busy ? <><Loader2 size={18} className="library-ai-spinner" aria-hidden="true" />Finding an explanation…</> : <>Ask the library<ArrowRight size={18} aria-hidden="true" /></>}
        </button>
      </div>
      <p id="library-question-help" className="library-ai-help">Answers use the available editions, including draft texts. Each question is independent. AI explanations are not original scripture.</p>
    </form>
    <div aria-live="polite" className="library-ai-status">
      {busy && <p role="status">Searching the books and checking supporting passages. This can take a moment.</p>}
      {!catalog && !catalogError && <p role="status">Checking the searchable library…</p>}
      {catalog && !catalog.ready && <p>The library search index is being prepared. <button onClick={() => setRevision(v => v + 1)}>Check again</button></p>}
      {catalog?.ready && catalog.indexedPassages < catalog.totalPassages && <p>Search currently covers {catalog.indexedPassages.toLocaleString()} of {catalog.totalPassages.toLocaleString()} passages. More passages still need indexing. <button onClick={() => setRevision(v => v + 1)}>Refresh coverage</button></p>}
    </div>
    {catalogError && <p role="alert" className="library-ai-error">{catalogError} <button onClick={() => setRevision(v => v + 1)}>Retry</button></p>}
    {error && <p role="alert" className="library-ai-error">{error} Your question is still above; you can edit it or try again.</p>}
    {!result && !busy && <div className="library-ai-examples" aria-label="Example questions">
      <span>Try a question</span>
      <button onClick={() => chooseExample('गीता में कर्म और उसके फल के बारे में क्या कहा गया है?')}>कर्म और उसके फल के बारे में</button>
      <button onClick={() => chooseExample('What do the available books say about controlling anger?')}>What do the books say about anger?</button>
    </div>}
    {result && <section className="library-ai-answer" aria-labelledby="library-answer-title">
      <h2 id="library-answer-title" tabIndex={-1} ref={resultHeading}>{result.question}</h2>
      <p className="library-ai-help">AI explanation · {result.responseLang === 'hi' ? 'हिन्दी' : 'English'}</p>
      {result.answered ? <>
        <div className="library-ai-prose" lang={result.responseLang}>
          {result.paragraphs.map((paragraph, index) => <div key={index}><p>{paragraph.text}</p>
            <div className="library-ai-references" aria-label="Supporting sources">{paragraph.sourceIds.map(id => <a key={id} href={`#source-${result.id}-${id}`}>Source {id.slice(1)}</a>)}</div>
          </div>)}
        </div>
        <h3>Read the supporting passages</h3>
        <div className="library-ai-sources">{result.sources.map(source => <article key={source.id} id={`source-${result.id}-${source.id}`}>
          <div className="library-ai-source-title"><BookOpen size={20} aria-hidden="true" /><h4>{source.title} · {source.reference}</h4><span>Source {source.id.slice(1)}</span></div>
          <p className="library-ai-source-edition">{source.edition} · {source.section}</p>
          {source.contentStatus !== 'complete' && <p className="library-ai-draft">Draft text · Not fully proofread</p>}
          <blockquote lang="hi">{source.excerpt}</blockquote>
          {source.href ? <Link to={source.href}>Open supporting passage<ArrowRight size={17} aria-hidden="true" /></Link>
            : <p role="status">This source has changed or is no longer available. Ask the question again for current sources.</p>}
        </article>)}</div>
      </> : <p lang={result.responseLang} className="library-ai-no-answer">{result.message}</p>}
    </section>}
    <section className="library-ai-history" aria-labelledby="library-history-title">
      <div><h2 id="library-history-title">Your recent questions</h2>{history.length > 0 && <button disabled={clearing || busy} onClick={clearHistory}>{clearing ? 'Clearing…' : 'Clear history'}</button>}</div>
      {historyError && <p role="alert">{historyError} <button onClick={() => setRevision(v => v + 1)}>Retry</button></p>}
      {!history.length && !historyError && <p>Your last ten answers will appear here, visible only to your account.</p>}
      <ul>{history.map(answer => <li key={answer.id}><button disabled={busy} onClick={() => setResult(answer)}>{answer.question}<ArrowRight size={16} aria-hidden="true" /></button></li>)}</ul>
    </section>
  </div>;
}
