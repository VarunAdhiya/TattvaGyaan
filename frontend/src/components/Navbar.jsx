import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Search, LogOut, BookMarked, Menu, X, Compass } from 'lucide-react';

export default function Navbar({ onSearch }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-amber-50/90 backdrop-blur-md border-b border-amber-900/10 text-stone-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-amber-100 shadow-md group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold text-amber-950 tracking-wide block">TattvaGyaan</span>
              <span className="text-[10px] uppercase tracking-widest text-amber-700 -mt-1 block font-sans">Hindi Scripture Library</span>
            </div>
          </Link>

          {/* Quick Search - only shown when logged in */}
          {user && !location.pathname.startsWith('/reader/') && (
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-8 relative">
              <Search className="w-4 h-4 absolute left-3 text-stone-400" />
              <input
                type="text"
                aria-label="Search library"
                placeholder="Search books and scriptures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-stone-100/80 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all placeholder:text-stone-400"
              />
            </form>
          )}

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-700">
            {user ? (
              <>
                <Link to="/dashboard" className={`flex items-center gap-1.5 hover:text-amber-800 transition ${location.pathname === '/dashboard' ? 'text-amber-900 font-semibold' : ''}`}>
                  <Compass className="w-4 h-4" />
                  <span>Library</span>
                </Link>
                <Link to="/reading-plans" className={`flex items-center gap-1.5 hover:text-amber-800 transition ${location.pathname === '/reading-plans' ? 'text-amber-900 font-semibold' : ''}`}>
                  <BookMarked className="w-4 h-4" />
                  <span>Reading Plans</span>
                </Link>

                {/* User menu */}
                <div className="flex items-center gap-4 pl-4 border-l border-stone-200">
                  <Link to="/profile" className="flex items-center gap-2 text-stone-800 font-semibold hover:text-amber-800">
                    <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs uppercase">
                      {user.displayName ? user.displayName[0] : user.username[0]}
                    </div>
                    <span className="max-w-[100px] truncate">{user.displayName || user.username}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-stone-500 hover:text-red-700 hover:bg-stone-200/50 rounded-lg transition"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="px-4 py-2 text-sm text-amber-900 hover:text-amber-950 font-medium">
                  Log in
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 rounded-lg hover:from-amber-800 hover:to-amber-950 transition font-medium shadow-xs">
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-stone-700 hover:text-stone-900"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-amber-200/60 bg-amber-50 px-4 py-4 space-y-3">
          {user && !location.pathname.startsWith('/reader/') && (
            <form onSubmit={handleSearchSubmit} className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search scriptures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-lg"
              />
            </form>
          )}

          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-stone-800 font-medium">
                Library Dashboard
              </Link>
              <Link to="/reading-plans" onClick={() => setMenuOpen(false)} className="block py-2 text-stone-800 font-medium">
                Reading Plans
              </Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-stone-800 font-medium">
                Profile ({user.username})
              </Link>
              <button onClick={handleLogout} className="w-full text-left py-2 text-red-700 font-medium border-t border-stone-200 pt-3">
                Log Out
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block w-full text-center py-2 text-amber-900 font-medium">
                Log In
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block w-full text-center py-2 bg-amber-800 text-white rounded-lg font-medium">
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
