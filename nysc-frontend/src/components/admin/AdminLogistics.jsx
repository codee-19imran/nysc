import { useState, useEffect } from 'react';
import { 
  Truck, Package, DoorOpen, Calendar, CheckSquare, Download,
  Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle,
  TrendingUp, Users, MapPin, XCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { request } from '../../lib/api';

export default function AdminLogistics() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await request('/admin/venue/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStatsError(err.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'equipment', label: 'Equipment', icon: Package },
    { id: 'rooms', label: 'Rooms', icon: DoorOpen },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'checklists', label: 'Checklists', icon: CheckCircle },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-ink/10 p-2">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-ochre text-white'
                    : 'text-ink-soft hover:bg-atmosphere hover:text-navy'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <LogisticsDashboard stats={stats} loading={statsLoading} error={statsError} onRetry={fetchStats} />}
      {activeTab === 'tasks' && <TasksManager onRefresh={fetchStats} />}
      {activeTab === 'equipment' && <EquipmentManager />}
      {activeTab === 'rooms' && <RoomsManager />}
      {activeTab === 'timeline' && <TimelineManager />}
      {activeTab === 'checklists' && <ChecklistsManager />}
      {activeTab === 'export' && <ExportPanel />}
    </div>
  );
}

// ============ DASHBOARD ============
function LogisticsDashboard({ stats, loading, error, onRetry }) {
  if (loading) return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-ochre border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-ink-soft text-sm">Loading dashboard...</p>
    </div>
  );
  if (error) return (
    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
      <p className="text-red-600 font-bold mb-2">Failed to load logistics data</p>
      <p className="text-sm text-ink-soft mb-4">{error}</p>
      <button onClick={onRetry} className="px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
        Retry
      </button>
    </div>
  );
  // Provide safe defaults so the dashboard renders even with empty data
  const safeStats = stats || {
    completion_percentage: 0, completed_tasks: 0, total_tasks: 0,
    available_equipment: 0, total_equipment: 0, allocated_rooms: 0, total_rooms: 0,
    checklist_progress: 0, days_until_event: null,
    in_progress_tasks: 0, blocked_tasks: 0, not_started_tasks: 0
  };

  const statusData = [
    { name: 'Completed', value: safeStats.completed_tasks, color: '#10b981' },
    { name: 'In Progress', value: safeStats.in_progress_tasks, color: '#f59e0b' },
    { name: 'Blocked', value: safeStats.blocked_tasks, color: '#ef4444' },
    { name: 'Not Started', value: safeStats.not_started_tasks, color: '#6b7280' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Task Completion"
          value={`${safeStats.completion_percentage}%`}
          subtitle={`${safeStats.completed_tasks} of ${safeStats.total_tasks} tasks`}
          icon={CheckSquare}
          color="bg-green-500"
        />
        <DashboardCard
          title="Equipment Available"
          value={`${safeStats.available_equipment}`}
          subtitle={`of ${safeStats.total_equipment} total units`}
          icon={Package}
          color="bg-blue-500"
        />
        <DashboardCard
          title="Rooms Allocated"
          value={`${safeStats.allocated_rooms}`}
          subtitle={`of ${safeStats.total_rooms} rooms`}
          icon={DoorOpen}
          color="bg-purple-500"
        />
        <DashboardCard
          title="Checklist Progress"
          value={`${safeStats.checklist_progress}%`}
          subtitle={safeStats.days_until_event ? `${safeStats.days_until_event} days until event` : 'Event date not set'}
          icon={CheckCircle}
          color="bg-ochre"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <QuickAction icon={AlertTriangle} label={`${safeStats.blocked_tasks} tasks blocked`} color="text-red-600" />
            <QuickAction icon={Clock} label={`${safeStats.in_progress_tasks} tasks in progress`} color="text-yellow-600" />
            <QuickAction icon={Users} label="Assign volunteers to tasks" color="text-blue-600" />
            <QuickAction icon={MapPin} label={`${safeStats.total_rooms - safeStats.allocated_rooms} rooms unallocated`} color="text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-soft mb-1">{title}</p>
          <p className="text-3xl font-display font-bold text-navy">{value}</p>
          {subtitle && <p className="text-sm text-ink-soft mt-2">{subtitle}</p>}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-atmosphere/50 rounded-lg">
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-base text-navy">{label}</span>
    </div>
  );
}

