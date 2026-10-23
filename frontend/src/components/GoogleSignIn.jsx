import googleMark from '../assets/google-sign-in.svg';

export default function GoogleSignIn({ google, disabled = false }) {
  return <div className="google-auth">
    <button type="button" className="google-auth-button" disabled={disabled || !google.enabled || google.redirecting} onClick={google.start}>
      <img src={googleMark} alt="" width="40" height="40" />
      <span>{google.redirecting ? 'Opening Google…' : 'Continue with Google'}</span>
    </button>
    {google.message && <p className="google-auth-message" role="status">{google.message}</p>}
    <div className="google-auth-divider"><span>or continue with email</span></div>
  </div>;
}
