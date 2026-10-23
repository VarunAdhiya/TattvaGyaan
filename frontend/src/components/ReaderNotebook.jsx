import { useEffect, useRef, useState } from 'react';
import { BookOpen, Bookmark, StickyNote, List, Search, X, Pencil, Trash2, ArrowRight, ChevronRight } from 'lucide-react';
import '../reader-notebook.css';

const PANELS = [{ id: 'contents', label: 'Contents', Icon: List }, { id: 'bookmarks', label: 'Bookmarks', Icon: Bookmark }, { id: 'notes', label: 'Notes', Icon: StickyNote }];
const PAPER = ['#f2dfa5', '#edc9b5', '#e5d5c5'];
const paperFor = id => PAPER[Array.from(id || '').reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % PAPER.length];

function useDialogFocus(ref) {
  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.querySelector('[data-panel-close]')?.focus({ preventScroll: true });
    const trap = event => {
      if (event.key !== 'Tab') return;
      const items = [...node.querySelectorAll('button:not(:disabled), input, textarea, select, [tabindex="0"]')]
        .filter(item => item.getClientRects().length);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    node.addEventListener('keydown', trap);
    return () => {
      node.removeEventListener('keydown', trap);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref]);
}

export default function ReaderNotebook({ panel, onPanelChange, onClose, edition, contents, currentPage,
  bookmarks, notes, loading, error, onRetry, busy, onSection, onPassage, onEdit, onDelete }) {
  const ref = useRef(null);
  const [search, setSearch] = useState('');
  useDialogFocus(ref);
  const title = edition.scripture?.title || edition.title;
  const query = search.trim().normalize('NFKC').toLocaleLowerCase();
  const source = panel === 'contents' ? contents : panel === 'notes' ? notes : bookmarks;
  const filtered = source.filter(item => [item.title, item.label, item.content, item.passage?.reference, item.passage?.text]
    .filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase().includes(query));
  const activeSection = contents.filter(item => item.pageIndex >= 0 && item.pageIndex <= currentPage)
    .reduce((last, item) => !last || item.pageIndex >= last.pageIndex ? item : last, null);
  const heading = PANELS.find(item => item.id === panel).label;
  const itemLabel = panel === 'contents' ? 'section' : panel === 'notes' ? 'note' : 'bookmark';
  const changePanel = id => { setSearch(''); onPanelChange(id); };

  return <div className="reader-notebook-overlay" onClick={onClose}>
    <aside ref={ref} id="reader-notebook" role="dialog" aria-modal="true" aria-label={panel} className="reader-notebook" onClick={event => event.stopPropagation()}>
      <header className="notebook-header">
        <BookOpen size={27} strokeWidth={1.5} aria-hidden="true" />
        <div><h2>{title}</h2><p>Your reading companion</p></div>
        <button data-panel-close aria-label="Close panel" className="notebook-icon" onClick={onClose}><X size={22} /></button>
      </header>
      <nav className="notebook-tabs" aria-label="Book tools">
        {PANELS.map(({ id, label, Icon }) => <button key={id} aria-pressed={panel === id} onClick={() => changePanel(id)}>
          <Icon size={17} aria-hidden="true" />{label}
        </button>)}
      </nav>
      <div className="notebook-tools">
        <div className="notebook-section-heading"><h3>{heading}</h3><span>{loading && panel !== 'contents' ? 'Loading…' : `${source.length} ${itemLabel}${source.length === 1 ? '' : 's'}`} · this book</span></div>
        <label className="notebook-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search {panel}</span>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={panel === 'contents' ? 'Find a chapter…' : `Find in your ${panel}…`} />
        </label>
      </div>
      <div className="notebook-body">
        {panel !== 'contents' && error ? <div role="alert" className="notebook-empty"><p>{error}</p><button onClick={onRetry}>Retry notes and bookmarks</button></div>
          : panel !== 'contents' && loading ? <p role="status" className="notebook-empty">Opening your saved passages…</p>
          : !filtered.length ? <div className="notebook-empty">
            {panel === 'notes' ? <StickyNote size={32} /> : panel === 'bookmarks' ? <Bookmark size={32} /> : <Search size={32} />}
            <h4>{query ? 'No matches in this book.' : panel === 'contents' ? 'No sections available yet.' : `No ${panel} saved yet.`}</h4>
            <p>{query ? 'Try a different word or passage reference.' : panel === 'notes' ? 'Add a note to a passage as you read. Your reflections will stay together here.' : 'Save a passage in the reader to return to it here.'}</p>
          </div>
          : panel === 'contents' ? <ol className="notebook-contents">
            {filtered.map(section => <li key={section.id}><button disabled={section.pageIndex < 0} aria-current={section.id === activeSection?.id ? 'location' : undefined} onClick={() => onSection(section)}>
              <span className="notebook-chapter-title">{section.title}{section.id === activeSection?.id && <small>Currently reading</small>}</span>
              <span className="notebook-page">{section.pageIndex >= 0 ? <><small>Page</small>{section.pageIndex + 1}</> : 'Unavailable'}</span><ChevronRight size={16} aria-hidden="true" />
            </button></li>)}
          </ol> : <div className={`notebook-saved notebook-saved--${panel}`}>
            {filtered.map(item => <article key={item.id} className={'reader-saved-item ' + (panel === 'notes' ? 'notebook-sticky' : 'notebook-bookmark')}
              style={panel === 'notes' ? { '--note-paper': paperFor(item.id) } : undefined}>
              <div className="notebook-item-top"><span className="reader-saved-reference">{item.passage?.reference || item.label || 'Passage'}</span>
                <div className="reader-saved-actions">
                  {panel === 'notes' && <button aria-label="Edit Note" disabled={busy} onClick={() => onEdit(item.passage || { id: item.passageId }, item)}><Pencil size={16} /></button>}
                  <button aria-label={panel === 'notes' ? 'Delete Note' : 'Delete Bookmark'} disabled={busy} onClick={() => onDelete(item, panel)}><Trash2 size={16} /></button>
                </div>
              </div>
              <button className="reader-saved-link" onClick={() => onPassage(item.passageId, item.passage)}>
                {panel === 'notes' && <span className="reader-saved-note" dir="auto">{item.content}</span>}
                <span className="reader-saved-excerpt" lang={item.passage?.section?.edition?.language || edition.language}
                  dir={item.passage?.section?.edition?.textDirection || edition.textDirection || 'ltr'}>{item.passage?.text || 'Open passage to read the verse.'}</span>
                <span className="reader-saved-open">Go to passage <ArrowRight size={16} aria-hidden="true" /></span>
              </button>
            </article>)}
          </div>}
      </div>
      <footer className="notebook-footer">{panel === 'contents' ? 'Choose a chapter to continue reading.' : `Private to you · Saved with ${title}`}</footer>
    </aside>
  </div>;
}

export function ReaderNoteEditor({ editor, edition, content, onContentChange, onClose, onSave, busy }) {
  const ref = useRef(null);
  useDialogFocus(ref);
  return <div className="reader-note-overlay">
    <form ref={ref} role="dialog" aria-modal="true" aria-label="Edit private note" className="reader-note-sheet" onSubmit={onSave}>
      <header><div><h2>{editor.note ? 'Your reflection' : 'A moment to reflect'}</h2><p>{edition.scripture?.title || edition.title} · {editor.passage.reference || 'Selected passage'}</p></div>
        <button data-panel-close type="button" aria-label="Close note" disabled={busy} onClick={onClose}><X size={21} /></button>
      </header>
      {editor.passage.text && <blockquote dir="auto">{editor.passage.text}</blockquote>}
      <label htmlFor="reader-note">Note text</label>
      <textarea id="reader-note" required maxLength={10000} value={content} disabled={busy} onChange={event => onContentChange(event.target.value)} placeholder="What stays with you from this passage?" />
      <footer><span>Only you can see this note.</span><button type="submit" disabled={busy || !content.trim()}>{busy ? 'Saving…' : 'Save note'}<ArrowRight size={17} aria-hidden="true" /></button></footer>
    </form>
  </div>;
}