// ============ TASKS MANAGER ============
function TasksManager({ onRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all'); // NEW
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [quickAssignTask, setQuickAssignTask] = useState(null); // NEW
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchAssignableUsers();
  }, [filter, assigneeFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/admin/venue/tasks';
      const params = [];
      if (filter !== 'all') params.push(`category=${filter}`);
      if (params.length) url += '?' + params.join('&');
      
      const data = await request(url);
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const data = await request('/admin/venue/assignable-users');
      setAssignableUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Quick assign without opening full form
  const handleQuickAssign = async (taskId, userId) => {
    try {
      await request(`/admin/venue/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          assigned_to: userId === 'unassign' ? null : userId 
        })
      });
      fetchTasks();
      fetchAssignableUsers(); // Refresh workload counts
      setQuickAssignTask(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await request(`/admin/venue/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    if (assigneeFilter === 'unassigned') return !task.assigned_to;
    if (assigneeFilter === 'assigned') return !!task.assigned_to;
    if (assigneeFilter === 'mine') return task.assigned_to === 'current-user-id'; // Extend later
    if (assigneeFilter !== 'all') return task.assigned_to === assigneeFilter;
    return true;
  });

  // Calculate assignment stats
  const assignmentStats = {
    total: tasks.length,
    assigned: tasks.filter(t => t.assigned_to).length,
    unassigned: tasks.filter(t => !t.assigned_to).length,
  };

  const getStatusBadge = (status) => {
    const styles = {
      not_started: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      blocked: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700',
    };
    return styles[priority] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-ochre border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-ink-soft text-sm">Loading tasks...</p>
    </div>
  );
  if (error) return (
    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
      <p className="text-red-600 font-bold mb-2">Failed to load tasks</p>
      <p className="text-sm text-ink-soft mb-4">{error}</p>
      <button onClick={fetchTasks} className="px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Assignment Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-sm text-ink-soft uppercase font-bold">Total Tasks</p>
          <p className="text-2xl font-display font-bold text-navy">{assignmentStats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-sm text-ink-soft uppercase font-bold">Assigned</p>
          <p className="text-2xl font-display font-bold text-green-600">{assignmentStats.assigned}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-sm text-ink-soft uppercase font-bold">Unassigned</p>
          <p className="text-2xl font-display font-bold text-orange-600">{assignmentStats.unassigned}</p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <div className="flex gap-1 bg-white border border-ink/15 rounded-lg p-1">
            {['all', 'venue', 'infrastructure', 'event_day'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  filter === cat ? 'bg-navy text-white' : 'text-ink-soft hover:bg-atmosphere'
                }`}
              >
                {cat === 'all' ? 'All' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Assignment Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 text-base border border-ink/15 rounded-lg bg-white"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">⚠️ Unassigned Only</option>
            <option value="assigned">✅ Assigned Only</option>
            <optgroup label="By Person">
              {assignableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.active_tasks} active)
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <button
          onClick={() => { setEditingTask(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-base font-bold rounded-lg hover:bg-ochre/90"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Workload Overview (if users have tasks) */}
      {assignableUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <h4 className="text-sm font-bold uppercase text-ink-soft mb-3">Team Workload</h4>
          <div className="flex flex-wrap gap-2">
            {assignableUsers
              .filter(u => u.active_tasks > 0)
              .sort((a, b) => b.active_tasks - a.active_tasks)
              .map(user => (
                <div
                  key={user.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                    user.active_tasks > 5 ? 'bg-red-50 border-red-200' :
                    user.active_tasks > 3 ? 'bg-orange-50 border-orange-200' :
                    'bg-atmosphere border-ink/15'
                  }`}
                >
                  <Avatar name={user.name} size="sm" />
                  <span className="text-sm font-medium text-navy">{user.name}</span>
                  <span className={`text-sm font-bold ${
                    user.active_tasks > 5 ? 'text-red-600' :
                    user.active_tasks > 3 ? 'text-orange-600' :
                    'text-ink-soft'
                  }`}>
                    {user.active_tasks}
                  </span>
                </div>
              ))}
            {assignableUsers.filter(u => u.active_tasks > 0).length === 0 && (
              <p className="text-sm text-ink-soft">No active assignments yet</p>
            )}
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Task</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Priority</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Deadline</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Assigned To</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filteredTasks.map(task => {
              const assignee = assignableUsers.find(u => u.id === task.assigned_to);
              const isOverdue = task.deadline && task.status !== 'completed' && new Date(task.deadline) < new Date();
              
              return (
                <tr key={task.id} className={`hover:bg-atmosphere/50 ${!task.assigned_to ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="text-base font-medium text-navy">{task.task_name}</p>
                    {task.description && <p className="text-sm text-ink-soft mt-1">{task.description}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft capitalize">{task.category.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-base font-bold rounded-full ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-base font-bold rounded-full ${getStatusBadge(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {task.deadline ? (
                      <div>
                        <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-navy'}`}>
                          {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        {isOverdue && <span className="text-xs text-red-600 font-bold">⚠️ Overdue</span>}
                      </div>
                    ) : (
                      <span className="text-sm text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={assignee.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-navy">{assignee.name}</p>
                          <p className="text-xs text-ink-soft capitalize">{assignee.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-orange-600 font-bold">⚠️ Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {/* Quick Assign Button */}
                      <button
                        onClick={() => setQuickAssignTask(task)}
                        title="Quick Assign"
                        className="p-1.5 text-ink-soft hover:text-ochre hover:bg-ochre/10 rounded"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingTask(task); setShowForm(true); }}
                        className="p-1.5 text-ink-soft hover:text-navy hover:bg-atmosphere rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No tasks match your filters</div>
        )}
      </div>

      {/* Full Task Form Modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          assignableUsers={assignableUsers}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchTasks(); fetchAssignableUsers(); if (onRefresh) onRefresh(); }}
        />
      )}

      {/* Quick Assign Modal */}
      {quickAssignTask && (
        <QuickAssignModal
          task={quickAssignTask}
          users={assignableUsers}
          onClose={() => setQuickAssignTask(null)}
          onAssign={(userId) => handleQuickAssign(quickAssignTask.id, userId)}
        />
      )}
    </div>
  );
}

function TaskForm({ task, assignableUsers, onClose, onSaved }) {
  const formatDeadlineForInput = (deadline) => {
    if (!deadline) return '';
    const date = new Date(deadline);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    category: task?.category || 'venue',
    task_name: task?.task_name || '',
    description: task?.description || '',
    status: task?.status || 'not_started',
    priority: task?.priority || 'medium',
    deadline: formatDeadlineForInput(task?.deadline),
    assigned_to: task?.assigned_to || '',
    notes: task?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        assigned_to: formData.assigned_to || null
      };
      
      if (task) {
        await request(`/admin/venue/tasks/${task.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await request('/admin/venue/tasks', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-display font-bold text-navy mb-4">
          {task ? 'Edit Task' : 'Add New Task'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Task Name *</label>
            <input
              required
              value={formData.task_name}
              onChange={(e) => setFormData({...formData, task_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
              >
                <option value="venue">Venue</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="event_day">Event Day</option>
              </select>
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          {/* ✅ NEW: Assignee Dropdown */}
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">
              Assign To <span className="text-ink-soft/60 normal-case">(optional)</span>
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
            >
              <option value="">— Unassigned —</option>
              {assignableUsers?.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role.replace('_', ' ')}) • {user.active_tasks} active
                </option>
              ))}
            </select>
            <p className="text-sm text-ink-soft mt-1">
              Assign to a team member. Use Quick Assign (👥 icon) for faster assignment.
            </p>
          </div>

          <div>
            <label className="text-base font-bold uppercase text-ink-soft">
              Deadline <span className="text-ink-soft/60 normal-case">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>

          {task && (
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={2}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg hover:bg-atmosphere">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ EQUIPMENT MANAGER ============
function EquipmentManager() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const [error, setError] = useState(null);

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request('/admin/venue/equipment');
      setEquipment(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this equipment?')) return;
    try {
      await request(`/admin/venue/equipment/${id}`, { method: 'DELETE' });
      fetchEquipment();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-ochre border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-ink-soft text-sm">Loading equipment...</p>
    </div>
  );
  if (error) return (
    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
      <p className="text-red-600 font-bold mb-2">Failed to load equipment</p>
      <p className="text-sm text-ink-soft mb-4">{error}</p>
      <button onClick={fetchEquipment} className="px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-base font-bold rounded-lg hover:bg-ochre/90"
        >
          <Plus className="w-4 h-4" /> Add Equipment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Total</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Available</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Booked</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Condition</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Location</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {equipment.map(item => (
              <tr key={item.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-base font-medium text-navy">{item.name}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{item.category}</td>
                <td className="px-6 py-4 text-base text-navy font-bold">{item.total_quantity}</td>
                <td className="px-6 py-4 text-base text-green-600 font-bold">{item.available_quantity}</td>
                <td className="px-6 py-4 text-base text-orange-600 font-bold">{item.booked_quantity}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-base font-bold rounded-full ${
                    item.condition === 'excellent' ? 'bg-green-100 text-green-700' :
                    item.condition === 'good' ? 'bg-blue-100 text-blue-700' :
                    item.condition === 'needs_repair' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {item.condition}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{item.location || '-'}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <EquipmentForm
          item={editingItem}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchEquipment(); }}
        />
      )}
    </div>
  );
}

function EquipmentForm({ item, onClose, onSaved }) {
  const [formData, setFormData] = useState(item || {
    name: '', category: 'AV', total_quantity: 0, available_quantity: 0,
    booked_quantity: 0, condition: 'good', location: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (item) {
        await request(`/admin/venue/equipment/${item.id}`, {
          method: 'PUT', body: JSON.stringify(formData)
        });
      } else {
        await request('/admin/venue/equipment', {
          method: 'POST', body: JSON.stringify(formData)
        });
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-display font-bold text-navy mb-4">
          {item ? 'Edit Equipment' : 'Add Equipment'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Category</label>
              <input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Condition</label>
              <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="broken">Broken</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Total Qty</label>
              <input type="number" min="0" value={formData.total_quantity}
                onChange={(e) => setFormData({...formData, total_quantity: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Available</label>
              <input type="number" min="0" value={formData.available_quantity}
                onChange={(e) => setFormData({...formData, available_quantity: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Booked</label>
              <input type="number" min="0" value={formData.booked_quantity}
                onChange={(e) => setFormData({...formData, booked_quantity: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Location</label>
            <input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ ROOMS MANAGER ============
function RoomsManager() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => { fetchRooms(); }, []);

  const [error, setError] = useState(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request('/admin/venue/rooms');
      setRooms(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this room?')) return;
    try {
      await request(`/admin/venue/rooms/${id}`, { method: 'DELETE' });
      fetchRooms();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-ochre border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-ink-soft text-sm">Loading rooms...</p>
    </div>
  );
  if (error) return (
    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
      <p className="text-red-600 font-bold mb-2">Failed to load rooms</p>
      <p className="text-sm text-ink-soft mb-4">{error}</p>
      <button onClick={fetchRooms} className="px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditingRoom(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-base font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Room</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Number</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Capacity</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Floor</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Allocated To</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Time Slot</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-base font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rooms.map(room => (
              <tr key={room.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-base font-medium text-navy">{room.room_name}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{room.room_number || '-'}</td>
                <td className="px-6 py-4 text-base text-navy font-bold">{room.capacity}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{room.floor || '-'}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{room.allocated_to || '-'}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{room.time_slot || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-base font-bold rounded-full ${room.allocated_to ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {room.allocated_to ? 'Allocated' : 'Available'}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditingRoom(room); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(room.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RoomForm
          room={editingRoom}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRooms(); }}
        />
      )}
    </div>
  );
}

function RoomForm({ room, onClose, onSaved }) {
  const [formData, setFormData] = useState(room || {
    room_name: '', room_number: '', capacity: 0, floor: '',
    allocated_to: '', session_type: 'other', time_slot: '',
    special_requirements: '', is_confirmed: false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (room) {
        await request(`/admin/venue/rooms/${room.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/venue/rooms', { method: 'POST', body: JSON.stringify(formData) });
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-display font-bold text-navy mb-4">{room ? 'Edit Room' : 'Add Room'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Room Name *</label>
              <input required value={formData.room_name} onChange={(e) => setFormData({...formData, room_name: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Room Number</label>
              <input value={formData.room_number} onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Capacity *</label>
              <input type="number" min="0" required value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Floor</label>
              <input value={formData.floor} onChange={(e) => setFormData({...formData, floor: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Allocated To</label>
            <input value={formData.allocated_to} onChange={(e) => setFormData({...formData, allocated_to: e.target.value})}
              placeholder="Session name or leave empty"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Session Type</label>
              <select value={formData.session_type} onChange={(e) => setFormData({...formData, session_type: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="technical">Technical</option>
                <option value="keynote">Keynote</option>
                <option value="workshop">Workshop</option>
                <option value="exhibition">Exhibition</option>
                <option value="registration">Registration</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Time Slot</label>
              <input value={formData.time_slot} onChange={(e) => setFormData({...formData, time_slot: e.target.value})}
                placeholder="e.g., Day 1, 9:00-10:30"
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="confirmed" checked={formData.is_confirmed}
              onChange={(e) => setFormData({...formData, is_confirmed: e.target.checked})} />
            <label htmlFor="confirmed" className="text-base text-navy">Allocation Confirmed</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ TIMELINE MANAGER ============
function TimelineManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => { fetchEvents(); }, []);

  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request('/admin/venue/timeline');
      setEvents(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await request(`/admin/venue/timeline/${id}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-ochre border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-ink-soft text-sm">Loading timeline...</p>
    </div>
  );
  if (error) return (
    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
      <p className="text-red-600 font-bold mb-2">Failed to load timeline</p>
      <p className="text-sm text-ink-soft mb-4">{error}</p>
      <button onClick={fetchEvents} className="px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditingEvent(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-base font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Event Timeline</h3>
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="flex items-center gap-4 p-4 bg-atmosphere/50 rounded-lg">
              <div className="text-base font-bold text-ink-soft w-32">
                {new Date(event.start_time).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-navy">{event.task_name}</p>
                <p className="text-sm text-ink-soft">{event.location || 'TBD'} • {event.category.replace('_', ' ')}</p>
              </div>
              <span className={`px-2 py-1 text-base font-bold rounded-full ${
                event.status === 'completed' ? 'bg-green-100 text-green-700' :
                event.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {event.status}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingEvent(event); setShowForm(true); }} className="p-1.5 hover:bg-white rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(event.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-center py-8 text-ink-soft">No timeline events. Add events to plan your event day.</p>}
        </div>
      </div>

      {showForm && (
        <TimelineForm
          event={editingEvent}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchEvents(); }}
        />
      )}
    </div>
  );
}

function TimelineForm({ event, onClose, onSaved }) {
  const [formData, setFormData] = useState(event || {
    task_name: '', category: 'event_day',
    start_time: '', end_time: '', location: '', status: 'scheduled', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      };
      if (event) {
        await request(`/admin/venue/timeline/${event.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/admin/venue/timeline', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6">
        <h3 className="text-xl font-display font-bold text-navy mb-4">{event ? 'Edit Event' : 'Add Event'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Event Name *</label>
            <input required value={formData.task_name} onChange={(e) => setFormData({...formData, task_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Start Time *</label>
              <input type="datetime-local" required value={formData.start_time.slice(0, 16)}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">End Time *</label>
              <input type="datetime-local" required value={formData.end_time.slice(0, 16)}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="venue">Venue</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="event_day">Event Day</option>
              </select>
            </div>
            <div>
              <label className="text-base font-bold uppercase text-ink-soft">Location</label>
              <input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ CHECKLISTS MANAGER ============
function ChecklistsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchItems(); }, [filter]);

  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filter === 'all' ? '/admin/venue/checklists' : `/admin/venue/checklists?category=${filter}`;
      const data = await request(url);
      setItems(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (item) => {
    try {
      await request(`/admin/venue/checklists/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_completed: !item.is_completed })
      });
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await request(`/admin/venue/checklists/${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-ochre border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-ink-soft text-sm">Loading checklists...</p>
    </div>
  );
  if (error) return (
    <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
      <p className="text-red-600 font-bold mb-2">Failed to load checklists</p>
      <p className="text-sm text-ink-soft mb-4">{error}</p>
      <button onClick={fetchItems} className="px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">Retry</button>
    </div>
  );

  // Group by template
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.template_name]) acc[item.template_name] = [];
    acc[item.template_name].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'pre_event', 'event_day_morning', 'post_event'].map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-4 py-2 text-base font-medium rounded-lg ${filter === cat ? 'bg-navy text-white' : 'bg-white border border-ink/15'}`}>
              {cat === 'all' ? 'All' : cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-base font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {Object.entries(grouped).map(([template, templateItems]) => {
        const completed = templateItems.filter(i => i.is_completed).length;
        const progress = (completed / templateItems.length) * 100;
        return (
          <div key={template} className="bg-white rounded-xl border border-ink/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-navy">{template}</h3>
              <span className="text-sm text-ink-soft">{completed}/{templateItems.length} complete</span>
            </div>
            <div className="w-full bg-atmosphere rounded-full h-2 mb-4">
              <div className="bg-ochre h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div>
            </div>
            <div className="space-y-2">
              {templateItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-atmosphere/50 rounded-lg hover:bg-atmosphere transition-colors">
                  <button
                    onClick={() => toggleComplete(item)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      item.is_completed ? 'bg-moss border-moss' : 'border-ink/30 hover:border-ochre'
                    }`}
                  >
                    {item.is_completed && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>
                  <span className={`flex-1 text-base ${item.is_completed ? 'line-through text-ink-soft' : 'text-navy'}`}>
                    {item.item}
                  </span>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showForm && <ChecklistForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchItems(); }} />}
    </div>
  );
}

function ChecklistForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    template_name: '', category: 'pre_event', item: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/venue/checklists', { method: 'POST', body: JSON.stringify(formData) });
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Checklist Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Template Name *</label>
            <input required value={formData.template_name} onChange={(e) => setFormData({...formData, template_name: e.target.value})}
              placeholder="e.g., Pre-Event, Event-Day Morning"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="pre_event">Pre-Event</option>
              <option value="event_day_morning">Event-Day Morning</option>
              <option value="post_event">Post-Event</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-base font-bold uppercase text-ink-soft">Item *</label>
            <input required value={formData.item} onChange={(e) => setFormData({...formData, item: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ EXPORT PANEL ============
function ExportPanel() {
  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`http://127.0.0.1:8000/admin/venue/export/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-8">
      <h3 className="text-xl font-display font-bold text-navy mb-2">Export Logistics Data</h3>
      <p className="text-sm text-ink-soft mb-6">Download your logistics data as CSV files for offline use or reporting.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExportCard
          title="Tasks"
          description="All venue tasks with status, priority, and assignments"
          icon={CheckSquare}
          onExport={() => handleExport('tasks')}
        />
        <ExportCard
          title="Equipment"
          description="Complete equipment inventory with quantities and conditions"
          icon={Package}
          onExport={() => handleExport('equipment')}
        />
        <ExportCard
          title="Rooms"
          description="Room allocations with capacities and session assignments"
          icon={DoorOpen}
          onExport={() => handleExport('rooms')}
        />
      </div>
    </div>
  );
}

function ExportCard({ title, description, icon: Icon, onExport }) {
  return (
    <div className="border border-ink/15 rounded-xl p-6 hover:border-ochre/50 transition-colors">
      <Icon className="w-10 h-10 text-ochre mb-3" />
      <h4 className="text-lg font-display font-bold text-navy mb-1">{title}</h4>
      <p className="text-sm text-ink-soft mb-4">{description}</p>
      <button onClick={onExport}
        className="w-full flex items-center justify-center gap-2 py-2 bg-navy text-white text-base font-bold rounded-lg hover:bg-navy/90">
        <Download className="w-4 h-4" /> Export CSV
      </button>
    </div>
  );
}

// Avatar component with initials
function Avatar({ name, size = 'md', role }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-ochre', 'bg-pink-500', 'bg-indigo-500',
    'bg-teal-500', 'bg-red-500'
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm'
  };
  
  return (
    <div 
      className={`${colors[colorIndex]} ${sizes[size]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      title={name}
    >
      {initials}
    </div>
  );
}

function QuickAssignModal({ task, users, onClose, onAssign }) {
  const [search, setSearch] = useState('');
  
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[80vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold text-navy">Quick Assign</h3>
            <p className="text-sm text-ink-soft mt-1">
              Assigning: <span className="font-medium text-navy">{task.task_name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-atmosphere rounded">
            <XCircle className="w-5 h-5 text-ink-soft" />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search team members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
        />

        {task.assigned_to && (
          <button
            onClick={() => onAssign('unassign')}
            className="w-full flex items-center gap-3 p-3 mb-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-left">
              <p className="text-base font-medium text-red-700">Unassign</p>
              <p className="text-sm text-ink-soft">Remove current assignment</p>
            </div>
          </button>
        )}

        <div className="space-y-1 max-h-96 overflow-auto">
          {filteredUsers.map(user => (
            <button
              key={user.id}
              onClick={() => onAssign(user.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-atmosphere transition-colors ${
                task.assigned_to === user.id ? 'bg-ochre/10 border border-ochre/30' : ''
              }`}
            >
              <Avatar name={user.name} size="md" />
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-navy">
                  {user.name}
                  {task.assigned_to === user.id && (
                    <span className="ml-2 text-xs text-ochre font-bold">CURRENT</span>
                  )}
                </p>
                <p className="text-sm text-ink-soft capitalize">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${
                  user.active_tasks > 5 ? 'text-red-600' :
                  user.active_tasks > 3 ? 'text-orange-600' :
                  'text-ink-soft'
                }`}>
                  {user.active_tasks} active
                </p>
                {user.active_tasks > 5 && (
                  <p className="text-xs text-red-600">⚠️ Heavy load</p>
                )}
              </div>
            </button>
          ))}
          {filteredUsers.length === 0 && (
            <p className="text-center py-8 text-sm text-ink-soft">No team members found</p>
          )}
        </div>
      </div>
    </div>
  );
}
