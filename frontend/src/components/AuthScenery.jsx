import { Flower2 } from 'lucide-react';
import templeRiver from '../assets/landing/temple-river-full.png';
import shivaMountains from '../assets/landing/shiva-mountains.png';

export default function AuthScenery({ register = false }) {
  return <aside className="auth-scenery" aria-label="A space for scripture and devotion">
    <img src={register ? shivaMountains : templeRiver} width="1408" height="768" alt={register ? 'Lord Shiva meditating in the Himalayas beside a sacred fire' : 'A riverside Hindu temple beneath the Himalayas, illuminated by lamps'} fetchPriority="high" />
    <div className="auth-scenery-copy"><Flower2 size={42} strokeWidth={1.2} aria-hidden="true" /><h2>A sacred space. <br />A personal journey.</h2><p lang="hi">ज्ञान, भक्ति और आत्मचिंतन।</p><p>Come closer to the wisdom of Sanatan Dharma.<br />One prayer. One page. One quiet moment.</p></div>
  </aside>;
}
