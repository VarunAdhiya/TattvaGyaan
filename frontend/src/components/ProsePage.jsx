import { familyTreeNodes } from '../lib/mahabharataLayout';

export default function ProsePage({ page, layout, focusedPassage, onSelect, onSummarize }) {
  function text(part) {
    return <span key={`${part.passage.id}-${part.start}`} id={`text-${part.passage.id}-${part.start}`}
      data-passage-id={part.passage.id} data-source-start={part.start} data-source-end={part.end}
      className={'scripture-text' + (focusedPassage === part.passage.id ? ' book-focused-passage' : '')}
      onMouseUp={event => onSelect(part.passage, event.currentTarget)}
      onTouchEnd={event => onSelect(part.passage, event.currentTarget)}
      onKeyUp={event => onSelect(part.passage, event.currentTarget)}>
      {part.passage.text.slice(part.start, part.end)}
    </span>;
  }
  return <div className="book-page-content font-indic" lang="hi" dir="ltr">
    {page.blocks.map((block, index) => block.kind === 'heading'
      ? <div key={index} className="book-chapter-heading" style={{ height: layout.fontSize * 1.9 * 1.5 }}>
        <h3 title={block.title}>{block.title}</h3>
        <button type="button" onClick={() => onSummarize(block.sectionId)} aria-label={`Summarize ${block.title}`}>Summarize Section</button>
      </div>
      : block.kind === 'tree'
      ? <figure key={index} className="book-family-tree" aria-label="कुरुवंश का वंश-वृक्ष — मूल पुस्तक, पृष्ठ 6"
        style={{ height: layout.treeHeight, fontSize: Math.min(layout.fontSize, Math.max(12, layout.width / 28)) }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M40 17V22H12V25 M40 22H62V25 M12 34V38 M62 34V39H36V44 M62 39H80V44 M80 59V63H51V65 M80 63H87V65 M51 73V77 M87 73V77 M51 85V89 M87 85V89" />
        </svg>
        {familyTreeNodes(block.parts.map(part => part.passage)).map((part, nodeIndex) =>
          <div key={nodeIndex} className="book-tree-label" style={{ left: `${part.x}%`, top: `${part.y}%` }}>{text(part)}</div>)}
      </figure>
      : <p key={index} className={'book-paragraph' + (block.continued ? ' book-paragraph-continued' : '')}>
        {block.parts.map((part, partIndex) => <span key={`${part.passage.id}-${part.start}`}>
          {partIndex > 0 && !block.parts[partIndex - 1].passage.text.trimEnd().endsWith('-') ? ' ' : ''}{text(part)}
        </span>)}
      </p>)}
  </div>;
}
