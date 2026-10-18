import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Bookmark, MessageSquare, Pencil, Trash2, X, List, Sparkles, ChevronLeft, ChevronRight, Maximize2, Flower2 } from 'lucide-react';
import { api } from '../api/client';
import { buildReaderPages, spreadStart } from '../lib/readerPages';
import useBookFlip from '../lib/useBookFlip';
import { GARUDA_SOURCE, MANUSMRITI_SOURCE, RAMAYAN_SOURCE, isTypesetBook, pageForPassage } from '../lib/mahabharataLayout';
import useMahabharataLayout from '../lib/useMahabharataLayout';
import ProsePage from './ProsePage';
import BookStand from './BookStand';
import '../mahabharata-reader.css';

// No gesture handlers on scripture text: native selection, scrolling and buttons
// are independent of navigation. Only the visible spread is mounted.
export default function Reader3D({ edition, sections, initialPageIndex = 1, initialPassageId, onProgressUpdate, onAskAI, onSummarize }) {
  const navigate = useNavigate();
  const reflowProse = isTypesetBook(edition);
  const [fontSize, setFontSize] = useState(18);
  const rootRef = useRef(null);
  const bookLayout = useMahabharataLayout(reflowProse, sections, fontSize, rootRef);
  const previousLayout = useRef(null);
  const standardPages = useMemo(() => buildReaderPages(sections), [sections]);
  const pages = bookLayout?.pages || standardPages;
  const [currentPage, setCurrentPage] = useState(() => Math.max(0, Math.min(initialPageIndex, pages.length - 1)));
  const [pageInput, setPageInput] = useState(String(currentPage + 1));
  const [wide, setWide] = useState(() => window.innerWidth >= 900);
  const [theme, setTheme] = useState('light');
  const [drawer, setDrawer] = useState(null);
  const [toolPassage, setToolPassage] = useState(null);
  const [toolPassages, setToolPassages] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [annotationError, setAnnotationError] = useState('');
  const [annotationRetry, setAnnotationRetry] = useState(0);
  const [noteEditor, setNoteEditor] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [busy, setBusy] = useState(null);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [focusedPassage, setFocusedPassage] = useState(initialPassageId);
  const [selection, setSelection] = useState(null);
  const [fetchedPages, setLoadedPages] = useState({});
  const loadedPages = useMemo(() => bookLayout
    ? Object.fromEntries(bookLayout.pages.map((page, index) => [index, page.passages || []]))
    : fetchedPages, [bookLayout, fetchedPages]);
  const [pageFailure, setPageFailure] = useState(null);
  const [pageRetry, setPageRetry] = useState(0);
  const [resolving, setResolving] = useState(Boolean(initialPassageId));
  const start = spreadStart(Math.min(currentPage, pages.length - 1), wide);
  const visibleIndices = wide && start > 0 && start + 1 < pages.length ? [start, start + 1] : [start];
  const visibleKey = visibleIndices.join(',');
  const { bookRef, layerRef, prepareTurn } = useBookFlip(visibleKey, `${wide}:${theme}:${fontSize}:${bookLayout?.width}:${bookLayout?.height}`, reflowProse);
  const pageError = pageFailure?.key === visibleKey + ':' + pageRetry ? pageFailure.message : '';
  const contents = useMemo(() => sections.flatMap(section => [{
      ...section, pageIndex: pages.findIndex(page => page.sectionId === section.id || page.sectionIds?.includes(section.id)),
    }, ...(section.readerBlocks || []).filter(block => block.kind === 'chapter').map(block => ({
      id: section.id + '-' + block.chapterKey, title: block.title,
      pageIndex: pages.findIndex(page => page.sectionId === section.id && page.chapterKey === block.chapterKey),
      passageId: section.passages?.find(passage => passage.reference === block.parts[0]?.reference)?.id,
    }))]), [sections, pages]);

  const goToPage = useCallback(index => {
    if (!Number.isInteger(index) || index < 0 || index >= pages.length) return;
    prepareTurn(index);
    setCurrentPage(index);
    setPageInput(String(index + 1));
    setDrawer(null);
    setSelection(null);
  }, [pages.length, prepareTurn]);

  function goToSection(section) {
    goToPage(section.pageIndex);
    // A topic may start midway through an original OCR passage. Do not highlight
    // that passage's preceding chapter when navigating by its heading.
    if (bookLayout) setFocusedPassage(section.passageId ? undefined : section.passages?.[0]?.id);
  }

  useLayoutEffect(() => {
    if (!bookLayout || previousLayout.current === bookLayout) return;
    const previous = previousLayout.current;
    const previousPage = previous?.pages[currentPage];
    const anchor = previousPage?.blocks?.flatMap(block => block.parts).find(part => part.passage.id === focusedPassage)
      || previousPage?.blocks?.[0]?.parts[0];
    let target = anchor ? pageForPassage(pages, anchor.passage.id, anchor.start)
      : !previous && initialPassageId ? pageForPassage(pages, initialPassageId) : currentPage;
    if (target < 0) {
      target = 2;
      if (!previous && initialPassageId) setNotice('This passage is not available in this edition.');
    }
    target = Math.max(0, Math.min(target, pages.length - 1));
    previousLayout.current = bookLayout;
    setCurrentPage(target);
    setPageInput(String(target + 1));
    setSelection(null);
    setResolving(false);
  }, [bookLayout, pages, currentPage, initialPassageId, focusedPassage]);

  useEffect(() => {
    const resize = () => setWide(window.innerWidth >= 900);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    Promise.all([api.getBookmarks(), api.getNotes()]).then(([bm, nt]) => {
      if (active) { setAnnotationError(''); setBookmarks(bm.bookmarks || []); setNotes(nt.notes || []); }
    }).catch(error => { if (active) setAnnotationError(error.message || 'Unable to load notes and bookmarks.'); });
    return () => { active = false; };
  }, [edition.id, annotationRetry]);

  useEffect(() => {
    if (!initialPassageId) return;
    if (reflowProse) return;
    let active = true;
    api.getPassagePosition(initialPassageId).then(position => {
      if (position.editionId !== edition.id) throw new Error('This passage belongs to another edition.');
      if (active) goToPage(position.pageIndex);
    }).catch(error => { if (active) setNotice(error.message); })
      .finally(() => { if (active) setResolving(false); });
    return () => { active = false; };
  }, [initialPassageId, edition.id, goToPage, reflowProse]);

  useEffect(() => {
    if (reflowProse) return;
    const controller = new AbortController();
    const indices = visibleKey.split(',').map(Number);
    Promise.all(indices.map(async index => {
      const page = pages[index];
      if (page.type !== 'content') return [index, []];
      const result = await api.getSectionPassages(page.sectionId, page.sectionPage, 2, controller.signal);
      return [index, result.passages];
    })).then(entries => {
      if (!controller.signal.aborted) { setPageFailure(null); setLoadedPages(Object.fromEntries(entries)); }
    }).catch(error => {
      if (!controller.signal.aborted) { setLoadedPages({}); setPageFailure({ key: visibleKey + ':' + pageRetry, message: error.message || 'Unable to load this page.' }); }
    });
    return () => controller.abort();
  }, [visibleKey, pages, pageRetry, reflowProse]);

  useEffect(() => {
    if (!focusedPassage) return;
    if (!reflowProse) document.getElementById('passage-' + focusedPassage)?.scrollIntoView({ block: 'nearest' });
  }, [focusedPassage, loadedPages, reflowProse]);

  useEffect(() => {
    const capture = () => {
      const selected = window.getSelection();
      const text = selectedText(selected, reflowProse);
      if (!text || !rootRef.current?.contains(selected.anchorNode)) return;
      const container = selected.anchorNode.parentElement?.closest('.scripture-text');
      if (!container?.contains(selected.focusNode)) return;
      const passage = Object.values(loadedPages).flat().find(item => container.dataset.passageId === item.id || 'text-' + item.id === container.id);
      if (passage?.text.includes(text)) setSelection(previous => previous?.id === passage.id && previous.selectedText === text
        ? previous : { ...passage, selectedText: text });
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [loadedPages, reflowProse]);

  useEffect(() => {
    if (resolving || pageError) return;
    if (reflowProse && (!bookLayout || previousLayout.current !== bookLayout)) return;
    const page = pages[currentPage];
    if (!page) return;
    const passages = loadedPages[currentPage];
    if (page.type === 'content' && !passages?.length) return;
    const timer = setTimeout(() => onProgressUpdate?.({
      pageIndex: currentPage, sectionId: passages?.find(passage => passage.id === focusedPassage)?.sectionId || page.sectionId,
      passageId: passages?.some(passage => passage.id === focusedPassage) ? focusedPassage : passages?.[0]?.id,
      percentage: Math.round(currentPage / Math.max(1, pages.length - 1) * 100),
    }), 400);
    return () => clearTimeout(timer);
  }, [currentPage, loadedPages, pages, onProgressUpdate, focusedPassage, resolving, pageError, reflowProse, bookLayout]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') { setDrawer(null); setNoteEditor(null); return; }
      if (drawer || noteEditor || document.querySelector('[data-ai-drawer]') ||
          event.target.closest('input, textarea, select, button, [contenteditable="true"]') ||
          window.getSelection()?.toString()) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const next = event.key === 'ArrowRight' ? start + (wide && start > 0 ? 2 : 1) : start - (wide ? 2 : 1);
        goToPage(Math.max(0, Math.min(next, pages.length - 1)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start, wide, pages.length, goToPage, drawer, noteEditor]);

  function captureSelection(passage, textContainer) {
    const selected = window.getSelection();
    const container = textContainer || document.getElementById('text-' + passage.id);
    const text = selectedText(selected, reflowProse);
    if (text && container?.contains(selected.anchorNode) && container.contains(selected.focusNode) && passage.text.includes(text)) {
      setSelection({ ...passage, selectedText: text });
    } else {
      setSelection(null);
    }
  }

  async function jumpToPassage(passageId, passage) {
    try {
      const localPage = bookLayout ? pageForPassage(bookLayout.pages, passageId) : -1;
      if (localPage >= 0) {
        goToPage(localPage);
        setFocusedPassage(passageId);
        return;
      }
      const position = await api.getPassagePosition(passageId);
      if (position.editionId !== edition.id) {
        const detail = passage?.section?.edition || (await api.getPassage(passageId)).passage.section.edition;
        navigate('/reader/' + detail.scriptureId + '/' + position.editionId + '?passage=' + encodeURIComponent(passageId));
      } else {
        if (reflowProse) throw new Error('This passage is not available in the current book layout.');
        goToPage(position.pageIndex);
        setFocusedPassage(passageId);
      }
    } catch (error) { setNotice(error.message); }
  }

  async function runAction(key, action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(key);
    try { await action(); } catch (error) { setNotice(error.message || 'Unable to save. Please try again.'); }
    finally { busyRef.current = false; setBusy(null); }
  }

  function toggleBookmark(passage) {
    runAction(passage.id, async () => {
      const existing = bookmarks.find(bookmark => bookmark.passageId === passage.id);
      if (existing) {
        await api.removeBookmark(existing.id);
        setBookmarks(items => items.filter(item => item.id !== existing.id));
        setNotice('Bookmark removed');
      } else {
        const result = await api.addBookmark(passage.id, passage.reference);
        setBookmarks(items => [...items, { ...result.bookmark, passage }]);
        setNotice('Passage bookmarked');
      }
    });
  }

  function editNote(passage, note = null) {
    setNoteEditor({ passage, note });
    setNoteContent(note?.content || '');
    setDrawer(null);
  }

  function saveNote(event) {
    event.preventDefault();
    if (!noteContent.trim()) return;
    runAction('note', async () => {
      const result = noteEditor.note
        ? await api.updateNote(noteEditor.note.id, noteContent.trim())
        : await api.addNote(noteEditor.passage.id, noteContent.trim());
      setNotes(items => noteEditor.note
        ? items.map(item => item.id === noteEditor.note.id ? { ...item, ...result.note } : item)
        : [...items, { ...result.note, passage: noteEditor.passage }]);
      setNoteEditor(null);
      setNotice('Note saved');
    });
  }

  const buttonClass = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-40';

  return (
    <div ref={rootRef} className={'reader-shell theme-' + theme + (reflowProse ? ' reader-prose reader-typeset' : '') + (edition.source === GARUDA_SOURCE ? ' reader-garuda' : '') + (edition.source === MANUSMRITI_SOURCE ? ' reader-manusmriti' : '') + (edition.source === RAMAYAN_SOURCE ? ' reader-ramayan' : '')}
      style={bookLayout ? { '--book-height': `${bookLayout.pageHeight}px`, '--book-padding': `${bookLayout.padding}px`,
        '--book-page-width': `${bookLayout.width + bookLayout.padding * 2}px`,
        '--book-content-height': `${bookLayout.height}px`, '--book-font-size': `${fontSize}px` } : undefined}>
      <header className={reflowProse ? 'mahabharata-toolbar' : 'flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm'}>
        <div className={reflowProse ? 'mahabharata-library-tools' : 'flex flex-wrap gap-1'}>
          <button className={buttonClass} onClick={() => setDrawer('contents')}><List size={16} />Contents</button>
          <button className={buttonClass} onClick={() => setDrawer('bookmarks')}><Bookmark size={16} />Bookmarks</button>
          <button className={buttonClass} onClick={() => setDrawer('notes')}><MessageSquare size={16} />Notes</button>
        </div>
        {reflowProse ? <div className="mahabharata-title">
          <div className="mahabharata-title-line"><Flower2 size={23} strokeWidth={1.4} aria-hidden="true" /><h1 lang="hi">{edition.scripture?.title || edition.title}</h1><Flower2 size={23} strokeWidth={1.4} aria-hidden="true" /></div>
          {edition.contentStatus === 'draft' && <p>Draft text · Not fully proofread</p>}
        </div> : <h1 className="font-serif font-bold truncate max-w-full">{edition.scripture?.title || edition.title}</h1>}
        <div className={reflowProse ? 'mahabharata-reading-tools' : 'flex gap-2 items-center'}>
          <select aria-label="Reading theme" value={theme} onChange={event => setTheme(event.target.value)} className="reader-control rounded p-2">
            <option value="light">Light</option><option value="sepia">Sepia</option><option value="dark">Dark</option>
          </select>
          <button aria-label="Decrease font size" className={buttonClass} disabled={fontSize <= 14} onClick={() => setFontSize(size => size - 2)}>A−</button>
          <button aria-label="Increase font size" className={buttonClass} disabled={fontSize >= 28} onClick={() => setFontSize(size => size + 2)}>A+</button>
          <button aria-label="Toggle fullscreen" className={buttonClass} onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await rootRef.current.requestFullscreen();
            } catch { setNotice('Fullscreen is unavailable in this browser.'); }
          }}><Maximize2 size={16} /></button>
        </div>
      </header>
      {!reflowProse && edition.contentStatus === 'draft' && <p className="px-4 py-2 text-sm border-b">Draft text · Not fully proofread</p>}
      {selection && <div className="reader-control fixed bottom-24 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] flex flex-wrap gap-3 items-center p-3 border rounded-xl shadow-xl text-sm" role="status">
        <span>Selected text · {selection.reference}</span>
        <button className={buttonClass} onClick={() => onAskAI(selection)}><Sparkles size={16} />Ask AI about selected text</button>
        <button className={buttonClass} aria-label="Clear selected text" onClick={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }}><X size={16} /></button>
      </div>}
      {annotationError && <div role="alert" className="p-3 text-sm">{annotationError} <button onClick={() => setAnnotationRetry(value => value + 1)} className="underline">Retry notes and bookmarks</button></div>}
      <main className="reader-stage flex-1 p-3 sm:p-6">
        {reflowProse && !bookLayout && <p role="status">Preparing book pages…</p>}
        <BookStand enabled={reflowProse} spread={visibleIndices.length === 2}>
        <div ref={bookRef} data-spread-start={start} data-wide={wide} className={'reader-book reader-binding reader-spread ' + (visibleIndices.length === 2 ? 'reader-spread-wide' : '')}>
          {visibleIndices.map((index, side) => {
            const page = pages[index];
            const ready = page.type === 'content' ? Boolean(loadedPages[index] && !pageError) : true;
            return <article key={index} data-page-ready={ready} data-prose-content={Boolean(bookLayout && page.type === 'content')} aria-label={'Page ' + (index + 1)} className={'reader-paper reader-visible-page ' + (side === 0 && visibleIndices.length === 2 ? '--left' : '--right')}>
              {page.type === 'cover' ? <div className="flex flex-col justify-center items-center text-center h-full gap-6">
                <BookOpen size={48} /><h2 className="font-serif text-3xl">{edition.scripture?.title || edition.title}</h2>
                <p>{edition.title}</p><p>{edition.translator}</p><p className="text-xs whitespace-pre-wrap">{edition.provenance}</p>
                {edition.source && /^https?:\/\//.test(edition.source) && <a className="underline" href={edition.source} target="_blank" rel="noreferrer">Source and attribution</a>}
                <p className="text-xs">{edition.license}</p>
              </div> : page.type === 'toc' ? <>
                <h2 className="text-2xl font-serif mb-5">Table of Contents</h2>
                <ul>{contents.map(section => <li key={section.id}>
                  <button className="w-full flex justify-between text-left gap-4 py-3 border-b disabled:opacity-50" disabled={section.pageIndex < 0} onClick={() => goToSection(section)}>
                    <span>{section.title}</span><span>{section.pageIndex >= 0 ? section.pageIndex + 1 : 'Unavailable'}</span>
                  </button>
                </li>)}</ul>
                {pages.length <= 2 && <p className="mt-6">No verified text is available in this edition yet.</p>}
              </> : <>
                <div className="reader-section-header flex flex-wrap justify-between items-center gap-2 border-b pb-3 mb-5">
                  <h2 className="font-serif font-bold" title={page.sectionTitle}>{page.sectionTitle}</h2>
                  {bookLayout && <button className={buttonClass + ' text-xs book-tools-button'} onClick={() => {
                    setToolPassages(page.passages); setToolPassage(page.passages[0]); setDrawer('passage');
                  }}>Passage tools</button>}
                  <button className={buttonClass + ' text-xs'} onClick={() => onSummarize(page.sectionId, page.chapterKey, page.sectionTitle)}><Sparkles size={14} />Summarize Section</button>
                </div>
                {bookLayout ? <ProsePage page={page} layout={bookLayout} focusedPassage={focusedPassage} onSelect={captureSelection} onSummarize={onSummarize} />
                  : pageError ? <div role="alert">{pageError} <button className="underline" onClick={() => setPageRetry(value => value + 1)}>Retry page</button></div>
                  : !loadedPages[index] ? <p role="status">Loading page…</p>
                  : loadedPages[index].map(rawPassage => {
                    const passage = { ...rawPassage, sectionId: page.sectionId };
                    const marked = bookmarks.some(bookmark => bookmark.passageId === passage.id);
                    const note = notes.find(item => item.passageId === passage.id);
                    return <div id={'passage-' + passage.id} key={passage.id} className={'reader-passage mb-6 p-3 rounded-lg border ' + (focusedPassage === passage.id ? 'ring-2 ring-amber-500' : 'border-transparent')}>
                      <div className="reader-passage-header flex flex-wrap justify-between gap-2 items-center mb-3 text-xs">
                        <span className="font-bold">{passage.reference}</span>
                        <div className="flex flex-wrap gap-1">
                          <button className={buttonClass} disabled={Boolean(busy) || Boolean(annotationError)} aria-label={marked ? 'Remove bookmark' : 'Bookmark verse'} aria-pressed={marked} onClick={() => toggleBookmark(passage)}><Bookmark size={16} fill={marked ? 'currentColor' : 'none'} /></button>
                          <button className={buttonClass} aria-label="Add or edit note" onClick={() => editNote(passage, note)}><MessageSquare size={16} /></button>
                          <button className={buttonClass} onClick={() => onAskAI(selection?.id === passage.id ? selection : passage)}><Sparkles size={14} />Ask AI</button>
                        </div>
                      </div>
                      <div id={'text-' + passage.id} className="scripture-text font-indic whitespace-pre-wrap" dir={edition.textDirection || 'ltr'} lang={edition.language}
                        style={{ fontSize, lineHeight: 1.9 }} onMouseUp={() => captureSelection(passage)} onTouchEnd={() => captureSelection(passage)} onKeyUp={() => captureSelection(passage)}>
                        {passage.text}
                      </div>
                      {passage.sourceNotes && <details className="mt-3 text-xs"><summary>{edition.contentStatus === 'transcribed' ? 'Source and review notes' : edition.contentStatus === 'draft' ? 'Source notes' : 'Translator’s notes'}</summary><p className="whitespace-pre-wrap">{passage.sourceNotes}</p></details>}
                    </div>;
                  })}
              </>}
              <div className="reader-page-number text-center text-xs pt-4 opacity-60">
                {edition.source === RAMAYAN_SOURCE && page.sourcePage
                  ? <span data-source-page={page.sourcePage} title={`Reader page ${index + 1}`}>
                    {page.printedPage ? `पुस्तक पृष्ठ ${page.printedPage} · ` : ''}Source page {page.sourcePage}
                  </span> : index + 1}
              </div>
            </article>;
          })}
          <button type="button" className="reader-page-corner reader-page-corner--previous" aria-label="Turn page backward" title="Turn page backward" disabled={start === 0}
            onClick={() => goToPage(Math.max(0, start - (wide ? 2 : 1)))}><ChevronLeft size={16} /></button>
          <button type="button" className="reader-page-corner reader-page-corner--next" aria-label="Turn page forward" title="Turn page forward" disabled={start + visibleIndices.length >= pages.length}
            onClick={() => goToPage(start + visibleIndices.length)}><ChevronRight size={16} /></button>
          <div ref={layerRef} className="reader-flip-layer" aria-hidden="true" inert />
        </div>
        </BookStand>
      </main>
      <footer role={reflowProse ? 'navigation' : undefined} aria-label={reflowProse ? 'Page navigation' : undefined} className={reflowProse ? 'reader-navigation mahabharata-navigation' : 'reader-navigation flex flex-wrap justify-between items-center gap-2 p-3 border-t text-sm'}>
        <button aria-label="Previous" className={buttonClass} disabled={start === 0} onClick={() => goToPage(Math.max(0, start - (wide ? 2 : 1)))}><ChevronLeft size={16} /><span className="hidden sm:inline">Previous</span></button>
        <form className="flex items-center gap-2" onSubmit={event => {
          event.preventDefault();
          const target = Number(pageInput);
          if (!Number.isInteger(target) || target < 1 || target > pages.length) { setNotice('Enter a page from 1 to ' + pages.length); return; }
          goToPage(target - 1);
        }}>
          <label htmlFor="reader-page-number">Page</label>
          <input id="reader-page-number" type="number" min="1" max={pages.length} step="1" required value={pageInput}
            onChange={event => setPageInput(event.target.value)} className="reader-control w-16 border rounded p-1 text-center" />
          <span>of {pages.length}</span><button className={buttonClass} type="submit">Go</button>
        </form>
        <button aria-label="Next" className={buttonClass} disabled={start + visibleIndices.length >= pages.length}
          onClick={() => goToPage(start + visibleIndices.length)}><span className="hidden sm:inline">Next</span><ChevronRight size={16} /></button>
      </footer>
      {drawer && <div className="reader-overlay" role="presentation" onClick={() => setDrawer(null)}>
        <aside role="dialog" aria-modal="true" aria-label={drawer} className="reader-drawer" onClick={event => event.stopPropagation()}>
          <div className="flex justify-between items-center mb-5"><h2 className="text-xl capitalize">{drawer}</h2><button autoFocus aria-label="Close panel" className={buttonClass} onClick={() => setDrawer(null)}><X size={20} /></button></div>
          {drawer === 'passage' && toolPassage ? <>
            <label htmlFor="book-tool-passage" className="block mb-2">Passage on this page</label>
            <select id="book-tool-passage" className="reader-control border rounded p-2 w-full mb-4" value={toolPassage.id}
              onChange={event => setToolPassage(toolPassages.find(passage => passage.id === event.target.value))}>
              {toolPassages.map(passage => <option key={passage.id} value={passage.id}>{passage.reference} · {passage.text.slice(0, 45).replace(/\s+/g, ' ')}…</option>)}
            </select>
            <div className="flex flex-wrap gap-2 mb-4">
              <button className={buttonClass} disabled={Boolean(busy) || Boolean(annotationError)}
                aria-label={bookmarks.some(item => item.passageId === toolPassage.id) ? 'Remove bookmark' : 'Bookmark verse'}
                aria-pressed={bookmarks.some(item => item.passageId === toolPassage.id)} onClick={() => toggleBookmark(toolPassage)}><Bookmark size={16} />Bookmark</button>
              <button className={buttonClass} aria-label="Add or edit note" onClick={() => editNote(toolPassage, notes.find(item => item.passageId === toolPassage.id))}><MessageSquare size={16} />Note</button>
              <button className={buttonClass} onClick={() => { setDrawer(null); onAskAI(toolPassage); }}><Sparkles size={16} />Ask AI</button>
            </div>
            <p className="font-indic whitespace-pre-wrap leading-loose">{toolPassage.text}</p>
            {toolPassage.sourceNotes && <details className="mt-5 text-sm"><summary>Source notes</summary><p className="mt-2">{toolPassage.sourceNotes}</p></details>}
          </> : drawer === 'contents' ? contents.map(section => <button key={section.id} disabled={section.pageIndex < 0} className="block w-full text-left border-b py-3 disabled:opacity-50" onClick={() => goToSection(section)}>{section.title} · {section.pageIndex >= 0 ? section.pageIndex + 1 : 'Unavailable'}</button>)
            : (drawer === 'notes' ? notes : bookmarks).length === 0 ? <p>No {drawer} saved yet.</p>
            : (drawer === 'notes' ? notes : bookmarks).map(item => <div key={item.id} className="border rounded-lg p-3 mb-3">
              <div className="flex gap-2">
                <button className="flex-1 text-left whitespace-pre-wrap" onClick={() => jumpToPassage(item.passageId, item.passage)}>
                  <span className="block font-semibold mb-2">{item.passage?.reference || 'Passage'}</span>
                  <span>{item.content || item.label || item.passage?.text}</span><span className="block text-xs underline mt-2">Go to passage</span>
                </button>
                {drawer === 'notes' && <button aria-label="Edit Note" className={buttonClass} onClick={() => editNote(item.passage || { id: item.passageId }, item)}><Pencil size={16} /></button>}
                <button aria-label={drawer === 'notes' ? 'Delete Note' : 'Delete Bookmark'} disabled={Boolean(busy)} className={buttonClass} onClick={() => runAction(item.id, async () => {
                  if (drawer === 'notes') { await api.removeNote(item.id); setNotes(items => items.filter(note => note.id !== item.id)); }
                  else { await api.removeBookmark(item.id); setBookmarks(items => items.filter(bookmark => bookmark.id !== item.id)); }
                  setNotice(drawer === 'notes' ? 'Note deleted' : 'Bookmark removed');
                })}><Trash2 size={16} /></button>
              </div>
            </div>)}
        </aside>
      </div>}
      {noteEditor && <div className="reader-overlay">
        <form role="dialog" aria-modal="true" aria-label="Edit private note" className="reader-note-editor" onSubmit={saveNote}>
          <div className="flex items-center justify-between mb-4"><h2>Note · {noteEditor.passage.reference}</h2><button type="button" aria-label="Close note" onClick={() => setNoteEditor(null)}><X size={20} /></button></div>
          <label htmlFor="reader-note" className="sr-only">Note text</label>
          <textarea id="reader-note" autoFocus required maxLength={10000} value={noteContent} onChange={event => setNoteContent(event.target.value)} className="reader-control w-full min-h-40 border rounded p-3" />
          <button type="submit" disabled={Boolean(busy) || !noteContent.trim()} className={buttonClass}>{busy === 'note' ? 'Saving…' : 'Save note'}</button>
        </form>
      </div>}
      {notice && <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-stone-900 text-white rounded-xl shadow-xl p-4 max-w-[90vw]">{notice}</div>}
    </div>
  );
}

function selectedText(selection, reflowProse) {
  // CSS reflow collapses newlines visually. Range text retains the exact source
  // whitespace required by passage validation and selected-text AI requests.
  return (reflowProse && selection?.rangeCount
    ? selection.getRangeAt(0).toString()
    : selection?.toString())?.trim();
}
