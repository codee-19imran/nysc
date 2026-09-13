import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Check, AlertCircle, Loader2 } from 'lucide-react';
import { request } from '../lib/api';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState('validating'); // validating, form, success, error
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStep('error');
      setError('No invite token provided');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const data = await request(`/admin/invites/validate/${token}`);
      if (data.valid) {
        setInvite(data.invite);
        setStep('form');
      } else {
        setStep('error');
        setError(data.error || 'Invalid invite');
      }
    } catch (err) {
      setStep('error');
      setError(err.message || 'Failed to validate invite');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least 1 uppercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least 1 number');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      await request(`/admin/invites/accept/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password, confirm_password: confirmPassword })
      });
      setStep('success');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-atmosphere to-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-navy rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-navy">NYSC-2026</h1>
          <p className="text-sm text-ink-soft mt-1">Admin Account Setup</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-ink/10 shadow-lg p-8">
          {/* Validating */}
          {step === 'validating' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-ochre mx-auto animate-spin mb-4" />
              <p className="text-sm text-ink-soft">Validating your invite...</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-display font-bold text-navy mb-2">Invalid Invite</h2>
              <p className="text-sm text-ink-soft mb-6">{error}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90"
              >
                Go to Login
              </Link>
            </div>
          )}

          {/* Form */}
          {step === 'form' && invite && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-display font-bold text-navy mb-2">Welcome, {invite.name}!</h2>
                <p className="text-sm text-ink-soft">
                  You've been invited to join as an administrator. Set your password to get started.
                </p>
              </div>

              <div className="bg-atmosphere rounded-lg p-4 mb-6">
                <p className="text-xs text-ink-soft mb-1">Email</p>
                <p className="text-sm font-medium text-navy">{invite.email}</p>
                {invite.specialized_domain && (
                  <>
                    <p className="text-xs text-ink-soft mt-2 mb-1">Domain</p>
                    <p className="text-sm font-medium text-navy">{invite.specialized_domain}</p>
                  </>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-ink-soft">Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-ink-soft">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50"
                >
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-navy mb-2">Account Created!</h2>
              <p className="text-sm text-ink-soft mb-6">
                Your admin account is ready. You can now log in.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-ink-soft mt-6">
          Need help? Contact the conference administrator.
        </p>
      </div>
    </div>
  );
}
