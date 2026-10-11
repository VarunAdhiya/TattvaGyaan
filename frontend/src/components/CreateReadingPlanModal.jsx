import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, Loader2 } from 'lucide-react';

export default function CreateReadingPlanModal({ isOpen, onClose, onCreated }) {
  const [scriptures, setScriptures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    editionId: '',
    title: '',
    targetDays: 30,
    startDate: new Date().toISOString().split('T')[0],
    minutesPerDay: 30,
  });

  useEffect(() => {
    if (isOpen) {
      loadScriptures();
    }
  }, [isOpen]);

  const loadScriptures = async () => {
    try {
      setLoading(true);
      const res = await api.getScriptures({ limit: 100 });
      setScriptures(res.scriptures || []);
      setError(null);
    } catch (err) {
      setError('Failed to load scriptures');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.editionId) {
      setError('Please select a scripture');
      return;
    }
    if (!formData.title.trim()) {
      setError('Please enter a plan title');
      return;
    }
    if (formData.targetDays < 1 || formData.targetDays > 365) {
      setError('Target days must be between 1 and 365');
      return;
    }

    try {
      setFormLoading(true);
      setError(null);

      // Get the selected scripture to find its edition
      const selectedScripture = scriptures.find(
        (s) => s.editions && s.editions.some((e) => e.id === formData.editionId)
      );

      if (!selectedScripture) {
        setError('Invalid scripture selection');
        return;
      }

      await api.createReadingPlan({
        editionId: formData.editionId,
        title: formData.title,
        targetDays: parseInt(formData.targetDays),
        startDate: formData.startDate,
        minutesPerDay: parseInt(formData.minutesPerDay) || undefined,
      });

      // Reset form
      setFormData({
        editionId: '',
        title: '',
        targetDays: 30,
        startDate: new Date().toISOString().split('T')[0],
        minutesPerDay: 30,
      });

      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create plan');
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 font-sans">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold text-stone-900">Create Reading Plan</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-100 rounded-lg transition text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scripture Selection */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Scripture & Edition
            </label>
            <select
              value={formData.editionId}
              onChange={(e) => setFormData({ ...formData, editionId: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading scriptures...' : 'Select a scripture'}
              </option>
              {scriptures.map((scripture) =>
                scripture.editions && scripture.editions.length > 0
                  ? scripture.editions.map((edition) => (
                      <option key={edition.id} value={edition.id}>
                        {scripture.title} - {edition.title} ({edition.language})
                      </option>
                    ))
                  : null
              )}
            </select>
          </div>

          {/* Plan Title */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Plan Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Read Bhagavad Gita"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
            />
          </div>

          {/* Target Days */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Days to Complete
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.targetDays}
              onChange={(e) => setFormData({ ...formData, targetDays: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
            />
          </div>

          {/* Minutes Per Day (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Minutes Per Day (Optional)
            </label>
            <input
              type="number"
              min="5"
              max="480"
              value={formData.minutesPerDay}
              onChange={(e) => setFormData({ ...formData, minutesPerDay: parseInt(e.target.value) })}
              placeholder="e.g., 30"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg font-semibold hover:bg-stone-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
