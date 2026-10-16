import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Languages,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'sa', name: 'Sanskrit (संस्कृतम्)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
];

export default function AIAssistantDrawer({
  isOpen,
  onClose,
  edition,
  selectedPassage,
  sectionToSummarize,
}) {
  const [activeTab, setActiveTab] = useState(selectedPassage ? 'explain' : 'summarize');
  const [responseLang, setResponseLang] = useState('hi');
  const [style, setStyle] = useState('simple'); // 'simple', 'detailed', 'scholarly'
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState(null);
  const [summary, setSummary] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [copied, setCopied] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const chatEndRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // A new selection mounts a new drawer. Cancel obsolete requests on close/change.
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const request = selectedPassage
      ? api.explainPassage({ passageId: selectedPassage.id, selectedText: selectedPassage.selectedText, responseLang: 'hi', style: 'simple' }, controller.signal)
      : api.summarizeSection({ editionId: edition.id, sectionId: sectionToSummarize?.id, responseLang: 'hi' }, controller.signal);
    const setResult = selectedPassage ? setExplanation : setSummary;
    request.then(result => { if (!controller.signal.aborted) setResult(result.content); })
      .catch(error => { if (!controller.signal.aborted) setResult('Error: ' + error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedPassage, sectionToSummarize, isOpen, edition.id]);

  const handleExplainPassage = async () => {
    if (!selectedPassage) return;
    setLoading(true);
    setExplanation(null);

    try {
      const res = await api.explainPassage({
        passageId: selectedPassage.id,
        selectedText: selectedPassage.selectedText,
        responseLang,
        style,
        question: question.trim() || undefined,
      });
      setExplanation(res.content);
    } catch (err) {
      setExplanation(`Error: ${err.message || 'Failed to generate explanation.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeSection = async () => {
    if (!edition || !sectionToSummarize) return;
    setLoading(true);
    setSummary(null);

    try {
      const res = await api.summarizeSection({
        editionId: edition.id,
        sectionId: sectionToSummarize.id || sectionToSummarize,
        responseLang,
      });
      setSummary(res.content);
    } catch (err) {
      setSummary(`Error: ${err.message || 'Failed to generate summary.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e?.preventDefault();
    if (!question.trim() || loading) return;

    const userQ = question;
    setQuestion('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userQ }]);
    setLoading(true);

    try {
      const res = await api.chatAI({
        question: userQ,
        editionId: edition?.id,
        passageId: selectedPassage?.id,
        selectedText: selectedPassage?.selectedText,
        sectionId: sectionToSummarize?.id || selectedPassage?.sectionId,
        conversationId: conversationId || undefined,
        responseLang,
      });

      setConversationId(res.conversationId);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.content },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message || 'Failed to get answer.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div data-ai-drawer role="dialog" aria-label="Scripture AI assistant" className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-stone-900 text-stone-100 shadow-2xl flex flex-col font-sans border-l border-amber-900/30 animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-amber-100 shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-amber-200 text-base">Scripture AI Assistant</h3>
            <span className="text-[10px] text-stone-400 block font-sans">{selectedPassage?.reference || sectionToSummarize?.title || 'Select a passage or section'}</span>
          </div>
        </div>

        <button onClick={onClose} className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 bg-stone-900 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('explain')}
          className={`flex-1 py-3 text-center border-b-2 transition ${
            activeTab === 'explain'
              ? 'border-amber-500 text-amber-300 bg-stone-800/50'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Passage Explanation
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-center border-b-2 transition ${
            activeTab === 'chat'
              ? 'border-amber-500 text-amber-300 bg-stone-800/50'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Ask Questions
        </button>
        <button
          onClick={() => setActiveTab('summarize')}
          className={`flex-1 py-3 text-center border-b-2 transition ${
            activeTab === 'summarize'
              ? 'border-amber-500 text-amber-300 bg-stone-800/50'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          Section Summary
        </button>
      </div>

      {/* Controls Bar */}
      <div className="p-3 bg-stone-950/60 border-b border-stone-800/80 flex items-center justify-between text-xs">
        {/* Language Selector */}
        <div className="flex items-center gap-1.5 text-stone-300">
          <Languages className="w-4 h-4 text-amber-500" />
          <select
            value={responseLang}
            onChange={(e) => setResponseLang(e.target.value)}
            className="bg-stone-800 border border-stone-700 text-stone-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Style Selector (for explanation) */}
        {activeTab === 'explain' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-400">Style:</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="bg-stone-800 border border-stone-700 text-stone-200 rounded px-2 py-1 text-[11px]"
            >
              <option value="simple">Simple</option>
              <option value="detailed">Detailed</option>
              <option value="scholarly">Scholarly</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Grounding Disclaimer */}
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-3 text-[11px] text-amber-200/80 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            AI responses are generated as explanatory material based on retrieved source passages. Original texts remain unchanged.
          </p>
        </div>

        {/* TAB 1: EXPLAIN PASSAGE */}
        {activeTab === 'explain' && (
          <div className="space-y-4">
            {selectedPassage ? (
              <div className="p-3 bg-stone-800/70 rounded-lg border border-stone-700">
                <span className="text-xs font-bold text-amber-400 block mb-1">
                  Selected Verse: {selectedPassage.reference}
                </span>
                <p className="text-sm font-serif italic text-stone-200">
                  "{selectedPassage.selectedText || selectedPassage.text}"
                </p>
              </div>
            ) : (
              <div className="text-center py-6 text-stone-400 text-xs font-serif">
                Select any verse in the reader to view its AI explanation.
              </div>
            )}

            {/* Custom question prompt */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask specific question about this verse..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 bg-stone-800 text-stone-100 text-xs px-3 py-2 rounded-lg border border-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={handleExplainPassage}
                disabled={loading || !selectedPassage}
                className="px-3 py-2 bg-amber-700 text-amber-50 rounded-lg text-xs font-semibold hover:bg-amber-800 disabled:opacity-50 transition"
              >
                Explain
              </button>
            </div>

            {/* Explanation Result */}
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-amber-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="text-xs font-serif">Consulting AI model with source grounding...</span>
              </div>
            ) : explanation ? (
              <div className="bg-stone-800 rounded-xl p-4 border border-stone-700/80 text-sm leading-relaxed space-y-3 font-serif">
                <div className="flex items-center justify-between border-b border-stone-700 pb-2">
                  <span className="text-xs font-sans font-bold text-amber-400">Explanatory Commentary</span>
                  <button
                    onClick={() => handleCopy(explanation)}
                    className="text-xs text-stone-400 hover:text-white flex items-center gap-1 font-sans"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-stone-200 whitespace-pre-wrap">{explanation}</div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full justify-between space-y-4">
            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-xs">
                  <HelpCircle className="w-8 h-8 text-amber-500/50 mx-auto mb-2" />
                  <p className="font-serif">Ask about the selected passage or section. Answers use this source text.</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setQuestion('What are the main ideas in this selected text?')}
                      className="text-[11px] bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded-full border border-stone-700"
                    >
                      Core themes?
                    </button>
                    <button
                      onClick={() => setQuestion('Explain this in simple terms for a beginner.')}
                      className="text-[11px] bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded-full border border-stone-700"
                    >
                      Beginner summary?
                    </button>
                  </div>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-900/40 text-amber-100 border border-amber-800/40 ml-auto'
                      : 'bg-stone-800 text-stone-200 border border-stone-700 mr-auto font-serif'
                  }`}
                >
                  <span className="font-sans text-[10px] opacity-60 block font-bold mb-1">
                    {msg.role === 'user' ? 'You' : 'TattvaGyaan AI'}
                  </span>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              {loading && activeTab === 'chat' && (
                <div className="bg-stone-800 text-amber-300 border border-stone-700 mr-auto p-3 rounded-xl text-xs flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Thinking & searching sacred scriptures...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-stone-800">
              <input
                type="text"
                placeholder="Ask follow-up question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 bg-stone-800 text-stone-100 text-xs px-3 py-2.5 rounded-lg border border-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-3.5 py-2.5 bg-amber-700 text-amber-50 rounded-lg text-xs font-semibold hover:bg-amber-800 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: SECTION SUMMARY */}
        {activeTab === 'summarize' && (
          <div className="space-y-4">
            <button
              onClick={handleSummarizeSection}
              disabled={loading || !sectionToSummarize}
              className="w-full py-2.5 bg-amber-800 text-amber-50 rounded-lg text-xs font-semibold hover:bg-amber-900 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Section Summary</span>
            </button>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-amber-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="text-xs font-serif">Synthesizing section passages...</span>
              </div>
            ) : summary ? (
              <div className="bg-stone-800 rounded-xl p-4 border border-stone-700 text-sm leading-relaxed font-serif space-y-3">
                <div className="flex items-center justify-between border-b border-stone-700 pb-2 font-sans">
                  <span className="text-xs font-bold text-amber-400">Section Overview</span>
                  <button
                    onClick={() => handleCopy(summary)}
                    className="text-xs text-stone-400 hover:text-white flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-stone-200 whitespace-pre-wrap">{summary}</div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
