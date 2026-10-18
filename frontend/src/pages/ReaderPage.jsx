import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Reader3D from '../components/Reader3D';
import AIAssistantDrawer from '../components/AIAssistantDrawer';
import { api } from '../api/client';
import { requiresBookLayout, isTypesetBook } from '../lib/mahabharataLayout';


export default function ReaderPage() {
  const { editionId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState(null);
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState('');
  const progressQueue = React.useRef(Promise.resolve());
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiContext, setAiContext] = useState({
    selectedPassage: null,
    sectionToSummarize: null,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadContent() {
      setLoading(true);
      setError(null);
      try {
        const editionRes = await api.getEdition(editionId);
        if (cancelled) return;
        setEdition(editionRes.edition);
        const [readerRes, progressRes] = await Promise.all([
          api.getReaderContent(editionId),
          api.getProgressForEdition(editionId).catch(() => ({ progress: null })),
        ]);
        if (cancelled) return;
        const bookSections = isTypesetBook(editionRes.edition)
          ? await api.getBookSections(readerRes.sections, controller.signal) : readerRes.sections;
        if (requiresBookLayout(editionRes.edition) && bookSections.some(section => !Array.isArray(section.readerBlocks))) {
          throw new Error('The reading layout for this edition is unavailable. Please try again shortly.');
        }
        if (cancelled) return;
        setSections(bookSections);
        setProgress(progressRes.progress);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load reader');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadContent();
    return () => { cancelled = true; controller.abort(); };
  }, [editionId]);

  const handleUpdateProgress = useCallback((progressData) => {
    // Serialize saves so a slower, older request cannot replace newer progress.
    progressQueue.current = progressQueue.current.then(() => api.updateProgress({ editionId, ...progressData }))
      .then(() => setSaveError(''))
      .catch(() => setSaveError('Reading position could not be saved. It will retry when you turn a page.'));
  }, [editionId]);

  const handleAskAI = (passage) => {
    const section = sections.find(item => item.id === passage.sectionId);
    setAiContext({ selectedPassage: passage, sectionToSummarize: section ? { id: section.id, title: section.title } : null });
    setAiDrawerOpen(true);
  };

  const handleSummarize = (sectionId, chapterKey, title) => {
    setAiContext({ selectedPassage: null, sectionToSummarize: { id: sectionId, chapterKey, title: title || sections.find(item => item.id === sectionId)?.title } });
    setAiDrawerOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error || !edition) return <div className="p-8 text-center" role="alert">{error || 'Edition not found'}</div>;

  return (
    <div className="flex flex-col">
      {saveError && <p role="alert" className="p-3 text-sm text-amber-900 bg-amber-50">{saveError}</p>}
      <React.Suspense fallback={<div className="reader-shell theme-light items-center justify-center" role="status">Opening book…</div>}>
        <Reader3D
          key={`${editionId}-${searchParams.get('passage') || ''}-${searchParams.get('page') || ''}`}
          edition={edition}
          sections={sections}
          initialPassageId={searchParams.get('passage') || (!searchParams.has('page') ? progress?.passageId : undefined)}
          initialPageIndex={searchParams.has('page') ? Math.max(0, (Number(searchParams.get('page')) || 1) - 1) : progress?.pageIndex ?? 1}
          onProgressUpdate={handleUpdateProgress}
          onAskAI={handleAskAI}
          onSummarize={handleSummarize}
        />
      </React.Suspense>
      {aiDrawerOpen && <AIAssistantDrawer
        key={`${editionId}-${aiContext.selectedPassage?.id || aiContext.sectionToSummarize?.id}-${aiContext.sectionToSummarize?.chapterKey || ''}-${aiContext.selectedPassage?.selectedText || ''}`}
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        edition={edition}
        selectedPassage={aiContext.selectedPassage}
        sectionToSummarize={aiContext.sectionToSummarize}
      />}
    </div>
  );
}
