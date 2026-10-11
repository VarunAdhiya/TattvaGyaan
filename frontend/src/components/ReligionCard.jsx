import React from 'react';
import { BookOpen } from 'lucide-react';

const RELIGION_ICONS = {
  Hinduism: '🕉️',
  Islam: '☪️',
  Buddhism: '☸️',
  Sikhism: 'ੴ',
  Jainism: '✋',
  Christianity: '✝️',
};

const RELIGION_COLORS = {
  Hinduism: 'from-amber-600/10 to-orange-600/10 border-amber-300 text-amber-900',
  Islam: 'from-emerald-600/10 to-teal-600/10 border-emerald-300 text-emerald-900',
  Buddhism: 'from-yellow-600/10 to-amber-600/10 border-yellow-300 text-yellow-900',
  Sikhism: 'from-orange-600/10 to-amber-700/10 border-orange-300 text-orange-900',
  Jainism: 'from-rose-600/10 to-red-600/10 border-rose-300 text-rose-900',
  Christianity: 'from-sky-600/10 to-blue-600/10 border-sky-300 text-sky-900',
};

export default function ReligionCard({ religion, isSelected, onClick }) {
  const symbol = RELIGION_ICONS[religion.name] || '📜';
  const colors = RELIGION_COLORS[religion.name] || 'from-stone-100 to-stone-200 border-stone-300 text-stone-900';

  return (
    <button
      onClick={() => onClick(religion.id)}
      className={`relative p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between group overflow-hidden ${
        isSelected
          ? `bg-gradient-to-br ${colors} shadow-md ring-2 ring-amber-700/50 scale-[1.02]`
          : 'bg-white hover:bg-amber-50/50 border-stone-200/80 shadow-xs hover:shadow-md hover:border-amber-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl filter drop-shadow-xs group-hover:scale-110 transition-transform">{symbol}</span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 font-medium border border-stone-200">
          {religion._count?.scriptures || 0} texts
        </span>
      </div>

      <div>
        <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-950 transition">
          {religion.name}
        </h3>
        <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
          {religion.description}
        </p>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
      )}
    </button>
  );
}
