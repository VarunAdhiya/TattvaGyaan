import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Globe, ArrowRight, BookOpen } from 'lucide-react';

export default function ScriptureCard({ scripture }) {
  const isComplete = scripture.availabilityStatus === 'complete';
  const isPartial = scripture.availabilityStatus === 'partial';

  return (
    <div className="scripture-card bg-white rounded-2xl border border-stone-200/90 p-6 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden hover:border-amber-400">
      <div className="scripture-cover" aria-hidden="true"><BookOpen size={38} strokeWidth={1} /><span>{['ramayana', 'ramayan'].includes(scripture.slug) ? 'रामायण' : scripture.title}</span></div>
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-2.5 py-1 rounded-md bg-amber-100/70 text-amber-900 font-medium font-serif border border-amber-200/50">
            {scripture.religion?.name || 'Scripture'}
          </span>

          <span
            className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
              isComplete
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : isPartial
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {isComplete ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Complete</span>
              </>
            ) : isPartial ? (
              <span>Partial</span>
            ) : (
              <span>Metadata Only</span>
            )}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-serif text-xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
            {['ramayana', 'ramayan'].includes(scripture.slug) ? 'रामायण' : scripture.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 font-sans">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-stone-400" />
              {scripture.originalLang}
            </span>
            {scripture.estimatedReadTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                {scripture.estimatedReadTime} mins
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed font-sans">
          {scripture.description || 'No description available.'}
        </p>

        {/* Themes tags */}
        {scripture.themes && scripture.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {scripture.themes.slice(0, 3).map((theme, idx) => (
              <span key={idx} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-sm">
                #{theme}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="pt-5 mt-4 border-t border-stone-100 flex items-center justify-between">
        <span className="text-xs text-stone-400 font-sans">
          Hindi text
        </span>

        <Link
          to={`/scripture/${scripture.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 group-hover:text-amber-950 group-hover:translate-x-0.5 transition-all"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
