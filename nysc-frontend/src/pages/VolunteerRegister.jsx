import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Check, AlertCircle, Ticket, Loader2 } from 'lucide-react';
import { request } from '../lib/api';

export default function VolunteerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState('code'); // code, form, success
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState(false);
  const [department, setDepartment] = useState(null);
  const [validating, setValidating] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validateCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setValidating(true);
    setError('');
    
    try {
      const data = await request('/auth/volunteer/validate-code', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() })
      });
      
      if (data.valid) {
        setCodeValid(true);
        setDepartment(data.department);
        setStep('form');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch (err) {
      setError(err.message || 'Failed to validate code');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least 1 uppercase letter');
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least 1 number');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      await request('/auth/volunteer/register', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      });
      setStep('success');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-navy/90 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ochre rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Volunteer Registration</h1>
          <p className="text-sm text-white/70">NYSC-2026 • Join our volunteer team</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Step 1: Enter Code */}
          {step === 'code' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-navy mb-2">Enter Invite Code</h2>
                <p className="text-sm text-ink-soft">
                  Enter the registration code shared by the organizing team.
                </p>
              </div>

              <form onSubmit={validateCode} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-ink-soft">Invite Code *</label>
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="NYSC-VOL-XXXXXX"
                    className="w-full mt-1 px-4 py-3 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre font-mono text-center tracking-wider"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={validating}
                  className="w-full py-3 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50"
                >
                  {validating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Validating...
                    </span>
                  ) : 'Validate Code'}
                </button>
              </form>

              <p className="text-xs text-ink-soft text-center mt-6">
                Already have an account? <Link to="/login" className="text-ochre font-bold hover:underline">Log in</Link>
              </p>
            </>
          )}

          {/* Step 2: Registration Form */}
          {step === 'form' && (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold mb-3">
                  <Check className="w-3 h-3" /> Code Validated
                </div>
                {department && (
                  <p className="text-xs text-ink-soft mb-2">
                    Department: <span className="font-bold text-navy capitalize">{department}</span>
                  </p>
                )}
                <h2 className="text-xl font-display font-bold text-navy mb-2">Create Your Account</h2>
                <p className="text-sm text-ink-soft">Fill in your details to complete registration.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-ink-soft">Full Name *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-ink-soft">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-ink-soft">Phone (10 digits) *</label>
                  <input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-ink-soft">Password *</label>
                  <input
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep('code'); setError(''); }}
                    className="flex-1 py-3 border border-ink/15 text-navy font-bold rounded-lg hover:bg-atmosphere"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-navy mb-2">Welcome Aboard!</h2>
              <p className="text-sm text-ink-soft mb-6">
                Your volunteer account is ready. Log in to access your dashboard and QR code.
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
      </div>
    </div>
  );
}
