import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, BookOpen, CalendarDays, Menu, Sunrise, X, LogOut, BookMarked } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import durgaTemple from '../assets/landing/durga-temple.png';
import '../landing.css';
import '../journeys.css';

const navigation = [['Library', '/library'], ['Chalisas', '/chalisas'], ['Bhajans', '/bhajans'], ['Mantras', '/mantras'], ['Calendar', '/calendar'], ['Journeys', '/journeys']];
const collections = [
  { title: 'Hanuman Chalisa', hindi: 'हनुमान चालीसा', path: '/chalisas/hanuman-chalisa', category: 'Chalisas', browse: '/chalisas', image: '/journeys/hanuman.png', alt: 'Hanuman holding his gada in a temple landscape', description: 'A devotional hymn in praise of Hanuman.' },
  { title: 'Achyutam Keshavam', hindi: 'अच्युतम् केशवम्', path: '/bhajans/achyutam-keshavam', category: 'Bhajans', browse: '/bhajans', image: '/journeys/krishna.png', alt: 'Krishna playing his flute beside a cow', description: 'A bhajan celebrating Krishna and his divine names.' },
  { title: 'Mahamrityunjay Mantra', hindi: 'महामृत्युंजय मंत्र', path: '/mantras/mahamrityunjay-mantra', category: 'Mantras', browse: '/mantras', image: '/journeys/shiva.png', alt: 'Shiva meditating beside Nandi in the Himalayas', description: 'A sacred invocation to Shiva, also called Tryambaka.' },
];
const books = [
  { title: 'Bhagavad Gita', hindi: 'श्रीमद्भगवद्गीता', description: 'Teachings on action, devotion, and self-knowledge.' },
  { title: 'Mahabharat', hindi: 'महाभारत', description: 'Read Bal Mahabharat Katha in Hindi.' },
  { title: 'Ramayan', hindi: 'रामायण', description: 'A comparative study of Valmiki Ramayana and Ramakien.' },
];

