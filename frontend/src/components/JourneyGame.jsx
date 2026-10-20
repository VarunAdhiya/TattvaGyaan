import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, Expand, Flower2, Map, Move, Pause, Play, Volume2, X } from 'lucide-react';
import { ganeshaLevels, journeySources } from '../data/divineJourneys';
import '../journey-game.css';

function SacredWorld({ current, overview, still, layoutKey, onChoose, onTravel }) {
  const host = useRef(null);
  const world = useRef(null);
  const settings = useRef({ current, overview, still });
  const actions = useRef({ onChoose, onTravel });
  const [failed, setFailed] = useState(false);
  const [artReady, setArtReady] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { actions.current = { onChoose, onTravel }; }, [onChoose, onTravel]);
  useEffect(() => {
    settings.current = { current, overview, still };
    world.current?.setDestination(current, overview, still);
  }, [current, overview, still, layoutKey]);
  useEffect(() => {
    let cancelled = false;
    const container = host.current;
    import('../lib/sacredWorld').then(({ createSacredWorld }) => {
      if (cancelled) return;
      world.current = createSacredWorld(container, {
        onReady: setArtReady,
        onFailure: () => setFailed(true),
        onSelect: index => actions.current.onChoose(index),
        onTravel: value => actions.current.onTravel(value),
      });
      const config = settings.current;
      world.current.setDestination(config.current, config.overview, config.still);
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; world.current?.dispose(); world.current = null; };
  }, []);
  return <div className={`sacred-world ${failed ? 'world-fallback' : ''}`} ref={host} data-ready={ready} data-art-ready={artReady}>
    {ganeshaLevels.map((level, index) => <button key={level.id} data-world-pin={index} className={`world-pin ${index === current ? 'is-active' : ''}`} hidden={!overview || failed} onClick={() => onChoose(index)} aria-label={`Visit ${level.title}`}><span>{index + 1}</span><strong>{level.title}</strong></button>)}
    {!ready && !failed && <div className="world-loading" role="status"><Compass size={30} /><p>Opening the gates of Kailash…</p></div>}
    {failed && <div className="world-fallback-scene"><img key={current} src={ganeshaLevels[current].image} alt={ganeshaLevels[current].alt} /><p>3D is unavailable in this browser. You can still explore every chapter.</p></div>}
    <span className="journey-sr-only">A three-dimensional artistic interpretation of {ganeshaLevels[current].title}, with sculpted figures on an island surrounded by blue waves.</span>
  </div>;
}

