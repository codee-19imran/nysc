import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, LogIn, ArrowLeft } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { auth as apiAuth } from '../lib/api';
import { isAdminRole } from '../lib/roles';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Call the backend
      const response = await apiAuth.login(formData);
      
      // 2. Save JWT and User data to localStorage
      apiAuth.saveAuth(response.access_token, response.user);
      
      // Clear any registration draft left behind so it doesn't persist across users
      localStorage.removeItem('nysc_registration_draft');
      
      // 3. Redirect based on user role
      const userRole = response.user.role;
      if (isAdminRole(userRole)) {
        navigate('/admin');  // Admins go to admin dashboard
      } else if (userRole === 'volunteer' || userRole === 'committee_member') {
        navigate('/volunteer/dashboard'); // Staff goes to volunteer portal
      } else {
        navigate('/dashboard');  // Delegates/presenters go to regular dashboard
      }
    } catch (err) {
      if (err.status === 429) {
        // Rate limited / locked out
        setError(err.message || 'Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <section className="py-20 md:py-28 bg-white min-h-screen flex items-center">
        <div className="max-w-md w-full mx-auto px-6">
          
          {/* Back Button */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-navy transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre mb-3">NYSC-2026</p>
            <h1 className="text-3xl font-display font-bold text-navy tracking-tight mb-2">Welcome Back</h1>
            <p className="text-sm text-ink-soft">Log in to access your delegate dashboard.</p>
          </div>

          {/* Form Container */}
          <div className="bg-white border border-ink/10 rounded-xl p-8 shadow-sm">
            
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2"><Mail className="w-4 h-4 text-ink-soft" /></div>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleChange} required
                    className="w-full border border-ink/15 rounded-lg px-4 py-2.5 pl-10 text-sm font-body text-navy placeholder:text-ink-soft/60 focus:outline-none focus:border-ochre/50 transition-colors"
                    placeholder="name@institution.edu"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2"><Lock className="w-4 h-4 text-ink-soft" /></div>
                  <input
                    type="password" name="password" value={formData.password} onChange={handleChange} required
                    className="w-full border border-ink/15 rounded-lg px-4 py-2.5 pl-10 text-sm font-body text-navy placeholder:text-ink-soft/60 focus:outline-none focus:border-ochre/50 transition-colors"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-body font-bold text-white rounded-lg transition-all ${
                  isLoading ? 'bg-navy/50 cursor-not-allowed' : 'bg-navy hover:bg-navy/90'
                }`}
              >
                {isLoading ? 'Logging in...' : <><LogIn className="w-4 h-4" /> Log In</>}
              </button>
            </form>

            <div className="mt-6 text-center text-sm font-body text-ink-soft">
              Don't have an account?{' '}
              <Link to="/register" className="text-ochre font-bold hover:underline">
                Register here
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
