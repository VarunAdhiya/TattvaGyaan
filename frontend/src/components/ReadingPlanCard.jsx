import React from 'react';
import { Trash2, ChevronRight, Calendar } from 'lucide-react';

export default function ReadingPlanCard({ plan, onDelete, onClick }) {
  const completedItems = plan.items?.filter((item) => item.completed).length || 0;
  const totalItems = plan.items?.length || 0;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(plan.endDate) - new Date()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="rounded-2xl border border-stone-200/80 shadow-xs p-6 hover:shadow-lg transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1" onClick={onClick}>
          <h3 className="font-serif font-bold text-lg text-stone-900 group-hover:text-amber-900 transition">
            {plan.title}
          </h3>
          <p className="text-sm text-stone-600 mt-1">{plan.targetDays} days</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(plan.id);
          }}
          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          title="Delete plan"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4" onClick={onClick}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-700">Progress</span>
          <span className="text-xs text-stone-500">
            {completedItems}/{totalItems}
          </span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-600 to-amber-700 h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Info Row */}
      <div className="flex items-center justify-between mb-4 text-sm" onClick={onClick}>
        <div className="flex items-center gap-2 text-stone-600">
          <Calendar className="w-4 h-4 text-amber-700" />
          <span>{daysRemaining} days left</span>
        </div>
        <span className="font-mono text-amber-700 font-semibold">{progressPercentage}%</span>
      </div>

      {/* View Button */}
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-semibold transition"
      >
        View Plan
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
