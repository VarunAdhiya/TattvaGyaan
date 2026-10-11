import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Reader3D from '../components/Reader3D';
import AIAssistantDrawer from '../components/AIAssistantDrawer';
import { api } from '../api/client';

export default function ReaderPage() {
  const { editionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState(null);
  const [sections, setSections] = useState([]);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiContext, setAiContext] = useState({
    selectedPassage: null,
    sectionToSummarize: null,
  });

  useEffect(() => {
    async function loadContent() {
      try {
        const [editionRes, readerRes] = await Promise.all([
          api.getEdition(editionId),
          api.getReaderContent(editionId),
        ]);
        setEdition(editionRes.edition);
        setSections(readerRes.sections);
      } catch (err) {
        console.error('Failed to load reader', err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Reader3D
        edition={edition}
        sections={sections}
        onProgressUpdate={handleUpdateProgress}
        onAskAI={handleAskAI}
        onSummarize={handleSummarize}
      />
      <AIAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        edition={edition}
        selectedPassage={aiContext.selectedPassage}
        sectionToSummarize={aiContext.sectionToSummarize}
      />
    </div>
  );
}
