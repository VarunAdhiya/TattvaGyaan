import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Plus, Loader2, Trash2, BookOpen } from 'lucide-react';
import CreateReadingPlanModal from '../components/CreateReadingPlanModal';
import ReadingPlanCard from '../components/ReadingPlanCard';

export default function ReadingPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.getReadingPlans();
      setPlans(res.plans || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load reading plans');
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanCreated = async () => {
    setShowModal(false);
    await loadPlans();
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Delete this reading plan? This cannot be undone.')) return;
    try {
      await api.deleteReadingPlan(planId);
      await loadPlans();
    } catch (err) {
      setError(err.message || 'Failed to delete plan');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Reading Plans</h1>
          <p className="text-stone-600">Create custom study schedules for your scriptures</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 rounded-lg font-semibold hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          New Plan
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          {error}
        </div>
      )}

      {plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <ReadingPlanCard
              key={plan.id}
              plan={plan}
              onDelete={handleDeletePlan}
              onClick={() => navigate(`/reading-plan/${plan.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 border-2 border-dashed border-stone-200 rounded-2xl text-center">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold text-stone-900 mb-2">No Reading Plans Yet</h3>
          <p className="text-stone-600 mb-6">Create your first reading plan to start a structured study journey.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-amber-700 text-amber-50 rounded-lg font-semibold hover:bg-amber-800 transition"
          >
            Create First Plan
          </button>
        </div>
      )}

      <CreateReadingPlanModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handlePlanCreated}
      />
    </div>
  );
}
