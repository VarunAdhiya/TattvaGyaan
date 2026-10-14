import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { BookOpen, ArrowLeft, Clock, Globe, Calendar, AlertCircle } from 'lucide-react';
import CreateReadingPlanModal from '../components/CreateReadingPlanModal';

export default function ScriptureDetail() {
  const { scriptureId } = useParams();
  const navigate = useNavigate();
  const [scripture, setScripture] = useState(null);
  const [editions, setEditions] = useState([]);
  const [selectedEdition, setSelectedEdition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    async function loadScripture() {
      try {
        setLoading(true);
        const scriptureData = await api.getScripture(scriptureId);
        setScripture(scriptureData.scripture);

        const editionsData = await api.getScriptureEditions(scriptureId);
        setEditions(editionsData.editions || []);
        if (editionsData.editions?.length > 0) {
          setSelectedEdition(editionsData.editions[0]);
        }
      } catch (err) {
        setError(err.message || 'Failed to load scripture');
      } finally {
        setLoading(false);
      }
    }

    if (scriptureId) loadScripture();
  }, [scriptureId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-amber-700 mx-auto mb-4 animate-bounce" />
          <p className="text-stone-600">Loading scripture...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-rose-200">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
          <h1 className="text-xl font-serif font-bold text-stone-900 mb-2 text-center">Error</h1>
          <p className="text-stone-600 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 rounded-lg font-medium hover:from-amber-800 hover:to-amber-950 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!scripture) {
    return null;
  }

  const startReading = () => {
    if (!selectedEdition) {
      setError('Please select an edition');
      return;
    }
    navigate(`/reader/${scripture.id}/${selectedEdition.id}`);
  };

  const statusColor = {
    complete: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-800',
    metadata_only: 'bg-stone-200 text-stone-800',
  };

  const statusLabel = {
    complete: 'Complete',
    partial: 'Partial',
    metadata_only: 'Metadata Only',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-amber-50/50">
      {/* Header */}
      <div className="border-b border-stone-200/80 bg-white/50 backdrop-blur sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold text-stone-900">{scripture.title}</h1>
            <p className="text-sm text-stone-500">{scripture.originalLang}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Scripture Info */}
          <div className="md:col-span-2">
            {/* Availability Status */}
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-6 ${statusColor[scripture.availabilityStatus]}`}>
              {statusLabel[scripture.availabilityStatus]}
            </div>

            {/* Description */}
            {scripture.description && (
              <div className="mb-8">
                <h2 className="text-lg font-serif font-bold text-stone-900 mb-3">About</h2>
                <p className="text-stone-700 leading-relaxed">{scripture.description}</p>
              </div>
            )}

            {/* Summary */}
            {scripture.summary && (
              <div className="mb-8 p-6 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                <h2 className="text-lg font-serif font-bold text-stone-900 mb-3">Overview</h2>
                <p className="text-stone-700 leading-relaxed text-sm">{scripture.summary}</p>
              </div>
            )}

            {/* Themes */}
            {scripture.themes && scripture.themes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-serif font-bold text-stone-900 mb-3">Key Themes</h2>
                <div className="flex flex-wrap gap-2">
                  {scripture.themes.map((theme) => (
                    <span
                      key={theme}
                      className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded-full text-sm font-medium"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid sm:grid-cols-2 gap-4">
              {scripture.estimatedReadTime && (
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200/80">
                  <Clock className="w-5 h-5 text-amber-700" />
                  <div>
                    <p className="text-xs text-stone-500 font-medium">Est. Reading Time</p>
                    <p className="text-sm font-semibold text-stone-900">
                      {Math.round(scripture.estimatedReadTime / 60)} hours
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-stone-200/80">
                <Globe className="w-5 h-5 text-amber-700" />
                <div>
                  <p className="text-xs text-stone-500 font-medium">Original Language</p>
                  <p className="text-sm font-semibold text-stone-900">{scripture.originalLang}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Edition Selector & CTA */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 sticky top-32">
              <h2 className="text-lg font-serif font-bold text-stone-900 mb-4">Editions</h2>

              {editions.length > 0 ? (
                <>
                  <div className="space-y-2 mb-6">
                    {editions.map((edition) => (
                      <button
                        key={edition.id}
                        onClick={() => setSelectedEdition(edition)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                          selectedEdition?.id === edition.id
                            ? 'border-amber-600 bg-amber-50'
                            : 'border-stone-200 hover:border-amber-300 bg-stone-50/50'
                        }`}
                      >
                        <div className="font-medium text-stone-900">{edition.title}</div>
                        <div className="text-xs text-stone-500 mt-1">
                          {edition.language}
                          {edition.isOriginal && ' • Original'}
                        </div>
                        <div className="text-xs mt-1 text-amber-800">
                          {edition.contentStatus === 'scanned' ? 'Scanned PDF · Partial collection'
                            : edition.contentStatus === 'transcribed' ? `Reviewed transcription · ${edition.expectedPassages} source page${edition.expectedPassages === 1 ? '' : 's'} with text`
                              : edition.contentStatus === 'complete' ? `Complete · ${edition.expectedPassages} passages` : 'Partial sample — completeness unverified'}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedEdition?.source && (/^https?:\/\//.test(selectedEdition.source) || (selectedEdition.contentStatus === 'scanned' && /^\/library\/[a-z0-9][a-z0-9-]*\.pdf$/.test(selectedEdition.source))) && (
                    <p className="text-xs text-stone-600 mb-4"><a className="underline" href={selectedEdition.source} target="_blank" rel="noreferrer">Source and attribution</a>{selectedEdition.translator ? ` · ${selectedEdition.translator}` : ''}</p>
                  )}

                  {selectedEdition?.contentStatus === 'scanned' && (
                    <p className="text-xs text-stone-600 mb-4">Read the original scanned pages in the book reader. Verse selection, notes, bookmarks, AI explanations and reading plans require verified text.</p>
                  )}

                  <button
                    onClick={startReading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 rounded-lg font-semibold hover:from-amber-800 hover:to-amber-950 transition shadow-xs mb-3"
                  >
                    Start Reading
                  </button>

                  <button
                    onClick={() => setShowPlanModal(true)}
                    disabled={selectedEdition?.contentStatus === 'scanned'}
                    title={selectedEdition?.contentStatus === 'scanned' ? 'Reading plans require verified text.' : undefined}
                    className="w-full px-4 py-3 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Reading Plan
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm text-stone-500">No editions available yet</p>
                </div>
              )}

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-stone-200">
                <p className="text-xs text-stone-500 leading-relaxed">
                  This scripture is available in multiple editions and languages. Select an edition above to begin reading.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Reading Plan Modal */}
      {showPlanModal && (
        <CreateReadingPlanModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          onCreated={() => {
            setShowPlanModal(false);
            navigate('/reading-plans');
          }}
          initialReligionId={scripture.religionId}
          initialEditionId={selectedEdition?.id || ''}
          initialTitle={`Read ${scripture.title}`}
        />
      )}
    </div>
  );
}