function DailyPanchang() {
  const [today] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
  const [state, setState] = useState({ loading: true, data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    api.getCalendarMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)), controller.signal)
      .then(result => setState({ loading: false, data: result.days.find(day => day.date === today)?.data || null, error: false }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, data: null, error: true }); });
    return () => controller.abort();
  }, [today]);
  const date = new Date(`${today}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  return <section className="landing-panchang" aria-label="Today's Panchang">
    <div className="landing-panchang-date"><CalendarDays size={22} aria-hidden="true" /><div><h2>Today’s Panchang</h2><p>{date} <span>· New Delhi, IST</span></p></div></div>
    {state.data ? <dl className="landing-panchang-facts">
      <div><dt>Tithi</dt><dd>{state.data.tithi.name}</dd></div>
      <div><dt>Nakshatra</dt><dd>{state.data.nakshatra.name}</dd></div>
      <div><dt><Sunrise size={14} aria-hidden="true" /> Sunrise</dt><dd>{state.data.sunrise}</dd></div>
    </dl> : <p className="landing-calendar-status" role="status">{state.loading ? 'Loading today’s Panchang…' : state.error ? 'Today’s timings could not be loaded.' : 'Today’s timings are not available.'}</p>}
    <Link to={`/calendar?year=${today.slice(0, 4)}&month=${Number(today.slice(5, 7))}&day=${today}`} className="landing-calendar-link">Open calendar <ArrowRight size={17} aria-hidden="true" /></Link>
  </section>;
}

export default function LandingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');
  async function signOut() {
    try { await logout(); navigate('/login'); }
    catch { setLogoutError('Unable to sign out. Please try again.'); }
  }
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="landing-page">
    <a className="landing-skip" href="#landing-content">Skip to content</a>
    <section className="landing-hero" aria-labelledby="landing-title">
      <img className="landing-backdrop" src={durgaTemple} width="1408" height="768" alt="" fetchPriority="high" />
      <div className="landing-shade" />
      <header className="landing-header">
        <Link to="/dashboard" className="landing-brand" aria-label="TattvaGyaan home"><BookOpen size={26} strokeWidth={1.4} aria-hidden="true" /><span>TattvaGyaan<small>ज्ञान से आत्मबोध तक</small></span></Link>
        <nav className="landing-desktop-nav" aria-label="Main navigation">{navigation.map(([label, path]) => <Link to={path} key={path}>{label}</Link>)}</nav>
        <div className="landing-user-actions"><Link className="landing-plans-link" to="/reading-plans" aria-label="Reading Plans" title="Reading Plans"><BookMarked size={20} /></Link><Link className="landing-account" to="/profile">{user?.displayName || user?.username || 'My profile'}<ArrowRight size={16} aria-hidden="true" /></Link><button onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={19} /></button></div>
        <button className="landing-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="landing-mobile-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
        {menuOpen && <nav id="landing-mobile-navigation" className="landing-mobile-nav" aria-label="Mobile navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); document.querySelector('.landing-menu-toggle')?.focus(); } }}>
          {navigation.map(([label, path]) => <Link to={path} key={path} onClick={() => setMenuOpen(false)}>{label}<ArrowRight size={16} aria-hidden="true" /></Link>)}
          <Link to={user ? '/profile' : '/login'} onClick={() => setMenuOpen(false)}>{user ? 'My profile' : 'Sign in'}</Link>
          <Link to="/reading-plans" onClick={() => setMenuOpen(false)}>Reading Plans</Link><button onClick={signOut}>Log out</button>
        </nav>}
      </header>
      {logoutError && <p className="landing-logout-error" role="alert">{logoutError}</p>}
      <div className="landing-hero-content" id="landing-content">
        <h1 id="landing-title">Where wisdom<br />meets <em>devotion.</em></h1>
        <p className="landing-hero-hindi" lang="hi">ज्ञान, भक्ति और आत्मचिंतन की एक यात्रा।</p>
        <p className="landing-hero-description">Discover Hindu scriptures, sacred prayers, and a quieter space for reflection. Begin with a page. Return with a deeper understanding.</p>
        <div className="landing-hero-actions"><Link className="landing-primary" to="/library">Explore the library <ArrowRight size={19} aria-hidden="true" /></Link><Link className="landing-secondary" to="/chalisas/hanuman-chalisa">Read Hanuman Chalisa <ArrowRight size={17} aria-hidden="true" /></Link></div>
      </div>
      <div className="landing-hero-bottom"><p>A little time for the eternal.</p><a href="#daily-devotion">Discover TattvaGyaan <ArrowDown size={17} aria-hidden="true" /></a></div>
    </section>
    <DailyPanchang />
    <section className="dashboard-journey landing-section" aria-labelledby="journey-title">
      <div className="dashboard-journey-copy">
        <h2 id="journey-title">Discover the stories<br />of Shri Ganesha.</h2>
        <p lang="hi" className="dashboard-hindi">श्री गणेश · ज्ञान और शुभारंभ</p>
        <p>Explore illustrated retellings of Ganesha’s birth, his family, and his role as the scribe of the Mahabharata.</p>
        <Link to="/journeys/ganesha" className="landing-primary">Explore Divine Journeys <ArrowRight size={18} aria-hidden="true" /></Link>
        <p className="dashboard-story-note">Artistic illustrations and retellings, with sources provided in the journey.</p>
      </div>
      <Link to="/journeys/ganesha" className="dashboard-journey-art" aria-label="Explore Ganesha’s illustrated journey">
        <img src="/journeys/ganesha.png" alt="Ganesha seated with his mouse beside a lotus pond in a Himalayan temple garden" loading="lazy" width="1536" height="1024" />
      </Link>
    </section>
    <section id="daily-devotion" className="dashboard-devotion landing-section" aria-labelledby="devotion-title">
      <div className="dashboard-section-heading">
        <div><h2 id="devotion-title">Prayers for your daily practice</h2><p>Read chalisas, bhajans and mantras in Hindi, with Roman transliteration.</p></div>
        <Link className="landing-text-link" to="/mantras/gayatri-mantra">Read the Gayatri Mantra <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
      <div className="dashboard-prayers">{collections.map(collection => <article key={collection.path} className="dashboard-prayer">
        <Link to={collection.path} className="dashboard-prayer-main">
          <img src={collection.image} alt={collection.alt} loading="lazy" width="1536" height="1024" />
          <div><h3>{collection.title}</h3><p className="dashboard-hindi" lang="hi">{collection.hindi}</p><p>{collection.description}</p><span className="dashboard-read-link">Read {collection.category === 'Bhajans' ? 'bhajan' : collection.category === 'Mantras' ? 'mantra' : 'chalisa'} <ArrowRight size={17} aria-hidden="true" /></span></div>
        </Link>
        <Link to={collection.browse} className="dashboard-browse-link">Browse all {collection.category.toLowerCase()} <ArrowRight size={16} aria-hidden="true" /></Link>
      </article>)}</div>
    </section>
    <section className="landing-scriptures" aria-labelledby="scriptures-title"><div className="landing-section landing-scriptures-inner">
      <div className="landing-section-intro"><BookOpen className="landing-book-symbol" size={30} strokeWidth={1.3} aria-hidden="true" /><h2 id="scriptures-title">Explore the scripture library</h2><p>Read the available Hindi editions, save your place, and keep notes on passages that stay with you.</p><Link className="landing-primary landing-light-button" to="/library">Enter the scripture library <ArrowRight size={18} aria-hidden="true" /></Link><span className="landing-account-note">Edition details and source information are included with each book.</span></div>
      <div className="landing-book-list">{books.map(book => <Link className="landing-book" key={book.title} to={`/library?search=${encodeURIComponent(book.title)}`}><div><span lang="hi">{book.hindi}</span><h3>{book.title}</h3><p>{book.description}</p></div><ArrowRight size={22} strokeWidth={1.4} aria-hidden="true" /></Link>)}<Link className="landing-all-books" to="/library">Explore all books <ArrowRight size={17} aria-hidden="true" /></Link></div>
    </div></section>
    <section className="landing-closing landing-section"><h2>Your practice. Your pace.</h2><p lang="hi">हर दिन, एक नई शुरुआत।</p><p className="landing-closing-description">A prayer in the morning, a passage in the evening.<br />There is always a place to begin.</p><Link className="landing-text-link" to="/chalisas">Find your next prayer <ArrowRight size={18} aria-hidden="true" /></Link></section>
  </div>;
}
