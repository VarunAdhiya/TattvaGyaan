import { useRef } from 'react';
import { BookOpen, Bookmark, MessageSquare, Sparkles, X } from 'lucide-react';
import useDialogFocus from '../lib/useDialogFocus';

export default function ReaderPassagePanel({ edition, passage, passages, onSelect, onClose, bookmarks, busy, onBookmark, onNote, onAsk }) {
  const ref = useRef(null);
  useDialogFocus(ref);
  const originalTitle = edition.scripture?.title || edition.title;
  const title = /^ramayan(a)?$/i.test(originalTitle) ? 'रामायण' : originalTitle;
  const marked = bookmarks.some(item => item.passageId === passage?.id);

  return <div className="reader-notebook-overlay passage-overlay" onClick={onClose}>
    <aside ref={ref} role="dialog" aria-modal="true" aria-label="passage" className="reader-notebook passage-panel" onClick={event => event.stopPropagation()}>
      <header className="notebook-header">
        <BookOpen size={27} strokeWidth={1.5} aria-hidden="true" />
        <div><h2>{title === 'रामायण' ? 'Ramayana' : title}</h2><p>Your reading companion</p></div>
        <button data-panel-close aria-label="Close panel" className="notebook-icon" onClick={onClose}><X size={22} /></button>
      </header>
      {passage && <>
        <div className="notebook-tools passage-tools">
          <div className="notebook-section-heading"><h3>Passage</h3></div>
          <label htmlFor="book-tool-passage">Passage on this page</label>
          <select id="book-tool-passage" value={passage.id} onChange={event => onSelect(passages.find(item => item.id === event.target.value))}>
            {passages.map(item => <option key={item.id} value={item.id}>{item.reference} · {item.text.slice(0, 45).replace(/\s+/g, ' ')}…</option>)}
          </select>
        </div>
        <div className="passage-actions" aria-label="Passage actions">
          <button disabled={busy} aria-label={marked ? 'Remove bookmark' : 'Bookmark verse'} aria-pressed={marked} onClick={() => onBookmark(passage)}><Bookmark size={17} fill={marked ? 'currentColor' : 'none'} />{marked ? 'Saved' : 'Bookmark'}</button>
          <button aria-label="Add or edit note" onClick={onNote}><MessageSquare size={17} />Note</button>
          <button onClick={onAsk}><Sparkles size={17} />Ask AI</button>
        </div>
        <div className="notebook-body passage-body">
          <p className="font-indic passage-text" dir={edition.textDirection || 'ltr'} lang={edition.language}>{passage.text}</p>
          {passage.sourceNotes && <details className="passage-source"><summary>Source notes</summary><p>{passage.sourceNotes}</p></details>}
        </div>
      </>}
      <footer className="notebook-footer">Private to you · Saved with {title}</footer>
    </aside>
  </div>;
}
