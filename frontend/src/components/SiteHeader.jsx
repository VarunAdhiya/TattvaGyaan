import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, BookMarked, BookOpen, LogOut, Menu, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const sections = [['Library', '/library'], ['Ask the library', '/ask'], ['Chalisas', '/chalisas'], ['Bhajans', '/bhajans'], ['Mantras', '/mantras'], ['Calendar', '/calendar'], ['Journeys', '/journeys']];

export default function SiteHeader({ overlay = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const menuButton = useRef(null);
  const searchButton = useRef(null);
  const searchInput = useRef(null);
  useEffect(() => { if (searchOpen) searchInput.current?.focus(); }, [searchOpen]);

  function closePanels() { setMenuOpen(false); setSearchOpen(false); }
  function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    closePanels();
    navigate(`/library?search=${encodeURIComponent(query.trim())}`);
  }
  async function signOut() {
    try { await logout(); closePanels(); navigate('/login'); }
    catch { setError('Unable to sign out. Please try again.'); }
  }
  function escape(event) {
    if (event.key !== 'Escape') return;
    if (searchOpen) { setSearchOpen(false); searchButton.current?.focus(); }
    else { setMenuOpen(false); menuButton.current?.focus(); }
  }

  return <header className={`site-header${overlay ? ' site-header-overlay' : ''}`} onKeyDown={escape}>
    <div className="site-header-inner">
      <Link to="/dashboard" className="site-brand" aria-label="TattvaGyaan home" onClick={closePanels}>
        <BookOpen size={26} strokeWidth={1.4} aria-hidden="true" />
        <span>TattvaGyaan<small lang="hi">ज्ञान से आत्मबोध तक</small></span>
      </Link>
      <nav className="site-desktop-nav" aria-label="Main navigation">
        {sections.map(([label, path]) => <NavLink to={path} key={path} onClick={closePanels}>{label}</NavLink>)}
      </nav>
      <div className="site-account-actions">
        {!overlay && <button ref={searchButton} className="site-icon-button" aria-label={searchOpen ? 'Close library search' : 'Search scriptures'} aria-expanded={searchOpen} aria-controls="site-library-search" onClick={() => { setSearchOpen(open => !open); setMenuOpen(false); }}>{searchOpen ? <X size={20} /> : <Search size={20} />}</button>}
        <Link className="site-plans-link site-icon-button" to="/reading-plans" aria-label="Reading Plans" title="Reading Plans"><BookMarked size={20} /></Link>
        <Link className="site-profile-link" to="/profile"><span>{user?.displayName || user?.username || 'My profile'}</span><ArrowRight size={16} aria-hidden="true" /></Link>
        <button className="site-logout site-icon-button" onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={20} /></button>
        <button ref={menuButton} className="site-menu-toggle landing-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="site-mobile-navigation" onClick={() => { setMenuOpen(open => !open); setSearchOpen(false); }}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
    </div>
    {searchOpen && <form id="site-library-search" className="site-search-panel" onSubmit={search}>
      <label htmlFor="site-search-input">Search the scripture library</label>
      <div><Search size={18} aria-hidden="true" /><input ref={searchInput} id="site-search-input" aria-label="Search library" type="text" maxLength={200} placeholder="Book title in Hindi or English…" value={query} onChange={event => setQuery(event.target.value)} /><button type="submit">Search</button></div>
    </form>}
    {menuOpen && <nav id="site-mobile-navigation" className="site-mobile-nav" aria-label="Mobile navigation">
      {sections.map(([label, path]) => <NavLink to={path} key={path} onClick={closePanels}>{label}<ArrowRight size={16} aria-hidden="true" /></NavLink>)}
      <Link to="/profile" onClick={closePanels}>My profile</Link>
      <Link to="/reading-plans" onClick={closePanels}>Reading Plans</Link>
      <button onClick={signOut}>Log out <LogOut size={16} aria-hidden="true" /></button>
    </nav>}
    {error && <p className="site-header-error" role="alert">{error}</p>}
  </header>;
}
