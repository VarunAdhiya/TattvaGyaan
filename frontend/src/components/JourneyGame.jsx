import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, Flower2, Map } from 'lucide-react';
import { journeySources } from '../data/divineJourneys';
import '../journey-game.css';

function SacredWorld({ journey, current, overview, still, layoutKey, onChoose, onTravel }) {
  const levels = journey.levels;
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
        definition: journey,
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
  }, [journey]);
  return <div className={`sacred-world ${failed ? 'world-fallback' : ''}`} ref={host} data-ready={ready} data-art-ready={artReady}>
    {levels.map((level, index) => <button key={level.id} data-world-pin={index} className={`world-pin ${index === current ? 'is-active' : ''}`} hidden={!overview || failed} onClick={() => onChoose(index)} aria-label={`Visit ${level.title}`}><span>{index + 1}</span><strong>{level.title}</strong></button>)}
    {!ready && !failed && <div className="world-loading" role="status"><Compass size={30} /><p>{journey.loading}</p></div>}
    {failed && <div className={`world-fallback-scene ${levels[current].image === levels[current].sceneImage ? 'is-tableau' : ''}`}><img key={current} src={levels[current].image} alt={levels[current].alt} /><p>3D is unavailable in this browser. You can still explore every chapter.</p></div>}
    {ready && !artReady && !failed && <p className="world-art-loading" role="status">Preparing this chapter’s scene…</p>}
    <span className="journey-sr-only">{levels[current].sceneAlt} Realistic devotional artwork set among explorable 3D islands and blue waves.</span>
  </div>;
}

export default function JourneyGame({ deity, journey, current, visited, still, visit, finish, saveError }) {
  const [overview, setOverview] = useState(false);
  const [travelling, setTravelling] = useState(false);
  const [details, setDetails] = useState(false);
  const title = useRef(null);
  const levels = journey.levels;
  const last = levels.length - 1;
  const level = levels[current];
  const source = journeySources[level.source];

  function choose(index) { setOverview(false); setDetails(false); visit(index); }
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [current]);
  useEffect(() => {
    function keydown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest?.('input, textarea, select, summary, dialog')) return;
      if (event.key === 'ArrowRight' && current < last) { event.preventDefault(); choose(current + 1); }
      if (event.key === 'ArrowLeft' && current > 0) { event.preventDefault(); choose(current - 1); }
      if (event.key === 'Escape') { setOverview(false); setDetails(false); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });


  return <section className={`journey-game ${overview ? 'is-overview' : ''} ${still ? 'is-still' : ''}`} aria-label={`${deity.name} interactive journey`}>
    <SacredWorld journey={journey} current={current} overview={overview} still={still} layoutKey={details} onChoose={choose} onTravel={setTravelling} />
    <header className="game-header">
      <Link className="game-home" to={`/journeys/${deity.id}`}><ArrowLeft size={18} /><span>All deities</span></Link>
      <div className="game-brand"><Flower2 size={22} /><span>{deity.name}’s world<small lang="hi">{deity.hindi} की यात्रा</small></span></div>
      <div className="game-tools">
        <button onClick={() => setOverview(value => !value)} aria-label={overview ? 'Return to chapter' : 'Explore world map'} aria-pressed={overview}><Map size={18} /><span>{overview ? 'Return' : 'World map'}</span></button>
      </div>
    </header>
    <div className="game-location" aria-live="polite"><span className={travelling ? 'is-travelling' : ''} /><span>{overview ? `${levels.length} sacred places. Choose where to go.` : travelling ? `Travelling to ${level.title}…` : level.place}</span></div>
    {overview ? <div className="game-map-intro"><h1>Follow your curiosity.</h1><p>Choose an island or any chapter below.<br />Every part of the journey is open to you.</p></div> : <>
      <svg className="game-story-tether" aria-hidden="true"><path data-world-leader /></svg>
      <article className="game-story" data-world-story key={level.id}>
        <div className="game-story-heading"><span className="game-level-number">{String(current + 1).padStart(2, '0')}</span><span lang="hi">{level.hindi}</span><span className="game-visited"><Check size={12} />Visited</span></div>
        <h1 ref={title} tabIndex={-1}>{level.title}</h1>
        <p>{level.story}</p>
        <button className="game-details-toggle" aria-expanded={details} aria-controls="game-story-details" onClick={() => setDetails(value => !value)}>Reflection & story source<ChevronDown size={15} /></button>
        {details && <div id="game-story-details" className="game-story-details"><p><strong>{level.insight}.</strong> {level.reflection}</p><p>{level.detail}</p><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowRight size={13} /></a>{level.additionalSource && <a href={level.additionalSource.url} target="_blank" rel="noreferrer">{level.additionalSource.title}<ArrowRight size={13} /></a>}</div>}
      </article>
      <div className="game-navigation">
        <button className="game-back" onClick={() => choose(current - 1)} disabled={current === 0} aria-label="Previous chapter"><ArrowLeft size={22} /><span>Back</span></button>
        <button className="game-next" onClick={() => current === last ? finish() : choose(current + 1)} aria-label={current === last ? 'Finish journey' : 'Next chapter'}><span><small>{current === last ? 'Carry the wisdom with you' : `Up next · ${levels[current + 1].title}`}</small><strong>{current === last ? 'Finish' : 'Next'}</strong></span><ArrowRight size={29} /></button>
      </div>
    </>}
    <nav className="game-trail" aria-label="Journey levels">
      <div className="game-trail-summary"><Compass size={16} /><span>{visited.length} / {levels.length} explored</span><small>{saveError ? 'Saving unavailable' : 'Saved on this browser'}</small></div>
      <ol>{levels.map((item, index) => <li key={item.id}><button onClick={() => choose(index)} aria-label={`Level ${index + 1}: ${item.title}`} aria-current={current === index ? 'step' : undefined} className={visited.includes(item.id) ? 'was-visited' : ''}><span>{visited.includes(item.id) ? <Check size={13} /> : index + 1}</span><strong>{item.title}</strong></button></li>)}</ol>
    </nav>

  </section>;
}
