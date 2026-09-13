import { useState, useEffect, useRef } from 'react';
import { 
  Users, FileText, CreditCard, CheckCircle, TrendingUp, DollarSign,
  Truck, Package, DoorOpen, Calendar, AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { request } from '../../lib/api';
import { getRoleDisplayName, isDepartmentHead } from '../../lib/roles';

export default function AdminOverview({ userPermissions = [], user = null }) {
  const [stats, setStats] = useState(null);
  const [logisticsStats, setLogisticsStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // Track which permission set we last fetched for, to avoid duplicate fetches
  const lastFetchedPermsKey = useRef('');

  // Helper: check if user has a specific permission
  const hasPermission = (perm) => userPermissions.includes(perm);

  useEffect(() => {
    if (userPermissions.length === 0) return;

    // Build a stable key from sorted permissions to detect real content changes
    const permsKey = [...userPermissions].sort().join(',');
    if (permsKey === lastFetchedPermsKey.current) return; // same content, skip
    lastFetchedPermsKey.current = permsKey;

    const has = (perm) => userPermissions.includes(perm);
    const promises = [];

    if (has('event:view_stats') || has('page:overview')) {
      promises.push(request('/admin/stats').then(setStats));
    }

    if (has('venue:view')) {
      promises.push(request('/admin/venue/stats').then(setLogisticsStats));
    }

    if (promises.length > 0) {
      setStatsLoading(true);
      Promise.all(promises)
        .catch(err => console.error('Failed to fetch stats:', err))
        .finally(() => setStatsLoading(false));
    }
  }, [userPermissions]);

  // If user is a department head, show their department-specific overview
  if (user && isDepartmentHead(user.role)) {
    return <DepartmentHeadOverview user={user} logisticsStats={logisticsStats} />;
  }

  // Regular admin/super admin overview
  return (
    <div className="space-y-6">
      {/* Stats Cards — visible when user can view stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(hasPermission('event:view_stats') || hasPermission('page:overview')) && (
          statsLoading && !stats ? (
            [1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))
          ) : stats ? (
            <>
              <StatCard
                title="Total Registrations"
                value={stats.total_registrations}
                icon={Users}
                color="bg-blue-500"
                subtitle={`${stats.paid_registrations} paid, ${stats.pending_registrations} pending`}
              />
              <StatCard
                title="Papers Submitted"
                value={stats.papers_submitted}
                icon={FileText}
                color="bg-purple-500"
                subtitle={`${stats.papers_reviewed} reviewed`}
              />
            </>
          ) : null
        )}

        {/* Revenue — only for users with payment:view */}
        {hasPermission('payment:view') && stats && (
          <StatCard
            title="Total Revenue"
            value={`₹${stats.total_revenue.toLocaleString('en-IN')}`}
            icon={DollarSign}
            color="bg-green-500"
            subtitle="From paid registrations"
          />
        )}

        {(hasPermission('event:view_stats') || hasPermission('page:overview')) && stats && (
          <StatCard
            title="Check-ins Today"
            value={stats.checkins_today}
            icon={CheckCircle}
            color="bg-ochre"
            subtitle="Live attendance"
          />
        )}
      </div>

      {/* Charts */}
      {(hasPermission('event:view_stats') || hasPermission('page:overview')) && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Breakdown Bar Chart */}
          <div className="bg-white rounded-xl border border-ink/10 p-6">
            <h3 className="text-lg font-display font-bold text-navy mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-ochre" />
              Registration Breakdown
            </h3>
            <p className="text-xs text-ink-soft mb-4">
              Total: {stats.total_registrations} registrations
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { name: 'Paid', value: stats.paid_registrations, fill: '#22c55e' },
                  { name: 'Pending', value: stats.pending_registrations, fill: '#f59e0b' },
                  { name: 'Total', value: stats.total_registrations, fill: '#3b82f6' },
                ]}
                margin={{ top: 4, right: 16, left: -20, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {[
                    { name: 'Paid', fill: '#22c55e' },
                    { name: 'Pending', fill: '#f59e0b' },
                    { name: 'Total', fill: '#3b82f6' },
                  ].map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Paper Review Progress Pie Chart */}
          {hasPermission('paper:view_all') && (
            <div className="bg-white rounded-xl border border-ink/10 p-6">
              <h3 className="text-lg font-display font-bold text-navy mb-1">
                Paper Review Progress
              </h3>
            <p className="text-xs text-ink-soft mb-4">
              {stats.papers_submitted} total submissions
            </p>
            {stats.papers_submitted > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Reviewed', value: stats.papers_reviewed },
                        { name: 'Pending', value: stats.papers_submitted - stats.papers_reviewed },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#e9d5ff" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />
                    <div>
                      <p className="text-xs text-ink-soft">Reviewed</p>
                      <p className="text-xl font-display font-bold text-navy">{stats.papers_reviewed}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-violet-200 inline-block" />
                    <div>
                      <p className="text-xs text-ink-soft">Pending Review</p>
                      <p className="text-xl font-display font-bold text-navy">{stats.papers_submitted - stats.papers_reviewed}</p>
                    </div>
                  </div>
                  <div className="mt-1 bg-violet-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-violet-700 font-semibold">
                      {stats.papers_submitted > 0
                        ? `${Math.round((stats.papers_reviewed / stats.papers_submitted) * 100)}% reviewed`
                        : '0% reviewed'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-ink-soft text-sm">
                No papers submitted yet
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* Logistics Stats - Only for those with venue:view */}
      {hasPermission('venue:view') && logisticsStats && (
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-ochre" />
            Logistics Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniStat label="Tasks Complete" value={`${logisticsStats.completion_percentage}%`} />
            <MiniStat label="Equipment Available" value={`${logisticsStats.available_equipment}/${logisticsStats.total_equipment}`} />
            <MiniStat label="Rooms Allocated" value={`${logisticsStats.allocated_rooms}/${logisticsStats.total_rooms}`} />
            <MiniStat label="Checklist" value={`${logisticsStats.checklist_progress}%`} />
          </div>
        </div>
      )}
    </div>
  );
}

// Department Head Specific Overview
function DepartmentHeadOverview({ user, logisticsStats }) {
  const role = user.role;
  
  // Logistics Head - Show logistics stats
  if (role === 'logistics_head' && logisticsStats) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-ochre/10 to-transparent border border-ochre/20 rounded-xl p-6">
          <h2 className="text-2xl font-display font-bold text-navy mb-1">
            Welcome, {user.name}
          </h2>
          <p className="text-sm text-ink-soft">
            Here's your logistics dashboard overview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Task Completion"
            value={`${logisticsStats.completion_percentage}%`}
            icon={CheckCircle}
            color="bg-green-500"
            subtitle={`${logisticsStats.completed_tasks} of ${logisticsStats.total_tasks} tasks`}
          />
          <StatCard
            title="Equipment Available"
            value={logisticsStats.available_equipment}
            icon={Package}
            color="bg-blue-500"
            subtitle={`of ${logisticsStats.total_equipment} total units`}
          />
          <StatCard
            title="Rooms Allocated"
            value={logisticsStats.allocated_rooms}
            icon={DoorOpen}
            color="bg-purple-500"
            subtitle={`of ${logisticsStats.total_rooms} rooms`}
          />
          <StatCard
            title="Checklist Progress"
            value={`${logisticsStats.checklist_progress}%`}
            icon={Calendar}
            color="bg-ochre"
            subtitle={logisticsStats.days_until_event ? `${logisticsStats.days_until_event} days until event` : 'Event date not set'}
          />
        </div>

        {logisticsStats.blocked_tasks > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-900">Attention Required</p>
              <p className="text-xs text-red-700">
                {logisticsStats.blocked_tasks} task(s) are currently blocked and need your attention.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickLink to="/admin/logistics?tab=tasks" label="View Tasks" icon={CheckCircle} />
            <QuickLink to="/admin/logistics?tab=equipment" label="Manage Equipment" icon={Package} />
            <QuickLink to="/admin/logistics?tab=rooms" label="Room Allocation" icon={DoorOpen} />
          </div>
        </div>
      </div>
    );
  }
  
  // Other department heads - their modules aren't built yet
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-12 text-center">
      <div className="w-20 h-20 bg-ochre/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-10 h-10 text-ochre" />
      </div>
      <h2 className="text-2xl font-display font-bold text-navy mb-2">
        Welcome, {user.name}
      </h2>
      <p className="text-sm text-ink-soft mb-6">
        You're logged in as <span className="font-bold text-navy">{getRoleDisplayName(role)}</span>.
      </p>
      <p className="text-sm text-ink-soft">
        Your department module is coming soon. In the meantime, use the sidebar to navigate.
      </p>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
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

function MiniStat({ label, value }) {
  return (
    <div className="bg-atmosphere/50 rounded-lg p-3 text-center">
      <p className="text-2xl font-display font-bold text-navy">{value}</p>
      <p className="text-xs text-ink-soft mt-1">{label}</p>
    </div>
  );
}

function QuickLink({ to, label, icon: Icon }) {
  return (
    <a
      href={to}
      className="flex items-center gap-2 p-3 bg-atmosphere/50 rounded-lg hover:bg-ochre/10 transition-colors"
    >
      <Icon className="w-5 h-5 text-ochre" />
      <span className="text-sm font-medium text-navy">{label}</span>
    </a>
  );
}
