import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, X, BookOpen, ScrollText, Copy, Check, ArrowRight, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../ai-assistant.css';

const TABS = [
  { id: 'explain', label: 'Passage Explanation', Icon: BookOpen },
  { id: 'summarize', label: 'Section Summary', Icon: ScrollText },
];
const EMPTY = { content: '', error: '', loading: false, lang: 'hi' };
const MARKDOWN_ELEMENTS = ['p', 'strong', 'em', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'code', 'pre'];

export default function AIAssistantDrawer({ isOpen, onClose, edition, selectedPassage, sectionToSummarize }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(selectedPassage ? 'explain' : 'summarize');
  const [responseLang, setResponseLang] = useState(user?.preferredLang === 'en' ? 'en' : 'hi');
  const [style, setStyle] = useState('simple');
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState({ explain: EMPTY, summarize: EMPTY });
  const [copyStatus, setCopyStatus] = useState('');
  const requests = useRef({});
  const closeRef = useRef(null);
  const copyTimer = useRef(null);

  const generate = useCallback(async (tab, lang, explanationStyle, prompt = '') => {
    if (tab === 'explain' ? !selectedPassage : !sectionToSummarize) return;
    requests.current[tab]?.abort();
    const controller = new AbortController();
    requests.current[tab] = controller;
    setCopyStatus('');
    setResults(previous => ({ ...previous, [tab]: { ...EMPTY, lang, loading: true } }));
    try {
      const result = tab === 'explain'
        ? await api.explainPassage({ passageId: selectedPassage.id, selectedText: selectedPassage.selectedText,
          responseLang: lang, style: explanationStyle, question: prompt.trim() || undefined }, controller.signal)
        : await api.summarizeSection({ editionId: edition.id, sectionId: sectionToSummarize.id || sectionToSummarize,
          chapterKey: sectionToSummarize.chapterKey, responseLang: lang }, controller.signal);
      if (!controller.signal.aborted) setResults(previous => ({ ...previous,
        [tab]: { ...EMPTY, content: result.content, lang } }));
    } catch (error) {
      if (!controller.signal.aborted) setResults(previous => ({ ...previous,
        [tab]: { ...EMPTY, error: error.message || 'The response could not be generated. Please try again.', lang } }));
    }
  }, [edition.id, selectedPassage, sectionToSummarize]);

  useEffect(() => {
    if (!isOpen) return;
    // Opening a new source starts a cancellable API request and its loading state.
    // eslint-disable-next-line react/set-state-in-effect
    generate(selectedPassage ? 'explain' : 'summarize', 'hi', 'simple');
    const controllers = requests.current;
    return () => Object.values(controllers).forEach(controller => controller.abort());
  }, [isOpen, selectedPassage, generate]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      clearTimeout(copyTimer.current);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const selectTab = (tab) => { setActiveTab(tab); setCopyStatus(''); };
  const result = results[activeTab];
  const hasContext = activeTab === 'explain' ? !!selectedPassage : !!sectionToSummarize;
  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(result.content);
      setCopyStatus('Copied');
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyStatus(''), 2000);
    } catch { setCopyStatus('Could not copy. Select the text to copy it manually.'); }
  };

  if (!isOpen) return null;
  return (
    <aside data-ai-drawer role="dialog" aria-labelledby="gyaan-deep-title" className="gyaan-drawer"
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <header className="gyaan-header">
        <span className="gyaan-lamp" aria-hidden="true"><Flame size={27} strokeWidth={1.5} /></span>
        <div><h2 id="gyaan-deep-title">Gyaan Deep <span lang="hi">ज्ञान दीप</span></h2>
          <p>A little light on your reading</p></div>
        <button ref={closeRef} type="button" className="gyaan-icon-button" aria-label="Close Gyaan Deep" onClick={onClose}><X size={22} /></button>
      </header>
      <div className="gyaan-tabs" role="tablist" aria-label="Reading assistance">
        {TABS.map(({ id, label, Icon }, index) => <button key={id} type="button" role="tab"
          id={`gyaan-tab-${id}`} aria-controls={`gyaan-panel-${id}`} aria-selected={activeTab === id}
          tabIndex={activeTab === id ? 0 : -1} onClick={() => selectTab(id)}
          onKeyDown={event => {
            if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
            selectTab(TABS[next].id);
            document.getElementById(`gyaan-tab-${TABS[next].id}`)?.focus();
          }}><Icon size={17} aria-hidden="true" />{label}</button>)}
      </div>
      <div className="gyaan-scroll" role="tabpanel" id={`gyaan-panel-${activeTab}`} aria-labelledby={`gyaan-tab-${activeTab}`} tabIndex={0}>
        <div className="gyaan-controls">
          <label htmlFor="gyaan-language">Response language
            <select id="gyaan-language" value={responseLang} disabled={result.loading} onChange={event => setResponseLang(event.target.value)}>
              <option value="hi">हिंदी · Hindi</option><option value="en">English</option>
            </select>
          </label>
          {activeTab === 'explain' && <label htmlFor="gyaan-style">Explanation style
            <select id="gyaan-style" value={style} disabled={result.loading} onChange={event => setStyle(event.target.value)}>
              <option value="simple">Simple</option><option value="detailed">Detailed</option><option value="scholarly">Scholarly</option>
            </select>
          </label>}
        </div>
        {activeTab === 'explain' && selectedPassage && <details className="gyaan-source" open>
          <summary><span>Selected passage</span><span>{selectedPassage.reference}</span></summary>
          <blockquote dir="auto">{selectedPassage.selectedText || selectedPassage.text}</blockquote>
        </details>}
        {activeTab === 'summarize' && sectionToSummarize && <div className="gyaan-section">
          <BookOpen size={20} aria-hidden="true" /><div><p>Reading from</p><h3>{sectionToSummarize.title || 'Selected section'}</h3></div>
        </div>}
        {!hasContext && <p className="gyaan-empty">{activeTab === 'explain'
          ? 'Select a passage in the reader to explore its meaning.'
          : 'Choose “Summarize Section” in the reader to explore a chapter.'}</p>}
        {hasContext && <form className="gyaan-form" onSubmit={event => { event.preventDefault(); if (!result.loading) generate(activeTab, responseLang, style, question); }}>
          {activeTab === 'explain' && <label htmlFor="gyaan-question">What would you like to understand? <span>(optional)</span>
            <input id="gyaan-question" value={question} onChange={event => setQuestion(event.target.value)}
              placeholder="For example, explain the main idea" maxLength={1000} disabled={result.loading} />
          </label>}
          <button type="submit" className="gyaan-primary" disabled={result.loading}>
            {result.loading ? 'Preparing your response…' : activeTab === 'explain' ? 'Explain passage' : 'Generate Section Summary'}
            {!result.loading && <ArrowRight size={18} aria-hidden="true" />}
          </button>
        </form>}
        {result.loading && <div className="gyaan-loading" role="status">
          <p>{activeTab === 'explain' ? 'Reading the passage and its context…' : 'Bringing the section’s ideas together…'}</p>
          <div aria-hidden="true"><span /><span /><span /></div>
        </div>}
        {result.error && <div className="gyaan-error" role="alert"><AlertCircle size={20} aria-hidden="true" /><div>
          <strong>We couldn’t prepare this response</strong><p>{result.error}</p><p>Use the button above to try again.</p>
        </div></div>}
        {result.content && <section className="gyaan-result" aria-label="AI response">
          <div className="gyaan-result-heading"><h3>{activeTab === 'explain' ? 'Understanding the passage' : 'Section overview'}</h3>
            <button type="button" className="gyaan-copy" onClick={copyResponse} aria-label="Copy response">
              {copyStatus === 'Copied' ? <Check size={16} /> : <Copy size={16} />}<span>{copyStatus === 'Copied' ? 'Copied' : 'Copy'}</span>
            </button></div>
          <div className="gyaan-prose" lang={result.lang}>
            <Markdown skipHtml allowedElements={MARKDOWN_ELEMENTS} unwrapDisallowed
              components={{ h1: 'h4', h2: 'h4', h3: 'h4' }}>{result.content}</Markdown>
          </div>
        </section>}
        <span className="gyaan-copy-status" role="status">{copyStatus}</span>
        <p className="gyaan-footnote">AI explanations support your reading. Refer to the original passage for the source text.</p>
      </div>
    </aside>
  );
}
