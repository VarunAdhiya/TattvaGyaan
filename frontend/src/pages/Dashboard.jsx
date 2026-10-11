import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ReligionCard from '../components/ReligionCard';
import ScriptureCard from '../components/ScriptureCard';
import { Loader2, Search } from 'lucide-react';

export default function Dashboard() {
  const [religions, setReligions] = useState([]);
  const [scriptures, setScriptures] = useState([]);
  const [selectedReligion, setSelectedReligion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [relRes, scriptRes] = await Promise.all([
          api.getReligions(),
          api.getScriptures({ limit: 100 }), // Get all for MVP context
        ]);
        setReligions(relRes.religions);
        setScriptures(scriptRes.scriptures);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const filteredScriptures = selectedReligion
    ? scriptures.filter((s) => s.religionId === selectedReligion)
    : scriptures;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-sans">
      <h1 className="text-3xl font-serif font-bold text-stone-900 mb-8">Welcome back.</h1>

      {/* Religion Selector */}
      <section className="mb-12">
        <h2 className="text-xl font-serif font-semibold text-stone-800 mb-4">Explore Traditions</h2>
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
              ? `${religions.find(r => r.id === selectedReligion)?.name} Scriptures`
              : 'All Scriptures'}
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
            No scriptures found for this tradition.
          </div>
        )}
      </section>
    </div>
  );
}
