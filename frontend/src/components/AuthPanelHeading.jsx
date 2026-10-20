import { Link } from 'react-router-dom';
import { Flower2 } from 'lucide-react';

export default function AuthPanelHeading({ register = false }) {
  return <header className="auth-panel-heading">
    <div className="auth-heading-ornament" aria-hidden="true"><span /><Flower2 size={32} strokeWidth={1.3} /><span /></div>
    <h1>{register ? 'Join TattvaGyaan' : 'Welcome Back'}</h1>
    <p>{register ? 'Create your personal scripture library' : 'Access your personal scripture library'}</p>
    <nav className="auth-switch" aria-label="Account access">
      <Link to="/login" aria-current={!register ? 'page' : undefined}>Sign In</Link>
      <Link to="/register" aria-current={register ? 'page' : undefined}>Create Account</Link>
    </nav>
  </header>;
}
