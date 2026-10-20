import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Flower2, Map, Mountain, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deities, ganeshaLevels } from '../data/divineJourneys';
import { readJourneyProgress } from '../lib/journeyProgress';
import JourneyGame from '../components/JourneyGame';
import '../journeys.css';

function Scene({ image, alt, still }) {
  const scene = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  function tilt(event) {
    if (still || event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    scene.current?.style.setProperty('--scene-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 10}px`);
    scene.current?.style.setProperty('--scene-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 6}px`);
  }
  function reset() {
    scene.current?.style.setProperty('--scene-x', '0px');
    scene.current?.style.setProperty('--scene-y', '0px');
  }
  return <div ref={scene} className={`journey-scene ${still ? 'is-still' : ''}`} onPointerMove={tilt} onPointerLeave={reset}>
    {!failed && <img key={image} src={image} alt={alt} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} fetchPriority="high" className={loaded ? 'is-loaded' : ''} />}
    {failed && <div className="journey-image-fallback"><Mountain size={48} /><p>The scene could not load. Your story is still available.</p><button onClick={() => { setFailed(false); setLoaded(false); }}>Retry illustration</button></div>}
    <div className="journey-scene-shade" />
    {!still && <div className="journey-motes" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</div>}
  </div>;
}

function JourneyMap({ current, completed, onChoose, compact = false }) {
  return <div className={`journey-map ${compact ? 'is-compact' : ''}`}>
    <svg viewBox="0 0 1000 170" preserveAspectRatio="none" aria-hidden="true"><path d="M90 112 C150 112 150 71 210 71 S270 102 330 102 S390 58 450 58 S510 92 570 92 S630 49 690 49 S750 83 810 83 S870 41 920 41" /></svg>
    <ol aria-label="Ganesha journey levels">
      {ganeshaLevels.map((level, index) => {
        const done = completed.includes(level.id);
        return <li key={level.id} style={{ '--node-x': `${level.position[0]}%`, '--node-y': `${level.position[1]}%` }}>
          <button onClick={() => onChoose(index)} aria-current={current === index ? 'step' : undefined} aria-label={`Level ${index + 1}: ${level.title}${done ? ', visited' : ''}`} className={`${done ? 'is-complete' : ''} ${current === index ? 'is-current' : ''}`}>
            <span className="journey-node">{done ? <Check size={18} /> : String(index + 1).padStart(2, '0')}</span>
            <span className="journey-node-title">{level.title}</span>
          </button>
        </li>;
      })}
    </ol>
  </div>;
}

function JourneyExperience({ userId }) {
  const { deityId = 'ganesha' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const deity = deities.find(item => item.id === deityId);
  const storageKey = `tattvagyaan:journey:v1:${userId}:ganesha`;
  const [progress, setProgress] = useState(() => readJourneyProgress(storageKey));
  const [saveError, setSaveError] = useState(false);
  const [still, setStill] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [audioStatus, setAudioStatus] = useState('');
  const audio = useRef(null);
  const title = useRef(null);
  const requestedLevel = Number(params.get('level'));
  const exploring = deityId === 'ganesha' && params.has('level');
  const current = exploring && Number.isInteger(requestedLevel) && requestedLevel >= 1
    ? Math.min(requestedLevel - 1, ganeshaLevels.length - 1) : progress.current;
  const complete = params.get('complete') === '1' && deityId === 'ganesha';

  useEffect(() => {
    // This effect synchronizes the save result from the external browser store.
    /* eslint-disable react/set-state-in-effect */
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...progress }));
      setSaveError(false);
    } catch { setSaveError(true); }
    /* eslint-enable react/set-state-in-effect */
  }, [progress, storageKey]);
  useEffect(() => {
    if (exploring && params.get('level') !== String(current + 1)) setParams({ level: String(current + 1) }, { replace: true });
  }, [exploring, current, params, setParams]);
  useEffect(() => {
    if (complete) {
      title.current?.focus({ preventScroll: true });
      title.current?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [current, exploring, complete]);
  useEffect(() => {
    // Browser back/forward changes the URL outside the chapter button handlers.
    // Keep the saved position synchronized with that external navigation.
    // eslint-disable-next-line react/set-state-in-effect
    if (exploring) setProgress(previous => {
      const id = ganeshaLevels[current].id;
      if (previous.current === current && previous.completed.includes(id)) return previous;
      return { current, completed: previous.completed.includes(id) ? previous.completed : [...previous.completed, id] };
    });
  }, [current, exploring]);
  useEffect(() => () => { if (audio.current) void audio.current.close(); }, []);
  useEffect(() => {
    const next = ganeshaLevels[current + 1];
    if (exploring && next) { const preload = new Image(); preload.src = next.image; }
  }, [current, exploring]);

  function visit(index) {
    const next = Math.max(0, Math.min(index, ganeshaLevels.length - 1));
    setProgress(previous => ({ ...previous, current: next }));
    setParams({ level: String(next + 1) });
  }
  async function ringBell() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { setAudioStatus('Temple bell is unavailable in this browser.'); return; }
      if (!audio.current) audio.current = new AudioContext();
      await audio.current.resume();
      const now = audio.current.currentTime;
      [440, 880, 1188, 1760].forEach((frequency, index) => {
        const oscillator = audio.current.createOscillator();
        const gain = audio.current.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.07 / (index + 1), now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3);
        oscillator.connect(gain); gain.connect(audio.current.destination);
        oscillator.start(now); oscillator.stop(now + 3.1);
      });
      setAudioStatus('Temple bell sounded.');
    } catch { setAudioStatus('Temple bell could not play. You can continue in silence.'); }
  }

  if (!deity) return <section className="journey-not-found"><h1>Choose a divine journey</h1><p>This deity is not in the collection yet.</p><Link to="/journeys/ganesha">Meet Ganesha <ArrowRight size={18} /></Link></section>;
  if (exploring && !complete) return <JourneyGame current={current} visited={progress.completed} still={still} setStill={setStill} visit={visit} finish={() => setParams({ complete: '1' })} ringBell={ringBell} audioStatus={audioStatus} saveError={saveError} />;

  return <div className={`divine-journeys ${still ? 'journey-still' : ''}`}>
    <div className="journey-topline">
      <Link to={exploring || complete ? `/journeys/${deity.id}` : '/dashboard'}><ArrowLeft size={16} />{exploring || complete ? 'Choose a deity' : 'Back to home'}</Link>
      <span>Divine Journeys</span>
      <div className="journey-tools">
        <button onClick={ringBell} aria-label="Ring temple bell" title="Ring temple bell"><Volume2 size={18} /><span>Temple bell</span></button>
        <button onClick={() => setStill(value => !value)} aria-label={still ? 'Enable scene motion' : 'Pause scene motion'} aria-pressed={still} title={still ? 'Enable scene motion' : 'Pause scene motion'}>{still ? <Play size={17} /> : <Pause size={17} />}</button>
      </div>
    </div>
    <p className="journey-sr-only" role="status">{audioStatus}</p>
    {!exploring && !complete && <>
      <div className="journey-deity-select" role="group" aria-label="Choose a deity">
        {deities.map(item => <button key={item.id} aria-pressed={item.id === deity.id} onClick={() => navigate(`/journeys/${item.id}`)}><img src={item.image} alt="" /><span>{item.name}<small lang="hi">{item.hindi}</small></span>{item.id === deity.id && <Check size={16} />}</button>)}
      </div>
      <section className="journey-entrance" aria-labelledby="deity-heading">
        <Scene key={deity.id} image={deity.image} alt={deity.alt} still={still} />
        <div className="journey-entrance-copy">
          <span className="journey-invocation" lang="hi">{deity.hindi}</span>
          <h1 id="deity-heading">Enter the world of<br /><em>{deity.honorific}.</em></h1>
          <h2>{deity.title}</h2>
          <p>{deity.description}</p>
          {deity.id === 'ganesha' ? <>
            <button className="journey-primary" onClick={() => visit(progress.current)}>{progress.completed.length ? 'Continue your journey' : 'Enter the journey'}<ArrowRight size={19} /></button>
            <div className="journey-entrance-meta"><span><Map size={15} />8 sacred chapters</span><span><Flower2 size={15} />Explore at your own pace</span></div>
          </> : <><p className="journey-coming">This story journey is being prepared. For now, spend a moment with {deity.name} through prayer.</p><Link className="journey-primary" to={deity.prayer}>Explore {deity.name === 'Krishna' ? 'bhajans' : deity.name === 'Hanuman' ? 'Hanuman Chalisa' : 'mantras'}<ArrowRight size={19} /></Link><Link className="journey-other" to="/journeys/ganesha">Begin the Ganesha journey <ArrowRight size={16} /></Link></>}
        </div>
        <div className="journey-scene-caption"><Mountain size={16} /><span>{deity.quality}</span><small>Illustrated sacred world</small></div>
      </section>
      {deity.id === 'ganesha' && <section className="journey-trail-section" aria-labelledby="trail-heading">
        <div className="journey-section-title"><div><h2 id="trail-heading">A world of stories. Yours to explore.</h2><p>Enter the 3D world. Follow the path, or choose any chapter to begin.</p></div><span className="journey-progress-label"><Map size={18} />{progress.completed.length} / 8 explored</span></div>
        <JourneyMap current={progress.current} completed={progress.completed} onChoose={visit} />
        <p className="journey-tradition-note">An introduction to beloved Ganesha traditions, not an exhaustive biography. Tellings differ; the path moves from his origin stories toward continuing devotion.</p>
      </section>}
    </>}
    {complete && <section className="journey-completion" aria-labelledby="complete-heading">
      <Scene key="completion-scene" image="/journeys/river.png" alt="Warm lamps and Ganesha festival celebrations beside the river at sunset." still={still} />
      <div className="journey-completion-copy">
        <Flower2 size={52} strokeWidth={1} />
        <h1 ref={title} tabIndex={-1} id="complete-heading">The journey stays<br /><em>with you.</em></h1>
        <p>{progress.completed.length} of eight chapters explored.<br />Carry the stories you have visited into a moment of reflection. There is always more to discover.</p>
        <div className="journey-collected-petals">{ganeshaLevels.filter(item => progress.completed.includes(item.id)).map(item => <span key={item.id}><Check size={14} />{item.insight}</span>)}</div>
        <p className="journey-final-thought">The festival image returns to the river. The invitation to wisdom, care, and new beginnings remains.</p>
        <div className="journey-completion-actions"><button className="journey-primary" onClick={() => visit(0)}><RotateCcw size={17} />Walk the path again</button><Link className="journey-secondary" to="/journeys/ganesha">Choose a deity<ArrowRight size={17} /></Link></div>
        <span className="journey-invocation" lang="hi">गणपति बप्पा मोरया</span>
      </div>
    </section>}
    {saveError && !exploring && <p className="journey-save-error" role="status">Browser storage is unavailable. You can explore, but your progress may not remain after closing this page.</p>}
    <div className="journey-footnote"><Flower2 size={16} /><p>Sacred stories, thoughtfully retold. Illustrations are artistic interpretations. Traditions and their details vary.</p><Link to="/library">Explore the scriptures<ArrowRight size={15} /></Link></div>
  </div>;
}

export default function DivineJourneys() {
  const { user } = useAuth();
  return <JourneyExperience key={user.id} userId={user.id} />;
}
