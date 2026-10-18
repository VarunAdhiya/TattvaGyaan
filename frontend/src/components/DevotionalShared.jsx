import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, RefreshCw } from 'lucide-react';

export const devotionalSections = {
  chalisa: { title: 'Chalisas', hindi: 'चालीसा संग्रह', path: '/chalisas', description: 'Devotional hymns for your daily practice. Find a prayer, settle in, and read at your own pace.' },
  bhajan: { title: 'Bhajans', hindi: 'भजन संग्रह', path: '/bhajans', description: 'Songs of devotion, gathered in one place. Explore by deity and read in Hindi or Roman transliteration.' },
  mantra: { title: 'Mantras', hindi: 'मंत्र संग्रह', path: '/mantras', description: 'Sacred words for quiet reflection. Browse the collection and keep your chosen mantra close.' },
};

export function SourceLink({ href = 'https://www.hinduaarti.com/', children = 'Hindu Aarti', className = '' }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`dev-source ${className}`}>{children}<ArrowUpRight size={14} aria-hidden="true" /></a>;
}

export function DevotionalCard({ text }) {
  return <Link to={`${devotionalSections[text.category].path}/${text.slug}`} className="dev-card">
    <span className="dev-card-deity">{text.deity}</span>
    <h2>{text.title}</h2>
    <p lang="hi" className="dev-card-hindi">{text.titleHindi}</p>
    <span className="dev-card-foot">{text.contentStatus === 'source_link' ? 'View source details' : 'Read prayer'}<ArrowRight size={17} aria-hidden="true" /></span>
  </Link>;
}

export function DevotionalState({ loading, error, onRetry }) {
  if (loading) return <div role="status" className="dev-state"><span className="dev-loading" />Loading…</div>;
  return <div role="alert" className="dev-state"><h2>Unable to load this section</h2><p>{error}</p><button className="dev-button" onClick={onRetry}><RefreshCw size={16} />Try again</button></div>;
}
