import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ChevronLeft, Loader2, Check, Calendar, BookOpen } from 'lucide-react';

export default function PlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingItems, setCompletingItems] = useState({});

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const res = await api.getReadingPlan(planId);
      setPlan(res.plan);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load plan');
      console.error('Error loading plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId, currentStatus) => {
    try {
      setCompletingItems((prev) => ({ ...prev, [itemId]: true }));
      await api.completePlanItem(itemId, !currentStatus);
      await loadPlan();
    } catch (err) {
      setError(err.message || 'Failed to update item');
    } finally {
      setCompletingItems((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-stone-600">Plan not found</p>
          <button
            onClick={() => navigate('/reading-plans')}
            className="mt-4 px-4 py-2 bg-amber-700 text-amber-50 rounded-lg font-semibold hover:bg-amber-800 transition"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  const completedItems = plan.items.filter((item) => item.completed).length;
  const progressPercentage = plan.items.length > 0 ? Math.round((completedItems / plan.items.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/reading-plans')}
          className="flex items-center gap-2 text-amber-800 hover:text-amber-900 font-semibold mb-4 transition"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Plans
        </button>

        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">{plan.title}</h1>

        <div className="flex flex-wrap gap-6 mb-6">
          <div className="flex items-center gap-2 text-stone-600">
            <Calendar className="w-5 h-5 text-amber-700" />
            <span className="text-sm">
              {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-600">
            <BookOpen className="w-5 h-5 text-amber-700" />
            <span className="text-sm">{plan.targetDays} days</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-stone-700">Progress</span>
            <span className="text-sm font-mono text-stone-600">
              {completedItems}/{plan.items.length} days
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-600 to-amber-700 h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-stone-500 mt-1 text-right">{progressPercentage}% complete</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Daily Items */}
      <div className="space-y-3">
        {plan.items.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border-2 transition ${
              item.completed
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-white border-stone-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-stone-900">
                  Day {item.dayNumber}
                  {item.completed && <span className="text-emerald-600 ml-2">✓ Completed</span>}
                </div>
                <div className="text-sm text-stone-600 mt-1">
                  {item.passageIds.length} passage{item.passageIds.length !== 1 ? 's' : ''}
                  {item.completedAt && (
                    <span className="ml-2 text-emerald-600">
                      on {new Date(item.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {plan.edition && (
                  <button
                    onClick={() => navigate(`/reader/${plan.edition.scriptureId}/${plan.editionId}`)}
                    className="px-3 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
                    title="Open in Reader"
                  >
                    <BookOpen className="w-4 h-4 text-amber-800" />
                    <span>Read</span>
                  </button>
                )}
                <button
                  onClick={() => handleToggleItem(item.id, item.completed)}
                  disabled={completingItems[item.id]}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                    item.completed
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-amber-700 text-amber-50 hover:bg-amber-800'
                  } disabled:opacity-50 text-sm`}
                >
                {completingItems[item.id] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {item.completed ? 'Undo' : 'Mark Done'}
                  </>
                )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
