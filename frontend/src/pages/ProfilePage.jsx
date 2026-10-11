import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { User, Book, Clock, Calendar, Target, Award } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '',
    preferredLang: 'en'
  });
  const [stats, setStats] = useState({
    totalReadingTime: 0,
    scriptsRead: 0,
    readingPlansCompleted: 0,
    bookmarksCount: 0,
    notesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const [profileRes, plansRes, bookmarksRes, notesRes] = await Promise.allSettled([
          api.getProfile(),
          api.getReadingPlans(),
          api.getBookmarks(),
          api.getNotes()
        ]);

        const profileData = profileRes.status === 'fulfilled' ? profileRes.value : {};
        const readingPlans = plansRes.status === 'fulfilled' ? plansRes.value : { plans: [] };
        const bookmarks = bookmarksRes.status === 'fulfilled' ? bookmarksRes.value : { bookmarks: [] };
        const notes = notesRes.status === 'fulfilled' ? notesRes.value : { notes: [] };

        const userData = profileData.user || profileData || user || {};

        setProfile({
          displayName: userData.displayName || user?.displayName || '',
          preferredLang: userData.preferredLang || user?.preferredLang || 'en'
        });

        // Calculate stats
        const plansList = readingPlans.plans || [];
        const completedPlans = plansList.filter(p => p.status === 'completed').length;
        const totalUniqueScriptures = new Set(plansList.map(p => p.edition?.scriptureId).filter(Boolean)).size;

        setStats({
          totalReadingTime: plansList.reduce((acc, p) => acc + (p.minutesPerDay || 20), 0),
          scriptsRead: totalUniqueScriptures || plansList.length,
          readingPlansCompleted: completedPlans,
          bookmarksCount: bookmarks.bookmarks?.length || 0,
          notesCount: notes.notes?.length || 0
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(profile);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile({
      displayName: user?.displayName || '',
      preferredLang: user?.preferredLang || 'en'
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-800"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-amber-800 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-stone-900">
                  {user?.displayName || user?.username}
                </h1>
                <p className="text-stone-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Profile Info */}
            <div className="space-y-6">
              <h2 className="text-lg font-serif font-semibold text-stone-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-amber-800" />
                Profile Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Display Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Enter your display name"
                    />
                  ) : (
                    <p className="text-stone-900">{profile.displayName || 'Not set'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Email
                  </label>
                  <p className="text-stone-600">{user?.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Username
                  </label>
                  <p className="text-stone-600">{user?.username}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Preferred Language
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.preferredLang}
                      onChange={(e) => setProfile(prev => ({ ...prev, preferredLang: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="mr">मराठी (Marathi)</option>
                      <option value="sa">संस्कृत (Sanskrit)</option>
                      <option value="ar">العربية (Arabic)</option>
                      <option value="ur">اردو (Urdu)</option>
                      <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                    </select>
                  ) : (
                    <p className="text-stone-900">
                      {{
                        en: 'English',
                        hi: 'हिन्दी (Hindi)',
                        mr: 'मराठी (Marathi)',
                        sa: 'संस्कृत (Sanskrit)',
                        ar: 'العربية (Arabic)',
                        ur: 'اردو (Urdu)',
                        pa: 'ਪੰਜਾਬੀ (Punjabi)'
                      }[profile.preferredLang] || profile.preferredLang}
                    </p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Reading Statistics */}
            <div className="space-y-6">
              <h2 className="text-lg font-serif font-semibold text-stone-900 flex items-center">
                <Award className="w-5 h-5 mr-2 text-amber-800" />
                Reading Statistics
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <Target className="w-8 h-8 text-amber-800 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-900">{stats.readingPlansCompleted}</div>
                  <div className="text-sm text-amber-700">Plans Completed</div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Book className="w-8 h-8 text-blue-800 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">{stats.bookmarksCount}</div>
                  <div className="text-sm text-blue-700">Bookmarks</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <Calendar className="w-8 h-8 text-green-800 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-900">{stats.notesCount}</div>
                  <div className="text-sm text-green-700">Notes Created</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <Clock className="w-8 h-8 text-purple-800 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-900">{stats.scriptsRead}</div>
                  <div className="text-sm text-purple-700">Scriptures Read</div>
                </div>
              </div>

              <div className="bg-stone-50 rounded-lg p-4">
                <h3 className="font-medium text-stone-900 mb-2">Account Details</h3>
                <div className="space-y-1 text-sm text-stone-600">
                  <p>Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently joined'}</p>
                  <p>Last updated: {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Active now'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}