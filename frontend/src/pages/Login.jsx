import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import AuthScenery from '../components/AuthScenery';
import AuthPanelHeading from '../components/AuthPanelHeading';
import GoogleSignIn from '../components/GoogleSignIn';
import useGoogleAuth from '../lib/useGoogleAuth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const google = useGoogleAuth('login');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email: google.linkEmail || email, password, connectGoogle: Boolean(google.linkEmail) });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <AuthScenery />
      <div className="auth-panel w-full max-w-md">
        <AuthPanelHeading />
        <GoogleSignIn google={google} disabled={loading} />

        {/* Error Alert */}
        {error && (
          <div role="alert" className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-8">
          {/* Email Field */}
          <div className="mb-5">
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              autoComplete="email"
              type="email"
              value={google.linkEmail || email}
              readOnly={Boolean(google.linkEmail)}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
              placeholder="your@email.com"
            />
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-2">
              Password
            </label>
            <input
              id="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || google.redirecting}
            className="w-full bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 py-2.5 rounded-lg font-medium hover:from-amber-800 hover:to-amber-950 disabled:from-stone-400 disabled:to-stone-500 transition-all shadow-xs disabled:shadow-none"
          >
            {loading ? 'Signing in...' : google.linkEmail ? 'Sign in and connect Google' : 'Sign In'}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-stone-500">New to TattvaGyaan?</span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            to="/register"
            className="w-full block text-center px-4 py-2.5 border border-stone-300 rounded-lg text-stone-700 font-medium hover:bg-stone-50 transition-all"
          >
            Create Account
          </Link>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-stone-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default Login;
