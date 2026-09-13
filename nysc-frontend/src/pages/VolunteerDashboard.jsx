import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, CheckCircle, Clock, AlertCircle, Calendar, 
  MapPin, FileText, LogOut, ScanLine, User
} from 'lucide-react';
import { request, auth as apiAuth } from '../lib/api';

export default function VolunteerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('qr');
  const [checkinResult, setCheckinResult] = useState(null);

  useEffect(() => {
    const currentUser = apiAuth.getUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Only volunteers and committee members can access
    if (!['volunteer', 'committee_member'].includes(currentUser.role)) {
      navigate('/');
      return;
    }
    
    setUser(currentUser);
    fetchAll();
  }, [navigate]);

  const fetchAll = async () => {
    try {
      const [qr, tasksData, attendanceData] = await Promise.all([
        request('/volunteer/my-qr'),
        request('/volunteer/my-tasks'),
        request('/volunteer/my-attendance')
      ]);
      setQrData(qr);
      setTasks(tasksData);
      setAttendance(attendanceData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfCheckin = async () => {
    try {
      const result = await request('/volunteer/self-checkin', { method: 'POST' });
      setCheckinResult(result);
      fetchAll();
      setTimeout(() => setCheckinResult(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    apiAuth.logout();
    navigate('/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-atmosphere flex items-center justify-center">
        <div className="text-ink-soft">Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'qr', label: 'My QR', icon: QrCode },
    { id: 'tasks', label: 'My Tasks', icon: FileText, count: tasks.length },
    { id: 'attendance', label: 'History', icon: Clock, count: attendance.length },
  ];

  return (
    <div className="min-h-screen bg-atmosphere">
      {/* Header */}
      <header className="bg-navy text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ochre rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold">{user.name}</h1>
              <p className="text-xs text-white/70 capitalize">
                {user.role.replace('_', ' ')}
                {user.department && ` • ${user.department}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/volunteer/scanner"
              className="flex items-center gap-2 px-3 py-2 bg-ochre text-white text-xs font-bold rounded-lg hover:bg-ochre/90"
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden sm:inline">Scan QR</span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Self Check-in Banner */}
      {checkinResult && (
        <div className={`max-w-4xl mx-auto px-6 mt-4`}>
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            checkinResult.status === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-yellow-100 border border-yellow-300 text-yellow-800'
          }`}>
            {checkinResult.status === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="text-sm font-medium">{checkinResult.message}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-xl border border-ink/10 p-2 flex gap-2 overflow-x-auto whitespace-nowrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-ochre text-white'
                    : 'text-ink-soft hover:bg-atmosphere'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-ink/10'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* QR Tab */}
        {activeTab === 'qr' && qrData && (
          <div className="space-y-6">
            {/* QR Card */}
            <div className="bg-white rounded-2xl border border-ink/10 p-8 text-center">
              <h2 className="text-xl font-display font-bold text-navy mb-2">Your Personal QR</h2>
              <p className="text-sm text-ink-soft mb-6">
                Show this QR to check in for attendance and meals
              </p>
              
              <div className="inline-block p-6 bg-white border-4 border-navy rounded-2xl mb-4">
                <QRCodeSVG
                  value={qrData.qr_data}
                  size={240}
                  level="M"
                  includeMargin={false}
                />
              </div>
              
              <div className="space-y-1 text-sm">
                <p className="font-bold text-navy">{qrData.user_name}</p>
                <p className="text-ink-soft">{qrData.user_email}</p>
                {qrData.department && (
                  <p className="text-xs text-ochre font-bold uppercase">
                    {qrData.department} Department
                  </p>
                )}
              </div>
            </div>

            {/* Self Check-in Button */}
            <button
              onClick={handleSelfCheckin}
              className="w-full p-4 bg-gradient-to-r from-ochre to-ochre/90 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:shadow-lg transition-shadow"
            >
              <CheckCircle className="w-6 h-6" />
              Check In Now
            </button>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/volunteer/scanner"
                className="p-4 bg-white border border-ink/10 rounded-xl hover:border-ochre/50 transition-colors"
              >
                <ScanLine className="w-8 h-8 text-ochre mb-2" />
                <p className="text-sm font-bold text-navy">Scan Others</p>
                <p className="text-xs text-ink-soft">Check in attendees</p>
              </Link>
              <button
                onClick={() => setActiveTab('tasks')}
                className="p-4 bg-white border border-ink/10 rounded-xl hover:border-ochre/50 transition-colors text-left"
              >
                <FileText className="w-8 h-8 text-ochre mb-2" />
                <p className="text-sm font-bold text-navy">My Tasks</p>
                <p className="text-xs text-ink-soft">{tasks.length} assigned</p>
              </button>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-ink/10 p-12 text-center">
                <FileText className="w-12 h-12 text-ink-soft mx-auto mb-3" />
                <p className="text-navy font-bold">No tasks assigned</p>
                <p className="text-sm text-ink-soft mt-1">
                  Tasks assigned to you will appear here
                </p>
              </div>
            ) : (
              tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-3">
            {attendance.length === 0 ? (
              <div className="bg-white rounded-xl border border-ink/10 p-12 text-center">
                <Clock className="w-12 h-12 text-ink-soft mx-auto mb-3" />
                <p className="text-navy font-bold">No attendance records</p>
                <p className="text-sm text-ink-soft mt-1">
                  Your check-ins will appear here
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
                {attendance.map((record, idx) => (
                  <div
                    key={record.id}
                    className={`p-4 flex items-center gap-4 ${
                      idx !== attendance.length - 1 ? 'border-b border-ink/10' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-navy">Checked In</p>
                      <p className="text-xs text-ink-soft">
                        {new Date(record.scanned_at).toLocaleString()}
                      </p>
                      {record.location && (
                        <p className="text-xs text-ink-soft flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {record.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }) {
  const isOverdue = task.deadline && task.status !== 'completed' && new Date(task.deadline) < new Date();
  
  const statusColors = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
  };
  
  const priorityColors = {
    high: 'text-red-600',
    medium: 'text-orange-600',
    low: 'text-blue-600',
  };
  
  return (
    <div className={`bg-white rounded-xl border border-ink/10 p-5 ${
      isOverdue ? 'border-l-4 border-l-red-500' : ''
    }`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-bold text-navy flex-1">{task.task_name}</h3>
        <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${statusColors[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
      
      {task.description && (
        <p className="text-xs text-ink-soft mb-3">{task.description}</p>
      )}
      
      <div className="flex items-center gap-4 text-xs">
        <span className={`font-bold uppercase ${priorityColors[task.priority]}`}>
          {task.priority} priority
        </span>
        <span className="text-ink-soft capitalize">• {task.category.replace('_', ' ')}</span>
        {task.deadline && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-ink-soft'}`}>
            <Calendar className="w-3 h-3" />
            {new Date(task.deadline).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {isOverdue && ' ⚠️'}
          </span>
        )}
      </div>
      
      {task.notes && (
        <div className="mt-3 p-2 bg-atmosphere rounded text-xs text-ink-soft">
          <span className="font-bold">Notes:</span> {task.notes}
        </div>
      )}
    </div>
  );
}
