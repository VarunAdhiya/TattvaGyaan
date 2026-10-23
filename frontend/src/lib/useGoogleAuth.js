import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

const MESSAGES = {
  cancelled: 'Google sign-in was cancelled. You can try again or continue with email.',
  expired: 'Your Google sign-in session expired. Please try again from this page.',
  failed: 'Google sign-in could not be completed. Please try again or use your email and password.',
  unavailable: 'Google sign-in is not available yet. You can continue with email.',
};

export default function useGoogleAuth(intent) {
  const [params] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [failed, setFailed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const reason = params.get('google');
  useEffect(() => {
    const controller = new AbortController();
    api.getGoogleAuthStatus(controller.signal).then(value => {
      if (!controller.signal.aborted) setStatus(value);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    const restore = () => setRedirecting(false);
    window.addEventListener('pageshow', restore);
    return () => { controller.abort(); window.removeEventListener('pageshow', restore); };
  }, []);
  const linkEmail = reason === 'link_required' ? status?.linkEmail : null;
  const message = linkEmail ? `An account already exists for ${linkEmail}. Confirm its password below to connect Google and keep your saved reading.`
    : reason === 'link_required' && status ? 'Google confirmation expired. Choose Continue with Google to start again.'
      : MESSAGES[reason] || (failed ? 'Google sign-in could not be loaded. You can continue with email.' : status && !status.enabled ? MESSAGES.unavailable : '');
  return { enabled: Boolean(status?.enabled), loading: !status && !failed, redirecting, message, linkEmail,
    start() { if (status?.enabled && !redirecting) { setRedirecting(true); api.startGoogleSignIn(intent); } } };
}
