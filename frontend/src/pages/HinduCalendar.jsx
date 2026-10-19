import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Sunrise, Sunset } from 'lucide-react';
import { api } from '../api/client';
import { DevotionalState } from '../components/DevotionalShared';

const indiaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateLabel = date => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default function HinduCalendar() {
  const [params, setParams] = useSearchParams();
  const today = indiaToday();
  const year = Number(params.get('year') ?? today.slice(0, 4));
  const month = Number(params.get('month') ?? today.slice(5, 7));
  const validMonth = Number.isInteger(year) && year >= 2000 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12;
  const selectedDate = params.get('day') || (today.startsWith(`${year}-${String(month).padStart(2, '0')}`) ? today : `${year}-${String(month).padStart(2, '0')}-01`);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    if (!validMonth) { setError('Choose a valid month and year.'); return () => controller.abort(); }
    api.getCalendarMonth(year, month, controller.signal).then(setResult).catch(err => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [year, month, validMonth, retry]);
  function changeMonth(delta) {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    setParams({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });
  }
  const monthName = validMonth ? new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Calendar';
  const selected = result?.days.find(day => day.date === selectedDate) || result?.days[0];
  const festivalDays = result?.days.filter(day => day.data.festivals.length) || [];
  return <div className="dev-page">
    <header className="dev-heading"><div><p className="dev-eyebrow">Days of celebration & reflection</p><h1>Hindu Calendar</h1><p lang="hi" className="dev-hindi-subtitle">हिन्दू पंचांग</p><p className="dev-description">Explore daily tithi, nakshatra, and festivals. Select a date to see its Panchang and timings.</p></div><div className="dev-source-note"><CalendarDays size={44} strokeWidth={1} /><span>New Delhi · India Standard Time</span></div></header>
    {!validMonth && <button className="dev-button" onClick={() => setParams({})}>Return to this month</button>}
    {!result || error ? <DevotionalState loading={!error} error={error} onRetry={() => setRetry(r => r + 1)} /> : <>
      <div className="dev-calendar-toolbar"><h2>{monthName}</h2><div><button className="dev-button" aria-label="Previous month" disabled={!validMonth || (result.availableFrom && `${year}-${String(month).padStart(2, '0')}-01` <= result.availableFrom)} onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button><button className="dev-button" onClick={() => setParams({ year: today.slice(0, 4), month: Number(today.slice(5, 7)), day: today })}>Today</button><button className="dev-button" aria-label="Next month" disabled={!validMonth || (result.availableTo && `${year}-${String(month).padStart(2, '0')}` >= result.availableTo.slice(0, 7))} onClick={() => changeMonth(1)}><ChevronRight size={18} /></button></div></div>
      {!result.days.length ? <div className="dev-state"><h2>No calendar data for this month</h2><p>{result.availableFrom ? `Available dates: ${result.availableFrom} to ${result.availableTo}.` : 'The calendar has not been imported yet.'}</p>{result.availableFrom && <button className="dev-button" onClick={() => setParams({ year: result.availableFrom.slice(0, 4), month: Number(result.availableFrom.slice(5, 7)) })}>Open available calendar</button>}</div> : <div className="dev-calendar-layout">
        <section aria-label={monthName}>
          <div className="dev-calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="dev-weekday" key={day}>{day}</div>)}
            {Array.from({ length: new Date(Date.UTC(year, month - 1, 1)).getUTCDay() }, (_, i) => <div className="dev-empty-day" key={`empty-${i}`} />)}
            {result.days.map(day => <button key={day.date} onClick={() => setParams({ year, month, day: day.date })} aria-label={`${dateLabel(day.date)}, ${day.data.tithi.name}${day.data.festivals.length ? `, ${day.data.festivals.join(', ')}` : ''}`} aria-pressed={selected?.date === day.date} aria-current={day.date === today ? 'date' : undefined} className={`dev-calendar-day ${day.data.festivals.length ? 'has-festival' : ''}`}>
              <span className="dev-day-number">{Number(day.date.slice(8))}</span><span className="dev-day-tithi">{day.data.tithi.name}</span><span className="dev-day-hindi" lang="hi">{day.data.tithi.hindi}</span>{day.data.festivals.length > 0 && <span className="dev-day-festival">{day.data.festivals.join(' · ')}</span>}
            </button>)}
          </div>
          <p className="dev-footnote">{result.note} Select a day for details.</p>
          <section className="dev-month-festivals"><h2>Festivals this month</h2>{festivalDays.length ? festivalDays.map(day => <button key={day.date} onClick={() => setParams({ year, month, day: day.date })}><span className="dev-festival-date">{Number(day.date.slice(8))}</span><span>{day.data.festivals.join(' · ')}</span><ChevronRight size={16} /></button>) : <p>No festivals listed by the source this month.</p>}</section>
        </section>
        {selected && <aside className="dev-panchang" aria-label="Selected day Panchang" aria-live="polite"><p className="dev-eyebrow">Daily Panchang</p><h2>{dateLabel(selected.date)}</h2><p lang="hi" className="dev-hindi-subtitle">{selected.data.hinduMonth?.hindi} · विक्रम संवत् {selected.data.vikramSamvat}</p>
          {selected.data.festivals.length > 0 && <p className="dev-selected-festival">{selected.data.festivals.join(' · ')}</p>}
          <dl>{[['Tithi', 'tithi'], ['Nakshatra', 'nakshatra'], ['Yoga', 'yoga'], ['Karana', 'karana']].map(([label, key]) => selected.data[key] && <div key={key}><dt>{label}</dt><dd>{selected.data[key].name}<span lang="hi">{selected.data[key].hindi}</span><small>Until {selected.data[key].endsAt} · then {selected.data[key].next}</small></dd></div>)}</dl>
          <div className="dev-sun-times"><div><Sunrise size={19} /><small>Sunrise</small><strong>{selected.data.sunrise}</strong></div><div><Sunset size={19} /><small>Sunset</small><strong>{selected.data.sunset}</strong></div></div>
          <dl>{[['Moonrise', 'moonrise'], ['Moonset', 'moonset'], ['Rahu kaal', 'rahuKaal'], ['Yamaganda', 'yamaganda'], ['Gulika kaal', 'gulikaKaal']].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{selected.data[key]?.trim() === '-' ? 'Not listed' : selected.data[key] || 'Not listed'}</dd></div>)}</dl>
          <p className="dev-footnote">Timings for New Delhi · India Standard Time.</p>
        </aside>}
      </div>}
    </>}
  </div>;
}
