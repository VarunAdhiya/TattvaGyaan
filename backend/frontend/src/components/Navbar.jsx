import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Menu, X, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-amber-50/90 backdrop-blur-md border-b border-amber-900/10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-800" />
          <span className="font-serif text-xl font-bold text-amber-950">TattvaGyaan</span>
        </Link>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-stone-600">{user.displayName || user.username}</span>
              <button onClick={handleLogout} className="text-amber-700 hover:text-amber-900">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-amber-900 font-medium hover:text-amber-950">
                Log in
              </Link>
              <Link to="/register" className="px-4 py-2 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800">
                Create Account
              </Link>
            </>
          )}
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t px-4 py-4 space-y-2">
          {user ? (
            <>
              <div className="text-sm text-stone-600 py-2">{user.username}</div>
              <button onClick={handleLogout} className="w-full text-left text-red-700 py-2">Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-amber-900">Log in</Link>
              <Link to="/register" className="block py-2 text-amber-700">Create Account</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