export default function JourneyGame({ current, visited, still, setStill, visit, finish, ringBell, audioStatus, saveError }) {
  const [overview, setOverview] = useState(false);
  const [travelling, setTravelling] = useState(false);
  const [details, setDetails] = useState(false);
  const [artOpen, setArtOpen] = useState(false);
  const title = useRef(null);
  const artDialog = useRef(null);
  const artButton = useRef(null);
  const level = ganeshaLevels[current];
  const source = journeySources[level.source];

  function choose(index) { setOverview(false); setDetails(false); setArtOpen(false); visit(index); }
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [current]);
  useEffect(() => {
    if (artOpen) artDialog.current?.showModal();
    else artDialog.current?.close();
  }, [artOpen]);
  useEffect(() => {
    function keydown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest?.('input, textarea, select, summary, dialog') || artOpen) return;
      if (event.key === 'ArrowRight' && current < 7) { event.preventDefault(); choose(current + 1); }
      if (event.key === 'ArrowLeft' && current > 0) { event.preventDefault(); choose(current - 1); }
      if (event.key === 'Escape') { setOverview(false); setDetails(false); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
  function closeArt() { setArtOpen(false); artButton.current?.focus(); }

  return <section className={`journey-game ${overview ? 'is-overview' : ''} ${still ? 'is-still' : ''}`} aria-label="Ganesha interactive journey">
    <SacredWorld current={current} overview={overview} still={still || artOpen} layoutKey={details} onChoose={choose} onTravel={setTravelling} />
    <header className="game-header">
      <Link className="game-home" to="/journeys/ganesha"><ArrowLeft size={18} /><span>All deities</span></Link>
      <div className="game-brand"><Flower2 size={22} /><span>Ganesha’s world<small lang="hi">श्री गणेश की यात्रा</small></span></div>
      <div className="game-tools">
        <button onClick={() => setOverview(value => !value)} aria-label={overview ? 'Return to chapter' : 'Explore world map'} aria-pressed={overview}><Map size={18} /><span>{overview ? 'Return' : 'World map'}</span></button>
        <button onClick={ringBell} aria-label="Ring temple bell"><Volume2 size={18} /></button>
        <button onClick={() => setStill(value => !value)} aria-label={still ? 'Enable scene motion' : 'Pause scene motion'} aria-pressed={still}>{still ? <Play size={18} /> : <Pause size={18} />}</button>
      </div>
    </header>
    <p className="journey-sr-only" role="status">{audioStatus}</p>
    <div className="game-location" aria-live="polite"><span className={travelling ? 'is-travelling' : ''} /><span>{overview ? 'Eight sacred places. Choose where to go.' : travelling ? `Travelling to ${level.title}…` : level.place}</span></div>
    {overview ? <div className="game-map-intro"><h1>Follow your curiosity.</h1><p>Choose an island or any chapter below.<br />Every part of the journey is open to you.</p></div> : <>
      <div className="game-scene-actions">
        <span><Move size={15} />Drag to explore in 3D</span>
        <button ref={artButton} onClick={() => setArtOpen(true)}><Expand size={16} />View illustration</button>
      </div>
      <svg className="game-story-tether" aria-hidden="true"><path data-world-leader /></svg>
      <article className="game-story" data-world-story key={level.id}>
        <div className="game-story-heading"><span className="game-level-number">{String(current + 1).padStart(2, '0')}</span><span lang="hi">{level.hindi}</span><span className="game-visited"><Check size={12} />Visited</span></div>
        <h1 ref={title} tabIndex={-1}>{level.title}</h1>
        <p>{level.story}</p>
        <button className="game-details-toggle" aria-expanded={details} aria-controls="game-story-details" onClick={() => setDetails(value => !value)}>Reflection & story source<ChevronDown size={15} /></button>
        {details && <div id="game-story-details" className="game-story-details"><p><strong>{level.insight}.</strong> {level.reflection}</p><p>{level.detail}</p><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowRight size={13} /></a></div>}
      </article>
      <div className="game-navigation">
        <button className="game-back" onClick={() => choose(current - 1)} disabled={current === 0} aria-label="Previous chapter"><ArrowLeft size={22} /><span>Back</span></button>
        <button className="game-next" onClick={() => current === 7 ? finish() : choose(current + 1)} aria-label={current === 7 ? 'Finish journey' : 'Next chapter'}><span><small>{current === 7 ? 'Carry the wisdom with you' : `Up next · ${ganeshaLevels[current + 1].title}`}</small><strong>{current === 7 ? 'Finish' : 'Next'}</strong></span><ArrowRight size={29} /></button>
      </div>
    </>}
    <nav className="game-trail" aria-label="Journey levels">
      <div className="game-trail-summary"><Compass size={16} /><span>{visited.length} / 8 explored</span><small>{saveError ? 'Saving unavailable' : 'Saved on this browser'}</small></div>
      <ol>{ganeshaLevels.map((item, index) => <li key={item.id}><button onClick={() => choose(index)} aria-label={`Level ${index + 1}: ${item.title}`} aria-current={current === index ? 'step' : undefined} className={visited.includes(item.id) ? 'was-visited' : ''}><span>{visited.includes(item.id) ? <Check size={13} /> : index + 1}</span><strong>{item.title}</strong></button></li>)}</ol>
    </nav>
    <dialog ref={artDialog} className="game-art-dialog" onCancel={event => { event.preventDefault(); closeArt(); }} onClick={event => { if (event.target === event.currentTarget) closeArt(); }}>
      <button className="game-art-close" onClick={closeArt} aria-label="Close scene"><X size={22} /></button>
      <img src={level.image} alt={level.alt} />
      <div><strong>{level.title}</strong><span>{level.place}</span></div>
    </dialog>
  </section>;
}
