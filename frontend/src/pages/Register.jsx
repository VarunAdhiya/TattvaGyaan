import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthScenery from '../components/AuthScenery';
import { useAuth } from '../context/AuthContext';
import { BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

function Register() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validatePassword = () => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      await register({
        displayName,
        username,
        email,
        password,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password.length >= 8 ? 'good' : password.length >= 4 ? 'fair' : 'weak';
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="auth-layout auth-register">
      <AuthScenery />
      <div className="auth-panel w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-amber-100 shadow-md">
              <BookOpen className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Join TattvaGyaan</h1>
          <p className="text-sm text-stone-600">Create your personal scripture library</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xs border border-stone-200/80 p-8">
          {/* Display Name Field */}
          <div className="mb-5">
            <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-2">
              Full Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
              placeholder="John Doe"
            />
          </div>

          {/* Username Field */}
          <div className="mb-5">
            <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
              placeholder="johndoe"
            />
          </div>

          {/* Email Field */}
          <div className="mb-5">
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
              placeholder="your@email.com"
            />
          </div>

          {/* Password Field */}
          <div className="mb-3">
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
              placeholder="••••••••"
            />
            {password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength === 'weak' ? 'w-1/3 bg-rose-500' :
                      passwordStrength === 'fair' ? 'w-2/3 bg-amber-500' :
                      'w-full bg-emerald-500'
                    }`}
                  />
                </div>
                <span className="text-xs text-stone-500 capitalize">{passwordStrength}</span>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-300 transition-all text-sm"
                placeholder="••••••••"
              />
              {passwordsMatch && (
                <CheckCircle2 className="absolute right-3 top-3 w-5 h-5 text-emerald-500" />
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !passwordsMatch}
            className="w-full bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50 py-2.5 rounded-lg font-medium hover:from-amber-800 hover:to-amber-950 disabled:from-stone-400 disabled:to-stone-500 transition-all shadow-xs disabled:shadow-none"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-stone-500">Already a member?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            to="/login"
            className="w-full block text-center px-4 py-2.5 border border-stone-300 rounded-lg text-stone-700 font-medium hover:bg-stone-50 transition-all"
          >
            Sign In
          </Link>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-stone-500 mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default Register;
