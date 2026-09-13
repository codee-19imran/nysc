import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Download, Users, UserCheck, Utensils, 
  TrendingUp, Calendar, Filter
} from 'lucide-react';
import { request } from '../../lib/api';

export default function AdminAttendance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [delegates, setDelegates] = useState([]);
  const [staff, setStaff] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsData, delegatesData, staffData, mealsData] = await Promise.all([
        request('/admin/attendance/stats'),
        request('/admin/attendance/delegates'),
        request('/admin/attendance/volunteers'),
        request('/admin/attendance/meals')
      ]);
      setStats(statsData);
      setDelegates(delegatesData);
      setStaff(staffData);
      setMeals(mealsData);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`http://127.0.0.1:8000/admin/attendance/export/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_attendance_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'delegates', label: 'Delegates', icon: Users, count: delegates.length },
    { id: 'staff', label: 'Staff', icon: UserCheck, count: staff.length },
    { id: 'meals', label: 'Meals', icon: Utensils, count: meals.length },
  ];

  if (loading || !stats) {
    return <div className="text-center py-12">Loading attendance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-ink/10 p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-ochre text-white'
                    : 'text-ink-soft hover:bg-atmosphere hover:text-navy'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full ${
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Delegate Attendance"
              value={`${stats.attendance_rate}%`}
              subtitle={`${stats.delegates_checked_in} of ${stats.total_delegates}`}
              icon={Users}
              color="bg-blue-500"
            />
            <StatCard
              title="Meals Served Today"
              value={stats.meals_today.total}
              subtitle={`B: ${stats.meals_today.breakfast} • L: ${stats.meals_today.lunch} • D: ${stats.meals_today.dinner}`}
              icon={Utensils}
              color="bg-ochre"
            />
            <StatCard
              title="Active Staff"
              value={stats.active_volunteers}
              subtitle="Volunteers & committee"
              icon={UserCheck}
              color="bg-green-500"
            />
            <StatCard
              title="Total Registered"
              value={stats.total_delegates}
              subtitle="Paid registrations"
              icon={Calendar}
              color="bg-purple-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-ink/10 p-6">
            <h3 className="text-lg font-display font-bold text-navy mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleExport('delegates')}
                className="flex items-center gap-3 p-4 bg-atmosphere rounded-lg hover:bg-ochre/10 transition-colors text-left"
              >
                <Download className="w-6 h-6 text-ochre" />
                <div>
                  <p className="text-sm font-bold text-navy">Export Delegates</p>
                  <p className="text-xs text-ink-soft">Download attendance CSV</p>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('delegates')}
                className="flex items-center gap-3 p-4 bg-atmosphere rounded-lg hover:bg-ochre/10 transition-colors text-left"
              >
                <Users className="w-6 h-6 text-ochre" />
                <div>
                  <p className="text-sm font-bold text-navy">View Delegates</p>
                  <p className="text-xs text-ink-soft">{delegates.length} checked in</p>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('meals')}
                className="flex items-center gap-3 p-4 bg-atmosphere rounded-lg hover:bg-ochre/10 transition-colors text-left"
              >
                <Utensils className="w-6 h-6 text-ochre" />
                <div>
                  <p className="text-sm font-bold text-navy">View Meals</p>
                  <p className="text-xs text-ink-soft">{meals.length} claims today</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-ink/10 p-6">
            <h3 className="text-lg font-display font-bold text-navy mb-4">Recent Check-ins</h3>
            <div className="space-y-2">
              {delegates.slice(0, 5).map((d, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-atmosphere/50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-navy">{d.name}</p>
                    <p className="text-xs text-ink-soft">{d.email} • {d.category}</p>
                  </div>
                  <p className="text-xs text-ink-soft">
                    {new Date(d.checked_in_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {delegates.length === 0 && (
                <p className="text-center py-8 text-ink-soft">No check-ins yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delegates Tab */}
      {activeTab === 'delegates' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-ink/15 rounded-lg bg-white"
              />
            </div>
            <button
              onClick={() => handleExport('delegates')}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
            <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
              <thead className="bg-atmosphere border-b border-ink/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Checked In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {delegates
                  .filter(d => 
                    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.email.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(d => (
                    <tr key={d.user_id} className="hover:bg-atmosphere/50">
                      <td className="px-6 py-4 text-sm font-medium text-navy">{d.name}</td>
                      <td className="px-6 py-4 text-sm text-ink-soft">{d.email}</td>
                      <td className="px-6 py-4 text-sm text-ink-soft capitalize">{d.category}</td>
                      <td className="px-6 py-4 text-sm text-ink-soft capitalize">{d.participation_type}</td>
                      <td className="px-6 py-4 text-xs text-ink-soft">
                        {new Date(d.checked_in_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {delegates.length === 0 && (
              <div className="text-center py-12 text-ink-soft">No delegate check-ins yet</div>
            )}
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
          <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
            <thead className="bg-atmosphere border-b border-ink/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Department</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {staff.map(s => (
                <tr key={s.user_id} className="hover:bg-atmosphere/50">
                  <td className="px-6 py-4 text-sm font-medium text-navy">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{s.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">
                      {s.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft capitalize">{s.department || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && (
            <div className="text-center py-12 text-ink-soft">No staff members</div>
          )}
        </div>
      )}

      {/* Meals Tab */}
      {activeTab === 'meals' && (
        <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
          <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
            <thead className="bg-atmosphere border-b border-ink/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Meal</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Claimed At</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Scanned By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {meals.map((m, idx) => (
                <tr key={idx} className="hover:bg-atmosphere/50">
                  <td className="px-6 py-4 text-sm font-medium text-navy">{m.user_name}</td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{m.user_email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      m.meal_type === 'breakfast' ? 'bg-yellow-100 text-yellow-700' :
                      m.meal_type === 'lunch' ? 'bg-orange-100 text-orange-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {m.meal_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-ink-soft">
                    {new Date(m.claimed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{m.claimed_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {meals.length === 0 && (
            <div className="text-center py-12 text-ink-soft">No meal claims yet</div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-soft mb-1">{title}</p>
          <p className="text-3xl font-display font-bold text-navy">{value}</p>
          {subtitle && <p className="text-xs text-ink-soft mt-2">{subtitle}</p>}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
