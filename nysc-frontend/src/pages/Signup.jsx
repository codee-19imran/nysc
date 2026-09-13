import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signup, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await signup(fullName, email, password);
    if (success) {
      navigate(-1); // Go back
    }
  };

  return (
    <PageTransition>
      <main className="pt-12 pb-16 px-4 max-w-md mx-auto min-h-[80vh] flex flex-col justify-center">
      <div className="bg-white/70 backdrop-blur-md rounded-lg p-8 shadow-xl border border-atmosphere-dim">
        <h1 className="font-display text-3xl font-bold text-navy mb-2 text-center">Create Account</h1>
        <p className="text-ink-soft mb-8 text-center font-body text-sm">
          Register for the NYSC 2026 platform.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 font-body">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-navy mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-atmosphere border-none focus:ring-2 focus:ring-ochre outline-none font-body text-ink"
              placeholder="Dr. Jane Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-atmosphere border-none focus:ring-2 focus:ring-ochre outline-none font-body text-ink"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-atmosphere border-none focus:ring-2 focus:ring-ochre outline-none font-body text-ink"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-md bg-ochre hover:bg-ochre-light text-white font-bold transition-colors shadow-md disabled:opacity-70 mt-2"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft font-body">
          Already have an account?{' '}
          <Link to="/login" className="text-navy font-bold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </main>
  </PageTransition>
  );
}
