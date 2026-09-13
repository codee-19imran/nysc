import { useState, useEffect } from 'react';
import { Clock, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { request } from '../lib/api';

export default function DeadlineCountdown({ type, compact = false }) {
  const [deadlineInfo, setDeadlineInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeadline();
    // Refresh every minute
    const interval = setInterval(fetchDeadline, 60000);
    return () => clearInterval(interval);
  }, [type]);

  const fetchDeadline = async () => {
    try {
      const data = await request('/settings/public/deadlines');
      setDeadlineInfo(data[type]);
    } catch (err) {
      console.error('Failed to fetch deadline:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !deadlineInfo) return null;

  // CLOSED STATE
  if (deadlineInfo.status === 'closed') {
    if (compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
          <XCircle className="w-3 h-3" />
          Closed
        </div>
      );
    }
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-display font-bold text-red-800 mb-1">
          {deadlineInfo.name} Closed
        </h3>
        <p className="text-sm text-red-700">{deadlineInfo.message}</p>
      </div>
    );
  }

  // NOT SET STATE
  if (deadlineInfo.status === 'not_set') {
    return null; // Don't show anything if no deadline set
  }

  // OPEN STATE — Show countdown
  const { days_remaining: days, hours_remaining: hours, minutes_remaining: minutes } = deadlineInfo;
  
  // Urgency colors
  let urgencyColor = 'bg-blue-50 border-blue-200 text-blue-800';
  let iconColor = 'text-blue-600';
  if (days < 1) {
    urgencyColor = 'bg-red-50 border-red-200 text-red-800';
    iconColor = 'text-red-600';
  } else if (days < 3) {
    urgencyColor = 'bg-orange-50 border-orange-200 text-orange-800';
    iconColor = 'text-orange-600';
  } else if (days < 7) {
    urgencyColor = 'bg-yellow-50 border-yellow-200 text-yellow-800';
    iconColor = 'text-yellow-600';
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${urgencyColor}`}>
        <Clock className="w-3 h-3" />
        {days}d {hours}h remaining
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-4 ${urgencyColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={`w-6 h-6 ${iconColor}`} />
          <div>
            <p className="text-xs font-bold uppercase opacity-75">{deadlineInfo.name}</p>
            <p className="text-sm font-bold">
              {days > 0 && <span>{days} day{days !== 1 ? 's' : ''} </span>}
              <span>{hours}h {minutes}m remaining</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-75">Deadline</p>
          <p className="text-sm font-bold">
            {new Date(deadlineInfo.deadline).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
