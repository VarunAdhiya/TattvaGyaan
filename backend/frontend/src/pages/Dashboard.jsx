import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function Dashboard() {
  const [religions, setReligions] = useState([]);
  const [scriptures, setScriptures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [relRes, scriptRes] = await Promise.all([
          api.getReligions(),
          api.getScriptures(),
        ]);
        setReligions(relRes.religions || []);
        setScriptures(scriptRes.scriptures || []);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-serif font-bold text-stone-900 mb-8">Dashboard</h1>
      <p className="text-stone-600 mb-8">Welcome to TattvaGyaan Digital Scripture Library</p>

      <section className="mb-12">
        <h2 className="text-2xl font-serif font-bold text-stone-800 mb-4">Religions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {religions.map((rel) => (
            <div key={rel.id} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="font-semibold text-amber-900">{rel.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-serif font-bold text-stone-800 mb-4">Scriptures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scriptures.map((scripture) => (
            <div key={scripture.id} className="p-6 bg-white rounded-lg border border-stone-200 shadow-sm">
              <h3 className="font-serif font-bold text-stone-900">{scripture.title}</h3>
              <p className="text-sm text-stone-600 mt-1">{scripture.religion?.name}</p>
              <p className="text-xs text-stone-500 mt-2">{scripture.originalLang}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
