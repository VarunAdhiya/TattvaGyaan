import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Search, LogOut, BookMarked, Menu, X, UserRound } from 'lucide-react';

export default function Navbar({ onSearch }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  function search(event) {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    if (onSearch) onSearch(searchQuery.trim());
    else navigate(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
    setMenuOpen(false);
  }
  async function signOut() {
    try { await logout(); setMenuOpen(false); navigate('/login'); }
    catch { setError('Unable to sign out. Please try again.'); }
  }
  const searchForm = <form onSubmit={search} className="sacred-nav-search"><Search size={18} aria-hidden="true" /><input aria-label="Search library" placeholder="Search your scripture library…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /><button type="submit" aria-label="Search scripture library">Search</button></form>;
  return <header className="sacred-navbar">
    <div className="sacred-nav-inner">
      <Link to={user ? '/dashboard' : '/login'} className="sacred-brand"><span className="sacred-brand-symbol"><BookOpen size={24} strokeWidth={1.4} aria-hidden="true" /></span><span>TattvaGyaan<small>ज्ञान से आत्मबोध तक</small></span></Link>
      {user && !pathname.startsWith('/reader/') && <div className="sacred-nav-search-desktop">{searchForm}</div>}
      <nav className="sacred-account-nav" aria-label="Account navigation">{user ? <>
        <Link to="/reading-plans"><BookMarked size={18} aria-hidden="true" />Reading Plans</Link>
        <Link to="/profile"><UserRound size={18} aria-hidden="true" /><span>{user.displayName || user.username}</span></Link>
        <button onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={19} /></button>
      </> : <><Link to="/login" aria-current={pathname === '/login' ? 'page' : undefined}>Log in</Link><Link to="/register" className="sacred-nav-join">Create Account</Link></>}</nav>
      <button className="sacred-menu-toggle" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="sacred-mobile-menu">{menuOpen ? <X /> : <Menu />}</button>
    </div>
    {menuOpen && <nav id="sacred-mobile-menu" className="sacred-mobile-menu" aria-label="Mobile account navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); document.querySelector('.sacred-menu-toggle')?.focus(); } }}>
      {user ? <>{!pathname.startsWith('/reader/') && searchForm}<Link to="/dashboard" onClick={() => setMenuOpen(false)}>Home</Link><Link to="/reading-plans" onClick={() => setMenuOpen(false)}>Reading Plans</Link><Link to="/profile" onClick={() => setMenuOpen(false)}>My profile</Link><button onClick={signOut}>Log out</button></> : <><Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link to="/register" onClick={() => setMenuOpen(false)}>Create Account</Link></>}
    </nav>}
    {error && <p role="alert" className="sacred-nav-error">{error}</p>}
  </header>;
}
