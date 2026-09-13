import { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  CheckCircle, XCircle, AlertCircle, Coffee, Utensils, Moon 
} from 'lucide-react';
import { request } from '../lib/api';

/**
 * UNIVERSAL QR SCANNER COMPONENT
 * Works for all roles: volunteer, admin, super_admin, department heads
 * 
 * Props:
 * - onBack: function to go back
 * - showStats: boolean (show live stats)
 * - title: string (custom title)
 */
export default function QRScanner({ onBack, showStats = true, title = "QR Scanner" }) {
  const [mode, setMode] = useState(null); // 'checkin' or 'meal'
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const scanLock = useRef(false);

  useEffect(() => {
    if (showStats) fetchStats();
  }, [showStats]);

  const fetchStats = async () => {
    try {
      const data = await request('/volunteer/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleScan = async (detectedCodes) => {
    if (scanLock.current) return;
    scanLock.current = true;

    // ✅ FIXED: Handle the actual data format from the scanner library
    let rawValue = '';
    
    if (typeof detectedCodes === 'string') {
      rawValue = detectedCodes;
    } else if (Array.isArray(detectedCodes) && detectedCodes.length > 0) {
      rawValue = detectedCodes[0]?.rawValue || detectedCodes[0]?.returnValue || '';
    } else if (detectedCodes?.rawValue) {
      rawValue = detectedCodes.rawValue;
    }
    
    if (!rawValue) {
      console.warn('⚠️ Scanner returned empty data:', detectedCodes);
      scanLock.current = false;
      return;
    }
    
    console.log('📸 QR scanned:', rawValue);
    
    setScanning(false);
    setError('');
    setResult(null);
    
    try {
      let endpoint, payload;
      
      if (mode === 'checkin') {
        endpoint = '/volunteer/scan';
        payload = { qr_data: rawValue };
      } else {
        endpoint = '/volunteer/scan-meal';
        payload = { qr_data: rawValue, meal_type: mealType };
      }
      
      console.log('📡 Sending to:', endpoint, payload);
      
      const response = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log('✅ Response:', response);
      
      setResult(response);
      if (showStats) fetchStats();
      
      setTimeout(() => {
        setResult(null);
        setScanning(true);
        scanLock.current = false;
      }, 4000);
      
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message || 'Scan failed');
      setTimeout(() => {
        setError('');
        setScanning(true);
        scanLock.current = false;
      }, 4000);
    }
  };

  // Mode Selection
  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy to-navy/90 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-ochre rounded-full mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">{title}</h1>
            <p className="text-sm text-white/70">NYSC-2026 • Universal Scanner</p>
          </div>

          {stats && showStats && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
              <h3 className="text-xs font-bold uppercase text-white/70 mb-4">Live Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{stats.checkins_today}</p>
                  <p className="text-xs text-white/70">Checked In</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.attendance_rate}%</p>
                  <p className="text-xs text-white/70">Attendance</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.meals_today.total}</p>
                  <p className="text-xs text-white/70">Meals Served</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_registered}</p>
                  <p className="text-xs text-white/70">Total Registered</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => { setMode('checkin'); setScanning(true); }}
              className="w-full p-6 bg-white rounded-xl hover:bg-atmosphere transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-navy">Check-In</h3>
                  <p className="text-sm text-ink-soft">Scan any QR code (delegates, staff, admins)</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setMode('meal'); setScanning(true); }}
              className="w-full p-6 bg-white rounded-xl hover:bg-atmosphere transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-ochre rounded-lg flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-navy">Meal Claims</h3>
                  <p className="text-sm text-ink-soft">Scan for breakfast, lunch, or dinner</p>
                </div>
              </div>
            </button>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="w-full mt-6 py-3 text-white/70 hover:text-white text-sm font-medium"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // Scanner Screen
  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <button
          onClick={() => { setMode(null); setScanning(false); setResult(null); setError(''); }}
          className="text-sm text-ink-soft hover:text-navy font-medium"
        >
          ← Back
        </button>
        <h2 className="text-lg font-display font-bold text-navy">
          {mode === 'checkin' ? 'Check-In Scanner' : 'Meal Claim Scanner'}
        </h2>
        <div className="w-16"></div>
      </div>

      {/* Meal Type Selector */}
      {mode === 'meal' && (
        <div className="bg-white border-b border-ink/10 p-4">
          <p className="text-xs font-bold uppercase text-ink-soft mb-2">Select Meal Type</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'breakfast', label: 'Breakfast', icon: Coffee },
              { id: 'lunch', label: 'Lunch', icon: Utensils },
              { id: 'dinner', label: 'Dinner', icon: Moon }
            ].map(meal => {
              const Icon = meal.icon;
              return (
                <button
                  key={meal.id}
                  onClick={() => setMealType(meal.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    mealType === meal.id
                      ? 'border-ochre bg-ochre/10'
                      : 'border-ink/15 hover:border-ochre/50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-1 ${
                    mealType === meal.id ? 'text-ochre' : 'text-ink-soft'
                  }`} />
                  <p className={`text-xs font-bold ${
                    mealType === meal.id ? 'text-ochre' : 'text-ink-soft'
                  }`}>
                    {meal.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {scanning && !result && !error && (
          <>
            <div className="w-full max-w-md aspect-square bg-black rounded-2xl overflow-hidden mb-6 relative">
              <Scanner
                onScan={handleScan}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' }
                }}
              />
              <div className="absolute inset-0 border-4 border-ochre/50 rounded-2xl pointer-events-none"></div>
            </div>
            <p className="text-white text-center">Point camera at any QR code</p>
          </>
        )}

        {/* Success */}
        {result && result.status === 'success' && (
          <div className="w-full max-w-md bg-green-500 rounded-2xl p-8 text-center text-white">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold mb-2">Success!</h3>
            <p className="text-lg mb-4">{result.message}</p>
            <div className="bg-white/20 rounded-lg p-4 text-left">
              <p className="text-sm font-bold">{result.user_name}</p>
              <p className="text-xs opacity-90">{result.user_email}</p>
              <p className="text-xs opacity-90 mt-1 capitalize">
                {result.user_type?.replace('_', ' ')}
                {result.category && ` • ${result.category}`}
              </p>
            </div>
          </div>
        )}

        {/* Already Checked In */}
        {result && result.status === 'already_checked_in' && (
          <div className="w-full max-w-md bg-yellow-500 rounded-2xl p-8 text-center text-white">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold mb-2">Already Checked In</h3>
            <p className="text-lg mb-4">{result.message}</p>
            <div className="bg-white/20 rounded-lg p-4 text-left">
              <p className="text-sm font-bold">{result.user_name}</p>
              <p className="text-xs opacity-90">{result.user_email}</p>
              <p className="text-xs opacity-90 mt-1 capitalize">{result.user_type?.replace('_', ' ')}</p>
              <p className="text-xs opacity-90 mt-1">
                {new Date(result.checkin_time).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        {/* Already Claimed */}
        {result && result.status === 'already_claimed' && (
          <div className="w-full max-w-md bg-yellow-500 rounded-2xl p-8 text-center text-white">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold mb-2">Already Claimed</h3>
            <p className="text-lg mb-4">{result.message}</p>
            <div className="bg-white/20 rounded-lg p-4 text-left">
              <p className="text-sm font-bold">{result.user_name}</p>
              <p className="text-xs opacity-90 capitalize">{result.user_type?.replace('_', ' ')}</p>
            </div>
          </div>
        )}

        {/* Wrong Time */}
        {result && result.status === 'wrong_time' && (
          <div className="w-full max-w-md bg-red-500 rounded-2xl p-8 text-center text-white">
            <XCircle className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold mb-2">Wrong Time</h3>
            <p className="text-lg mb-4">{result.message}</p>
            <div className="bg-white/20 rounded-lg p-4">
              <p className="text-sm font-bold capitalize">{result.meal_type}</p>
              <p className="text-xs opacity-90">Timing: {result.timing}</p>
            </div>
          </div>
        )}

        {/* Not Paid */}
        {result && result.status === 'not_paid' && (
          <div className="w-full max-w-md bg-orange-500 rounded-2xl p-8 text-center text-white">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold mb-2">Payment Pending</h3>
            <p className="text-lg mb-4">{result.message}</p>
            <div className="bg-white/20 rounded-lg p-4 text-left">
              <p className="text-sm font-bold">{result.user_name}</p>
              <p className="text-xs opacity-90">{result.user_email}</p>
              <p className="text-xs opacity-90 mt-1 capitalize">{result.user_type?.replace('_', ' ')}</p>
              <p className="text-xs opacity-90 mt-1 font-bold uppercase">Status: {result.payment_status}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full max-w-md bg-red-500 rounded-2xl p-8 text-center text-white">
            <XCircle className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold mb-2">Error</h3>
            <p className="text-lg">{error}</p>
          </div>
        )}
      </div>

      {/* Live Stats Footer */}
      {stats && showStats && (
        <div className="bg-white/10 backdrop-blur p-4">
          <div className="grid grid-cols-4 gap-2 text-center text-white">
            <div>
              <p className="text-xl font-bold">{stats.checkins_today}</p>
              <p className="text-[10px] opacity-70">Check-ins</p>
            </div>
            <div>
              <p className="text-xl font-bold">{stats.meals_today.breakfast}</p>
              <p className="text-[10px] opacity-70">Breakfast</p>
            </div>
            <div>
              <p className="text-xl font-bold">{stats.meals_today.lunch}</p>
              <p className="text-[10px] opacity-70">Lunch</p>
            </div>
            <div>
              <p className="text-xl font-bold">{stats.meals_today.dinner}</p>
              <p className="text-[10px] opacity-70">Dinner</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
