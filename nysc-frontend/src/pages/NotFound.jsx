import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import { auth as apiAuth } from '../lib/api';

export default function NotFound() {
  const navigate = useNavigate();
  const user = apiAuth.getUser();

  // Redirect to appropriate home based on user role
  const getHomeLink = () => {
    if (!user) return '/';
    if (user.role === 'admin' || user.role === 'super_admin') return '/admin';
    return '/dashboard';
  };

  const getHomeLabel = () => {
    if (!user) return 'Go to Homepage';
    if (user.role === 'admin' || user.role === 'super_admin') return 'Go to Admin Dashboard';
    return 'Go to Dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-atmosphere to-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-[150px] font-display font-bold text-navy/10 leading-none">
            404
          </h1>
        </div>

        {/* Icon */}
        <div className="relative -mt-20 mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-ochre/10 rounded-full">
            <AlertTriangle className="w-10 h-10 text-ochre" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-3xl font-display font-bold text-navy mb-3">
          Page Not Found
        </h2>
        <p className="text-sm text-ink-soft mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={getHomeLink()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-body font-bold text-white bg-navy rounded-lg hover:bg-navy/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            {getHomeLabel()}
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-body font-bold text-navy bg-white border border-ink/15 rounded-lg hover:bg-atmosphere transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-ink-soft/60 mt-8">
          If you believe this is a mistake, please contact the conference administrator.
        </p>
      </div>
    </div>
  );
}
