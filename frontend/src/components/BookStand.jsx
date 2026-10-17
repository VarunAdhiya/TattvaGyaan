import woodenStand from '../assets/reader/wooden-bookstand.png';
import prayerBeads from '../assets/reader/prayer-beads.png';

// Decorative furniture stays outside the page surfaces and their turn layer.
// It never participates in text measurement, focus, or pointer interaction.
export default function BookStand({ enabled, spread, children }) {
  if (!enabled) return children;
  return <div className={'scripture-book-setting' + (spread ? ' scripture-book-setting--spread' : '')}>
    <img className="scripture-wooden-stand" src={woodenStand} alt="" aria-hidden="true" draggable="false" />
    {children}
    <span className="scripture-book-ribbon" aria-hidden="true" />
    <img className="scripture-prayer-beads" src={prayerBeads} alt="" aria-hidden="true" draggable="false" />
  </div>;
}
