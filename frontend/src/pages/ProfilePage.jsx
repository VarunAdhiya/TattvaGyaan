import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Bookmark, Check, Flower2, Loader2, NotebookPen, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import '../profile.css';

const LEGACY_LANGUAGES = { mr: 'Marathi', sa: 'Sanskrit', ar: 'Arabic', ur: 'Urdu', pa: 'Punjabi' };
function dateLabel(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
}
const toDraft = user => ({ displayName: user.displayName || '', preferredLang: user.preferredLang || 'hi' });

export default function ProfilePage() {
  const { updateProfile } = useAuth();
  const [account, setAccount] = useState(null);
  const [draft, setDraft] = useState(null);
  const [activity, setActivity] = useState(null);
  const [accountError, setAccountError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [revision, setRevision] = useState(0);
  const [activityRevision, setActivityRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    api.getProfile().then(({ user }) => {
      if (active) { setAccount(user); setDraft(toDraft(user)); }
    }).catch(error => { if (active) setAccountError(error.message || 'Your account could not be loaded.'); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    api.getProfileActivity(controller.signal).then(data => {
      if (!controller.signal.aborted) setActivity(data);
    }).catch(error => { if (!controller.signal.aborted) setActivityError(error.message || 'Your reading activity could not be loaded.'); });
    return () => controller.abort();
  }, [activityRevision]);

  const dirty = account && draft && (draft.displayName.trim() !== (account.displayName || '') || draft.preferredLang !== account.preferredLang);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function edit(field, value) { setDraft(current => ({ ...current, [field]: value })); setSaved(false); setSaveError(''); }
  async function save(event) {
    event.preventDefault();
    if (saving || !dirty) return;
    if (!draft.displayName.trim()) { setSaveError('Enter a display name before saving.'); return; }
    setSaving(true); setSaveError(''); setSaved(false);
    try {
      const user = await updateProfile({ displayName: draft.displayName.trim(), preferredLang: draft.preferredLang });
      setAccount(user); setDraft(toDraft(user)); setSaved(true);
    } catch (error) { setSaveError(error.details?.map(item => item.message).join('. ') || error.message || 'Could not save your profile. Please try again.'); }
    finally { setSaving(false); }
  }

  return <div className="profile-sanctuary">
    <header className="profile-intro"><div><h1>My profile</h1><p>Your account, your reflections, your reading journey.</p></div><Link className="profile-text-link" to="/library">Return to the library <ArrowRight size={18} /></Link></header>
    <div className="profile-columns">
      <section className="profile-account" aria-labelledby="account-heading" aria-busy={!account && !accountError}>
        {!account ? accountError ? <div className="profile-feedback" role="alert"><h2 id="account-heading">Account unavailable</h2><p>{accountError}</p><button className="profile-secondary" onClick={() => { setAccountError(''); setRevision(value => value + 1); }}><RefreshCw size={16} /> Retry account</button></div>
          : <p className="profile-loading" role="status"><Loader2 size={20} /> Loading your account…</p>
          : <>
            <div className="profile-identity"><div className="profile-avatar" aria-hidden="true"><Flower2 size={35} strokeWidth={1.3} /></div><div><h2 id="account-heading">{account.displayName || account.username}</h2>{dateLabel(account.createdAt) && <p>Member since {dateLabel(account.createdAt)}</p>}</div></div>
            <form onSubmit={save} aria-label="Profile settings">
              <h3>Account & preferences</h3>
              <label htmlFor="profile-name">Display name</label>
              <input id="profile-name" autoComplete="name" maxLength={100} required value={draft.displayName} disabled={saving} onChange={event => edit('displayName', event.target.value)} aria-describedby="profile-name-help" />
              <p id="profile-name-help" className="profile-help">How your name appears across TattvaGyaan.</p>
              <dl className="profile-details"><div><dt>Email address</dt><dd>{account.email}</dd></div><div><dt>Username</dt><dd>{account.username}</dd></div></dl>
              <label htmlFor="profile-language">Preferred language</label>
              <select id="profile-language" value={draft.preferredLang} disabled={saving} onChange={event => edit('preferredLang', event.target.value)} aria-describedby="profile-language-help">
                <option value="hi">हिन्दी (Hindi)</option><option value="en">English</option>
                {!['hi', 'en'].includes(account.preferredLang) && <option value={account.preferredLang}>{LEGACY_LANGUAGES[account.preferredLang] || account.preferredLang} (previous preference)</option>}
              </select>
              <p id="profile-language-help" className="profile-help">Hindi or English sets the default language for new AI explanations. Original book text stays in its source language.</p>
              <div className="profile-save-actions"><button className="profile-primary" disabled={saving || !dirty} type="submit">{saving ? <Loader2 size={17} className="profile-spin" /> : <Check size={17} />}{saving ? 'Saving…' : 'Save changes'}</button>
                {dirty && <button type="button" className="profile-secondary" disabled={saving} onClick={() => { setDraft(toDraft(account)); setSaveError(''); setSaved(false); }}>Cancel</button>}</div>
              {saveError && <p className="profile-feedback profile-error" role="alert">{saveError}</p>}
              <p className="profile-save-status" role="status">{saved ? 'Your profile has been saved.' : dirty ? 'You have unsaved changes.' : dateLabel(account.updatedAt) ? `Last updated ${dateLabel(account.updatedAt)}` : ''}</p>
            </form>
            <div className="profile-sign-in"><ShieldCheck size={21} /><div><h3>Sign-in methods</h3><p>{account.signInMethods?.google && account.signInMethods?.password ? 'Google and email with password' : account.signInMethods?.google ? 'Google account' : account.signInMethods?.password ? 'Email with password' : 'Unavailable'}</p><span>Your bookmarks and notes stay with this account.</span></div></div>
          </>}
      </section>
      <section className="profile-journal" aria-labelledby="journal-heading" aria-busy={!activity && !activityError}>
        <div className="profile-section-heading"><div><h2 id="journal-heading">Your reading journal</h2><p>A place for the words you return to.</p></div><BookOpen size={28} strokeWidth={1.3} aria-hidden="true" /></div>
        {!activity ? activityError ? <div className="profile-feedback" role="alert"><p>We couldn’t load your saved reading. Your account settings are still available.</p><button className="profile-secondary" onClick={() => { setActivityError(''); setActivityRevision(value => value + 1); }}><RefreshCw size={16} /> Retry reading activity</button></div>
          : <p className="profile-loading" role="status"><Loader2 size={20} /> Loading your saved reading…</p>
          : <>
            <dl className="profile-totals">{[[activity.stats.booksOpened, 'Books opened'], [activity.stats.bookmarks, 'Bookmarks'], [activity.stats.notes, 'Notes'], [activity.stats.completedPlans, 'Plans completed']].map(([count, label]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
            <div className="profile-books-heading"><h3>Your books</h3><span>Bookmarks & notes, kept together by book</span></div>
            {!activity.books.length ? <div className="profile-empty"><BookOpen size={38} strokeWidth={1.2} /><h3>Your next chapter starts here.</h3><p>Open a book to begin. Saved reading, bookmarks, and notes will appear here as you go.</p><Link className="profile-primary" to="/library">Explore the library <ArrowRight size={17} /></Link></div>
              : <ul className="profile-books">{activity.books.map(book => <li key={book.scriptureId}>
                <div className="profile-book-copy"><h4>{book.title}</h4><p>{book.lastReadAt ? `Last opened ${dateLabel(book.lastReadAt)}` : 'Saved in your library'}</p><div className="profile-book-counts"><span><Bookmark size={14} />{book.bookmarks} {book.bookmarks === 1 ? 'bookmark' : 'bookmarks'}</span><span><NotebookPen size={14} />{book.notes} {book.notes === 1 ? 'note' : 'notes'}</span></div></div>
                <Link className="profile-book-link" to={`/reader/${encodeURIComponent(book.scriptureId)}/${encodeURIComponent(book.editionId)}`} aria-label={`Open ${book.title}`}>{book.lastReadAt ? 'Continue reading' : 'Open book'}<ArrowRight size={18} /></Link>
                {book.percentage !== null && <div className="profile-book-progress"><progress max="100" value={book.percentage} aria-label={`${book.title} saved position`} /><span>{Math.round(book.percentage)}% saved position</span></div>}
              </li>)}</ul>}
            <Link className="profile-plans" to="/reading-plans"><div><h3>Make time for your reading</h3><p>Visit your plans and continue at your own pace.</p></div><span>Reading plans <ArrowRight size={18} /></span></Link>
          </>}
      </section>
    </div>
  </div>;
}
