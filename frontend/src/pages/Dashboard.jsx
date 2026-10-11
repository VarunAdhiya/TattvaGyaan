import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ReligionCard from '../components/ReligionCard';
import ScriptureCard from '../components/ScriptureCard';
import { Loader2, Search, X } from 'lucide-react';

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [religions, setReligions] = useState([]);
  const [scriptures, setScriptures] = useState([]);
  const [selectedReligion, setSelectedReligion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Keep search input in sync if URL query param changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchTerm(urlSearch);
  }, [searchParams]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [relRes, scriptRes] = await Promise.all([
          api.getReligions(),
          api.getScriptures({ limit: 100 }), // Get all for MVP context
        ]);
        setReligions(relRes.religions || []);
        setScriptures(scriptRes.scriptures || []);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.trim()) {
      setSearchParams({ search: val.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchParams({});
  };

  const filteredScriptures = scriptures.filter((s) => {
    const matchesReligion = selectedReligion ? s.religionId === selectedReligion : true;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return matchesReligion;

    const matchesSearch =
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.religion?.name && s.religion.name.toLowerCase().includes(q)) ||
      (s.editions && s.editions.some(e => e.language?.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q)));

    return matchesReligion && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Scripture Library</h1>
          <p className="text-stone-600 text-sm mt-1">Explore authentic sacred texts across major world traditions</p>
        </div>

        {/* Dashboard Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search books, scriptures..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-stone-200 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-600 transition"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Religion Selector */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold text-stone-800">Explore Traditions</h2>
          {selectedReligion && (
            <button
              onClick={() => setSelectedReligion(null)}
              className="text-xs text-amber-800 hover:underline font-medium"
            >
              Show all traditions
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {religions.map((rel) => (
            <ReligionCard
              key={rel.id}
              religion={rel}
              isSelected={selectedReligion === rel.id}
              onClick={(id) => setSelectedReligion(selectedReligion === id ? null : id)}
            />
          ))}
        </div>
      </section>

      {/* Scripture Catalog */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold text-stone-800">
            {selectedReligion
              ? `${religions.find((r) => r.id === selectedReligion)?.name} Scriptures`
              : 'All Scriptures'}
            {searchTerm && ` matching "${searchTerm}"`}
          </h2>
          <span className="text-sm text-stone-500">
            {filteredScriptures.length} Result{filteredScriptures.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredScriptures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScriptures.map((scripture) => (
              <ScriptureCard key={scripture.id} scripture={scripture} />
            ))}
          </div>
        ) : (
          <div className="p-12 border-2 border-dashed border-stone-200 rounded-2xl text-center text-stone-500">
            <p className="font-serif text-lg mb-1">No scriptures found.</p>
            <p className="text-sm">Try clearing your search or selecting a different tradition.</p>
            {(searchTerm || selectedReligion) && (
              <button
                onClick={() => {
                  setSelectedReligion(null);
                  handleClearSearch();
                }}
                className="mt-4 px-4 py-2 bg-amber-800 text-white rounded-lg text-sm hover:bg-amber-900 transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
