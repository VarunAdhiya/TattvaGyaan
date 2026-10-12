import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Reader3D from '../components/Reader3D';
import AIAssistantDrawer from '../components/AIAssistantDrawer';
import { api } from '../api/client';

export default function ReaderPage() {
  const { editionId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState(null);
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiContext, setAiContext] = useState({
    selectedPassage: null,
    sectionToSummarize: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadContent() {
      setLoading(true);
      setError(null);
      try {
        const [editionRes, readerRes, progressRes] = await Promise.all([
          api.getEdition(editionId),
          api.getReaderContent(editionId),
          api.getProgressForEdition(editionId).catch(() => ({ progress: null })),
        ]);
        if (cancelled) return;
        setEdition(editionRes.edition);
        setSections(readerRes.sections);
        setProgress(progressRes.progress);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load reader');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadContent();
    return () => { cancelled = true; };
  }, [editionId]);

  const handleUpdateProgress = async (progressData) => {
    try {
      await api.updateProgress({
        editionId,
        ...progressData,
      });
    } catch (err) {
      console.error('Failed to save progress', err);
    }
  };

  const handleAskAI = (passage) => {
    setAiContext({ selectedPassage: passage, sectionToSummarize: null });
    setAiDrawerOpen(true);
  };

  const handleSummarize = (sectionId) => {
    setAiContext({ selectedPassage: null, sectionToSummarize: { id: sectionId } });
    setAiDrawerOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (error || !edition) return <div className="p-8 text-center" role="alert">{error || 'Edition not found'}</div>;

  return (
    <div className="flex flex-col">
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
      {aiDrawerOpen && <AIAssistantDrawer
        key={`${editionId}-${aiContext.selectedPassage?.id || aiContext.sectionToSummarize?.id}-${aiContext.selectedPassage?.selectedText || ''}`}
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        edition={edition}
        selectedPassage={aiContext.selectedPassage}
        sectionToSummarize={aiContext.sectionToSummarize}
      />}
    </div>
  );
}
