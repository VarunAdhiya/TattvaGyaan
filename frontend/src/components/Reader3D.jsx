import React, { useState, useEffect, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Coffee,
  Type,
  BookOpen,
  Search,
  List,
  Sparkles,
  Bookmark,
  MessageSquare,
  Maximize2,
  Minimize2,
  X,
  Trash2,
  Check
} from 'lucide-react';
import { api } from '../api/client';

export default function Reader3D({
  edition,
  sections,
  initialPageIndex = 0,
  onProgressUpdate,
  onAskAI,
  onSummarize,
}) {
  const flipBookRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(initialPageIndex);
  const [totalPages, setTotalPages] = useState(0);
  const [theme, setTheme] = useState('light'); // light, sepia, dark
  const [fontSize, setFontSize] = useState(18); // px
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showTOC, setShowTOC] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [userBookmarks, setUserBookmarks] = useState([]);
  const [userNotes, setUserNotes] = useState([]);
  const [userHighlights, setUserHighlights] = useState([]);
  const [noteContent, setNoteContent] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [bookSize, setBookSize] = useState('medium'); // small, medium, large

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Two-page spread (left + right) on wide screens; single page on mobile
  const [isWideScreen, setIsWideScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => setIsWideScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Flatten all sections and passages into paginated pages
  // Each page will contain 1-3 passages depending on length
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (!sections || sections.length === 0) return;

    const computedPages = [];

    // Page 0: Cover / Title Page
    computedPages.push({
      type: 'cover',
      title: edition.scripture?.title || edition.title,
      language: edition.language,
      translator: edition.translator,
      license: edition.license,
      provenance: edition.provenance,
    });

    // Page 1: Table of Contents (indices filled in after content pages are built).
    // Inserted up front so content-page indices already account for it.
    const tocItems = sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      slug: sec.slug,
      pageIndex: 0, // placeholder — computed below
    }));
    computedPages.push({
      type: 'toc',
      title: 'Table of Contents',
      items: tocItems,
    });

    // Content Pages — track the real page index where each section starts
    const sectionStartPages = new Map();
    let currentSectionTitle = '';
    let currentSectionId = '';

    sections.forEach((sec) => {
      currentSectionTitle = sec.title;
      currentSectionId = sec.id;

      if (!sec.passages || sec.passages.length === 0) {
        return;
      }

      const sectionStartPage = computedPages.length;
      if (!sectionStartPages.has(sec.id)) {
        sectionStartPages.set(sec.id, sectionStartPage);
      }

      // Group 2 passages per page for optimal reader spread
      for (let i = 0; i < sec.passages.length; i += 2) {
        const passageGroup = sec.passages.slice(i, i + 2);
        computedPages.push({
          type: 'content',
          sectionTitle: currentSectionTitle,
          sectionId: currentSectionId,
          passages: passageGroup,
        });
      }
    });

    // Now that content pages exist, point each TOC entry at its section's first page
    tocItems.forEach((item) => {
      item.pageIndex = sectionStartPages.get(item.id) ?? computedPages.length - 1;
    });

    setPages(computedPages);
    setTotalPages(computedPages.length);
  }, [sections, edition]);

  // Load user bookmarks & notes
  useEffect(() => {
    async function loadUserData() {
      try {
        const [bmRes, noteRes, hlRes] = await Promise.all([
          api.getBookmarks(),
          api.getNotes(),
          api.getHighlights(edition.id),
        ]);
        setUserBookmarks(bmRes.bookmarks || []);
        setUserNotes(noteRes.notes || []);
        setUserHighlights(hlRes.highlights || []);
      } catch (err) {
        console.error('Failed to load reader user data', err);
      }
    }
    loadUserData();
  }, [edition.id]);

  // FlipBook event listener
  const onPage = (e) => {
    const pageNum = e.data;
    setCurrentPage(pageNum);

    if (onProgressUpdate && pages[pageNum]) {
      const pageData = pages[pageNum];
      const sectionId = pageData.sectionId;
      const passageId = pageData.passages?.[0]?.id;
      const percentage = totalPages > 0 ? Math.round((pageNum / (totalPages - 1)) * 100) : 0;

      onProgressUpdate({
        pageIndex: pageNum,
        sectionId,
        passageId,
        percentage,
      });
    }
  };

  const goToPage = (pageIdx) => {
    if (pageIdx === undefined || pageIdx === null) return;
    const target = Math.max(0, Math.min(pageIdx, totalPages - 1));
    setCurrentPage(target);
    setShowTOC(false);
    setShowSearch(false);
    setShowBookmarksDrawer(false);
    setShowNotesDrawer(false);

    if (flipBookRef.current) {
      try {
        const pageFlip = flipBookRef.current.pageFlip();
        if (pageFlip) {
          if (typeof pageFlip.turnToPage === 'function') {
            pageFlip.turnToPage(target);
          } else if (typeof pageFlip.flip === 'function') {
            pageFlip.flip(target);
          }
        }
      } catch (err) {
        console.error('Error navigating to page:', err);
      }
    }
  };

  const findPageForPassage = (passageId) => {
    if (!passageId || !pages.length) return -1;
    return pages.findIndex((p) => p.type === 'content' && p.passages?.some((pas) => pas.id === passageId));
  };

  const handleJumpToPassage = (passageId, passageObj = null) => {
    const pageIdx = findPageForPassage(passageId);
    if (pageIdx !== -1) {
      goToPage(pageIdx);
      if (passageObj) {
        setSelectedPassage(passageObj);
      }
    } else {
      showToast('Passage is in another section or not loaded in current view');
    }
  };

  // Search inside scripture
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const queryLower = searchQuery.toLowerCase();
    const results = [];

    pages.forEach((page, pageIdx) => {
      if (page.type === 'content' && page.passages) {
        page.passages.forEach((p) => {
          if (p.text.toLowerCase().includes(queryLower) || p.reference.toLowerCase().includes(queryLower)) {
            results.push({
              pageIndex: pageIdx,
              reference: p.reference,
              text: p.text,
              sectionTitle: page.sectionTitle,
              passage: p,
            });
          }
        });
      }
    });

    setSearchResults(results);
  };

  // Fullscreen functionality
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      }).catch(err => {
        console.error('Failed to exit fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Book size configurations
  const sizeConfigs = {
    small: { width: 500, height: 650 },
    medium: { width: 650, height: 850 },
    large: { width: 800, height: 1000 }
  };

  const currentSizeConfig = sizeConfigs[bookSize];

  // Prevent text selection from triggering page turns
  const handleMouseDown = (e) => {
    e.stopPropagation();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        flipBookRef.current?.pageFlip()?.flipNext();
      } else if (e.key === 'ArrowLeft') {
        flipBookRef.current?.pageFlip()?.flipPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle bookmark (add if not present, delete if already present)
  const handleToggleBookmark = async (passage) => {
    try {
      const existing = userBookmarks.find((b) => b.passageId === passage.id);
      if (existing) {
        await api.removeBookmark(existing.id);
        setUserBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
        showToast(`Removed bookmark for ${passage.reference}`);
      } else {
        const res = await api.addBookmark(passage.id, `Bookmark: ${passage.reference}`);
        setUserBookmarks((prev) => [...prev, { ...res.bookmark, passage }]);
        showToast(`Bookmarked ${passage.reference}`);
      }
    } catch (err) {
      showToast(err.message || 'Bookmark action failed');
    }
  };

  const handleDeleteBookmark = async (bookmarkId, e) => {
    e?.stopPropagation();
    try {
      await api.removeBookmark(bookmarkId);
      setUserBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      showToast('Bookmark removed');
    } catch (err) {
      showToast(err.message || 'Failed to remove bookmark');
    }
  };

  const handleSaveNote = async () => {
    if (!selectedPassage || !noteContent.trim()) return;
    try {
      const res = await api.addNote(selectedPassage.id, noteContent);
      setUserNotes((prev) => [...prev, { ...res.note, passage: selectedPassage }]);
      setNoteContent('');
      setShowNoteModal(false);
      showToast('Note saved successfully');
    } catch (err) {
      showToast(err.message || 'Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId, e) => {
    e?.stopPropagation();
    try {
      await api.removeNote(noteId);
      setUserNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast('Note deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete note');
    }
  };

  const isRTL = edition.textDirection === 'rtl';
  const isIndic = ['sa', 'hi', 'mr', 'pa', 'pra', 'san'].includes(edition.language.toLowerCase()) || edition.script === 'devanagari';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark' ? 'theme-dark bg-zinc-950 text-zinc-100' : theme === 'sepia' ? 'theme-sepia bg-[#f4ecd8] text-[#432818]' : 'theme-light bg-stone-100 text-stone-900'
    }`}>
      {/* Top Controls Toolbar */}
      <header className="sticky top-0 z-30 px-4 py-3 border-b flex items-center justify-between backdrop-blur-md bg-opacity-90 border-stone-300/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowTOC(!showTOC)}
            className="p-2 rounded-lg hover:bg-black/10 transition flex items-center gap-1.5 text-xs font-semibold"
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Contents</span>
          </button>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg hover:bg-black/10 transition flex items-center gap-1.5 text-xs font-semibold"
            title="Search Text"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>

          <button
            onClick={() => {
              setShowBookmarksDrawer(!showBookmarksDrawer);
              setShowNotesDrawer(false);
              setShowTOC(false);
              setShowSearch(false);
            }}
            className="p-2 rounded-lg hover:bg-black/10 transition flex items-center gap-1.5 text-xs font-semibold relative"
            title="View All Bookmarks"
          >
            <Bookmark className={`w-4 h-4 ${userBookmarks.length > 0 ? 'fill-amber-700 text-amber-700' : ''}`} />
            <span className="hidden sm:inline">Bookmarks</span>
            {userBookmarks.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-800 text-amber-50 rounded-full text-[10px] font-bold">
                {userBookmarks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowNotesDrawer(!showNotesDrawer);
              setShowBookmarksDrawer(false);
              setShowTOC(false);
              setShowSearch(false);
            }}
            className="p-2 rounded-lg hover:bg-black/10 transition flex items-center gap-1.5 text-xs font-semibold relative"
            title="View All Notes"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Notes</span>
            {userNotes.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-800 text-amber-50 rounded-full text-[10px] font-bold">
                {userNotes.length}
              </span>
            )}
          </button>
        </div>

        {/* Title */}
        <div className="text-center truncate px-4">
          <h2 className="font-serif font-bold text-sm sm:text-base truncate">
            {edition.scripture?.title || edition.title}
          </h2>
          <span className="text-[10px] opacity-75 uppercase tracking-wider block">
            {edition.language} • {edition.title}
          </span>
        </div>

        {/* Right Settings */}
        <div className="flex items-center gap-2">
          {/* Themes */}
          <div className="flex items-center bg-black/5 rounded-lg p-0.5 border border-black/10">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md ${theme === 'light' ? 'bg-white shadow-xs' : 'opacity-60'}`}
              title="Light theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`p-1.5 rounded-md ${theme === 'sepia' ? 'bg-[#fbf0d9] shadow-xs' : 'opacity-60'}`}
              title="Sepia theme"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md ${theme === 'dark' ? 'bg-zinc-800 text-white shadow-xs' : 'opacity-60'}`}
              title="Dark theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Book Size Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-black/5 rounded-lg px-2 py-1 text-xs">
            <BookOpen className="w-3.5 h-3.5 opacity-60" />
            <button
              onClick={() => setBookSize('small')}
              className={`px-1.5 font-bold hover:bg-black/10 rounded ${bookSize === 'small' ? 'bg-white shadow-xs' : ''}`}
            >
              S
            </button>
            <button
              onClick={() => setBookSize('medium')}
              className={`px-1.5 font-bold hover:bg-black/10 rounded ${bookSize === 'medium' ? 'bg-white shadow-xs' : ''}`}
            >
              M
            </button>
            <button
              onClick={() => setBookSize('large')}
              className={`px-1.5 font-bold hover:bg-black/10 rounded ${bookSize === 'large' ? 'bg-white shadow-xs' : ''}`}
            >
              L
            </button>
          </div>

          {/* Font Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-black/5 rounded-lg px-2 py-1 text-xs">
            <Type className="w-3.5 h-3.5 opacity-60" />
            <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="px-1.5 font-bold hover:bg-black/10 rounded">A-</button>
            <span className="text-[10px] px-1 font-mono">{fontSize}px</span>
            <button onClick={() => setFontSize(Math.min(28, fontSize + 2))} className="px-1.5 font-bold hover:bg-black/10 rounded">A+</button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-lg hover:bg-black/10 transition"
            title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Reading View Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {pages.length > 0 ? (
          <div className="relative shadow-2xl rounded-sm">
            {/* HTMLFlipBook 3D Component */}
            <HTMLFlipBook
              width={currentSizeConfig.width}
              height={currentSizeConfig.height}
              size="stretch"
              minWidth={isFullScreen ? 600 : 350}
              maxWidth={isFullScreen ? 1200 : 900}
              minHeight={isFullScreen ? 700 : 500}
              maxHeight={isFullScreen ? 1400 : 1000}
              maxShadowOpacity={0.6}
              showCover={true}
              mobileScrollSupport={true}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={30}
              onFlip={onPage}
              ref={flipBookRef}
              className="reader-book mx-auto shadow-2xl"
              style={{
                margin: '0 auto',
                filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))'
              }}
            >
              {pages.map((page, idx) => (
                <div
                  key={idx}
                  className="page border border-amber-900/10 p-6 sm:p-10 flex flex-col justify-between select-text overflow-y-auto"
                  onMouseDown={handleMouseDown}
                  style={{ userSelect: 'text' }}
                >
                  {/* Cover Page */}
                  {page.type === 'cover' && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-amber-900/5 to-amber-900/10 rounded-sm border border-amber-900/20">
                      <div className="w-16 h-16 rounded-full bg-amber-900/10 border border-amber-900/30 flex items-center justify-center mb-6">
                        <BookOpen className="w-8 h-8 text-amber-900" />
                      </div>
                      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-wide text-amber-950 mb-3">
                        {page.title}
                      </h1>
                      <div className="w-12 h-0.5 bg-amber-900/40 my-4" />
                      <p className="text-sm font-sans uppercase tracking-widest text-amber-900/70 font-semibold">
                        Original Language Edition: {page.language}
                      </p>
                      {page.translator && (
                        <p className="text-xs text-amber-900/60 mt-2 font-serif italic">
                          Editor/Translator: {page.translator}
                        </p>
                      )}
                      <p className="text-[10px] text-amber-900/40 mt-8 max-w-xs leading-relaxed font-sans">
                        Provenance: {page.provenance || 'Verified Sacred Text Repository'}
                      </p>
                    </div>
                  )}

                  {/* TOC Page */}
                  {page.type === 'toc' && (
                    <div className="h-full flex flex-col justify-between font-serif">
                      <div>
                        <h2 className="text-2xl font-bold border-b border-amber-900/20 pb-3 mb-4 text-center">
                          Table of Contents
                        </h2>
                        <ul className="space-y-2 text-sm max-h-[500px] overflow-y-auto pr-2">
                          {page.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-center justify-between py-1.5 border-b border-dashed border-amber-900/10 hover:text-amber-700 cursor-pointer" onClick={() => goToPage(item.pageIndex)}>
                              <span>{item.title}</span>
                              <span className="text-xs font-mono opacity-60">p. {item.pageIndex + 1}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-center text-xs opacity-50 font-sans border-t border-amber-900/10 pt-2">
                        Click any section to jump directly
                      </div>
                    </div>
                  )}

                  {/* Scripture Passage Content Page */}
                  {page.type === 'content' && (
                    <div className="h-full flex flex-col justify-between font-serif">
                      {/* Section Header */}
                      <div className="border-b border-amber-900/15 pb-2 mb-4 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900/80 font-sans truncate">
                          {page.sectionTitle}
                        </span>
                        {onSummarize && (
                          <button
                            onClick={() => onSummarize(page.sectionId)}
                            className="inline-flex items-center gap-1 text-[11px] bg-amber-900/10 hover:bg-amber-900/20 px-2 py-0.5 rounded text-amber-950 font-sans transition"
                            title="Summarize this section with AI"
                          >
                            <Sparkles className="w-3 h-3 text-amber-700" />
                            <span>Summarize Section</span>
                          </button>
                        )}
                      </div>

                      {/* Passages List */}
                      <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                        {page.passages.map((p) => {
                          const isBookmarked = userBookmarks.some((b) => b.passageId === p.id);
                          const passageNotes = userNotes.filter((n) => n.passageId === p.id);
                          const isSelected = selectedPassage?.id === p.id;

                          return (
                            <div
                              key={p.id}
                              className={`group relative p-3 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                                  : isBookmarked
                                  ? 'bg-amber-50/60 border-amber-300'
                                  : 'border-transparent hover:border-amber-900/20 hover:bg-amber-900/5'
                              }`}
                            >
                              {/* Verse Reference & Actions */}
                              <div className="flex items-center justify-between mb-1.5 text-xs font-sans text-amber-900/70 font-semibold">
                                <div className="flex items-center gap-2">
                                  <span>{p.reference}</span>
                                  {isBookmarked && (
                                    <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5">
                                      <Bookmark className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                                      Bookmarked
                                    </span>
                                  )}
                                  {passageNotes.length > 0 && (
                                    <span className="text-[10px] text-amber-800 bg-amber-200/60 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5">
                                      <MessageSquare className="w-2.5 h-2.5" />
                                      {passageNotes.length} Note{passageNotes.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>

                                {/* Passage Context Menu Actions */}
                                <div className="opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleBookmark(p)}
                                    className="p-1 hover:text-amber-950 transition"
                                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
                                  >
                                    <Bookmark
                                      className={`w-3.5 h-3.5 ${
                                        isBookmarked ? 'fill-amber-700 text-amber-700' : 'text-stone-500'
                                      }`}
                                    />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedPassage(p);
                                      // If existing note, pre-fill
                                      const existingNote = passageNotes[0];
                                      setNoteContent(existingNote?.content || '');
                                      setShowNoteModal(true);
                                    }}
                                    className="p-1 hover:text-amber-950 transition"
                                    title="Add or view private note"
                                  >
                                    <MessageSquare
                                      className={`w-3.5 h-3.5 ${
                                        passageNotes.length > 0 ? 'text-amber-800' : 'text-stone-500'
                                      }`}
                                    />
                                  </button>
                                  {onAskAI && (
                                    <button
                                      onClick={() => onAskAI(p)}
                                      className="px-2 py-0.5 bg-amber-800 text-amber-50 rounded text-[10px] font-sans font-semibold flex items-center gap-1 shadow-xs hover:bg-amber-900 transition"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      <span>Ask AI</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Original Text */}
                              <div
                                style={{ fontSize: `${fontSize}px`, lineHeight }}
                                className={`scripture-text select-text cursor-text ${
                                  isRTL ? 'font-arabic text-right' : ''
                                } ${isIndic ? 'font-sanskrit text-stone-900 font-medium' : ''}`}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                onSelectStart={(e) => e.stopPropagation()}
                              >
                                {p.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Page Footer */}
                      <div className="border-t border-amber-900/15 pt-2 text-center text-xs font-mono opacity-60">
                        {idx + 1}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        ) : (
          <div className="text-center py-20 font-serif">
            <p className="text-lg opacity-70">Loading scripture pages...</p>
          </div>
        )}
      </main>

      {/* Reader Bottom Navigation Bar */}
      <footer className="sticky bottom-0 z-30 px-4 py-2 border-t flex items-center justify-between backdrop-blur-md bg-opacity-90 border-stone-300/30 text-xs font-sans">
        <button
          onClick={() => flipBookRef.current?.pageFlip()?.flipPrev()}
          disabled={currentPage === 0}
          className="px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="font-mono text-center">
          Page <span className="font-bold">{currentPage + 1}</span> of <span className="font-bold">{totalPages}</span>
        </div>

        <button
          onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
          disabled={currentPage >= totalPages - 1}
          className="px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 disabled:opacity-40 transition flex items-center gap-1 font-semibold"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Table of Contents Drawer */}
      {showTOC && (
        <div className="fixed inset-y-0 left-0 z-50 w-80 bg-stone-900 text-stone-100 shadow-2xl p-6 flex flex-col animate-in slide-in-from-left duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-stone-700">
            <h3 className="font-serif text-lg font-bold text-amber-200">Table of Contents</h3>
            <button onClick={() => setShowTOC(false)} className="p-1 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4 space-y-2 font-serif">
            {pages
              .filter((p) => p.type === 'toc')
              .flatMap((p) => p.items)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => goToPage(item.pageIndex)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-stone-800 text-sm border-b border-stone-800/50 transition flex items-center justify-between"
                >
                  <span>{item.title}</span>
                  <span className="text-xs text-stone-500 font-mono">p. {item.pageIndex + 1}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Search Drawer */}
      {showSearch && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-stone-900 text-stone-100 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-stone-700">
            <h3 className="font-serif text-lg font-bold text-amber-200">Search Scripture</h3>
            <button onClick={() => setShowSearch(false)} className="p-1 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="my-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search words or verses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-800 text-stone-100 pl-4 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 border border-stone-700"
              />
              <button type="submit" className="absolute right-2 top-2 p-1 text-stone-400 hover:text-amber-400">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto space-y-3">
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => {
                  goToPage(res.pageIndex);
                  setShowSearch(false);
                }}
                className="p-3 bg-stone-800 rounded-lg hover:bg-stone-700 cursor-pointer border border-stone-700 transition"
              >
                <span className="text-xs font-bold text-amber-400 font-sans block">{res.reference} ({res.sectionTitle})</span>
                <p className="text-xs text-stone-300 line-clamp-2 mt-1 font-serif">{res.text}</p>
              </div>
            ))}
            {searchResults.length === 0 && searchQuery && (
              <p className="text-xs text-stone-500 text-center py-8">No matching passages found.</p>
            )}
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && selectedPassage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">
              Note for {selectedPassage.reference}
            </h3>
            <p className="text-xs text-stone-600 font-serif italic mb-4 p-2 bg-stone-100 rounded">
              "{selectedPassage.text}"
            </p>
            <textarea
              rows={4}
              placeholder="Write your reflection or note here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full border border-stone-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 text-xs font-semibold bg-amber-800 text-amber-50 rounded-lg hover:bg-amber-900"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Drawer */}
      {showBookmarksDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-stone-900 text-stone-100 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-stone-700">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="font-serif text-lg font-bold text-amber-200">
                Bookmarked Paragraphs ({userBookmarks.length})
              </h3>
            </div>
            <button onClick={() => setShowBookmarksDrawer(false)} className="p-1 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {userBookmarks.length > 0 ? (
              userBookmarks.map((bm) => {
                const passage = bm.passage || {};
                return (
                  <div
                    key={bm.id}
                    onClick={() => handleJumpToPassage(bm.passageId, passage)}
                    className="p-3 bg-stone-800/80 hover:bg-stone-800 border border-stone-700 rounded-xl cursor-pointer transition group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-sans text-amber-400">
                        {passage.reference || bm.label || 'Verse'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteBookmark(bm.id, e)}
                        className="p-1 text-stone-500 hover:text-rose-400 transition"
                        title="Remove Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {passage.text && (
                      <p className="text-xs text-stone-300 font-serif line-clamp-3 leading-relaxed">
                        "{passage.text}"
                      </p>
                    )}
                    <div className="mt-2 text-[10px] text-amber-500/80 font-sans flex items-center justify-between">
                      <span>Click to view in book →</span>
                      {bm.createdAt && (
                        <span className="text-stone-500">
                          {new Date(bm.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-stone-400 text-xs font-serif">
                <Bookmark className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <p>No bookmarked paragraphs yet.</p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Hover over any verse in the book and click the bookmark icon.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Drawer */}
      {showNotesDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-stone-900 text-stone-100 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-stone-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h3 className="font-serif text-lg font-bold text-amber-200">
                All Notes ({userNotes.length})
              </h3>
            </div>
            <button onClick={() => setShowNotesDrawer(false)} className="p-1 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {userNotes.length > 0 ? (
              userNotes.map((note) => {
                const passage = note.passage || {};
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      handleJumpToPassage(note.passageId, passage);
                      setNoteContent(note.content);
                      setShowNoteModal(true);
                      setShowNotesDrawer(false);
                    }}
                    className="p-3 bg-stone-800/80 hover:bg-stone-800 border border-stone-700 rounded-xl cursor-pointer transition group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-sans text-amber-400">
                        {passage.reference || 'Verse'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1 text-stone-500 hover:text-rose-400 transition"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-amber-100 font-sans bg-stone-900/60 p-2 rounded-lg border border-stone-700/50 mb-2 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                    {passage.text && (
                      <p className="text-[11px] text-stone-400 font-serif line-clamp-2 italic">
                        "{passage.text}"
                      </p>
                    )}
                    <div className="mt-2 text-[10px] text-amber-500/80 font-sans flex items-center justify-between">
                      <span>Jump to verse & edit note →</span>
                      {note.createdAt && (
                        <span className="text-stone-500">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-stone-400 text-xs font-serif">
                <MessageSquare className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <p>No notes written yet.</p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Hover over any verse and click the note icon to add your reflection.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-amber-200 border border-amber-800/60 px-4 py-2 rounded-full text-xs font-sans shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
