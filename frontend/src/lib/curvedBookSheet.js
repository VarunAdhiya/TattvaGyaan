// A short-lived segmented DOM surface bends the live page's inert snapshots.
// Original text stays selectable below it; no canvas textures or new renderer.
export function curvedSheetFrames(width, count, index, forward, spread) {
  const step = width / count;
  return Array.from({ length: 33 }, (_, frame) => {
    const progress = frame / 32;
    const phase = !spread && !forward ? 1 - progress : progress;
    const fromRight = spread && !forward;
    const sign = fromRight ? 1 : -1;
    const bend = .62 * Math.sin(Math.PI * phase);
    let x = fromRight ? width : 0;
    let z = 0;
    let angle = 0;
    for (let strip = 0; strip <= index; strip += 1) {
      angle = sign * (Math.PI * phase + bend * (2 * (strip + .5) / count - 1));
      if (strip === index) break;
      x += (fromRight ? -1 : 1) * step * Math.cos(angle);
      z += (fromRight ? 1 : -1) * step * Math.sin(angle);
    }
    return { offset: progress,
      transform: `translate3d(${x - (fromRight ? step : 0)}px, 0, ${z}px) rotateY(${angle}rad)` };
  });
}

export function buildCurvedSheet(sheet, front, back, { forward, spread, copyPage }) {
  sheet.classList.add('reader-turn-sheet--curved');
  const width = sheet.clientWidth;
  const count = spread ? 16 : 12;
  const step = width / count;
  const fromRight = spread && !forward;
  const surfaces = [];
  const snapshots = [];
  for (let index = 0; index < count; index += 1) {
    const strip = document.createElement('div');
    strip.className = 'reader-turn-strip';
    strip.style.width = `${step + .35}px`;
    strip.style.setProperty('--strip-shade', String(.06 + .16 * index / count));
    strip.style.transformOrigin = fromRight ? `${step}px center` : 'left center';
    const sourceX = fromRight ? width - (index + 1) * step : index * step;
    for (const [side, source] of [['front', front], ['back', back]]) {
      const face = document.createElement('div');
      face.className = `reader-turn-face reader-turn-face--${side}`;
      if (source) {
        const snapshot = copyPage(source.element);
        Object.assign(snapshot.element.style, { width: `${width}px`, left: `${-(side === 'front' ? sourceX : width - sourceX - step)}px` });
        face.append(snapshot.element);
        snapshots.push(snapshot);
      }
      strip.append(face);
    }
    const frames = curvedSheetFrames(width, count, index, forward, spread);
    strip.style.transform = frames[0].transform;
    sheet.append(strip);
    surfaces.push({ strip, frames });
  }
  snapshots.forEach(snapshot => snapshot.restoreScroll());
  return () => {
    const timing = { duration: 800, easing: 'cubic-bezier(.32,.08,.24,1)', fill: 'both' };
    surfaces.forEach(({ strip, frames }) => strip.animate(frames, timing));
    // The sheet owns the lifetime, including cancellation on resize/navigation.
    // An opacity animation would flatten the children's 3D rendering context.
    return sheet.animate([{ transform: 'none' }, { transform: 'none' }], timing);
  };
}
