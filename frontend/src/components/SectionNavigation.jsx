import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Flower2, Music2, Sparkles, CalendarDays } from 'lucide-react';

const sections = [
  ['/dashboard', 'Library', BookOpen], ['/chalisas', 'Chalisas', Flower2],
  ['/bhajans', 'Bhajans', Music2], ['/mantras', 'Mantras', Sparkles],
  ['/calendar', 'Calendar', CalendarDays],
];

export default function SectionNavigation() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/reader/')) return null;
  return <div className="section-navigation">
    <nav aria-label="Explore sections" className="section-navigation-inner">
      {sections.map(([to, label, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => `section-link ${isActive ? 'is-active' : ''}`}>
        <Icon size={17} aria-hidden="true" /><span>{label}</span>
      </NavLink>)}
    </nav>
  </div>;
}
