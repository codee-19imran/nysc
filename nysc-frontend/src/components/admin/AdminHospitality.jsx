import { useState, useEffect } from 'react';
import { 
  Home as HospitalityIcon, Users, Utensils, Award, UserCheck, 
  HelpCircle, Package, Award as Certificate, Clock, Download, 
  Plus, Edit2, Trash2, CheckCircle, X, Search, Phone, Mail
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { request } from '../../lib/api';

export default function AdminHospitality() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    seedIfEmpty();
  }, []);

  const seedIfEmpty = async () => {
    try {
      const data = await request('/admin/hospitality/guests');
      if (data.length === 0) {
        await request('/admin/hospitality/seed', { method: 'POST' });
        fetchStats();
      }
    } catch (err) {
      console.error('Seed check failed:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await request('/admin/hospitality/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HospitalityIcon },
    { id: 'participants', label: 'All Participants', icon: Users },
    { id: 'meals', label: 'Meals', icon: Utensils },
    { id: 'guests', label: 'Guests & VIPs', icon: Award },
    { id: 'ceremonies', label: 'Protocol', icon: Award },
    { id: 'volunteers', label: 'Volunteer Deployment', icon: UserCheck },
    { id: 'helpdesk', label: 'Help Desk', icon: HelpCircle },
    { id: 'materials', label: 'Materials', icon: Package },
    { id: 'certificates', label: 'Certificates', icon: Certificate },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-ink/10 p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-ochre text-white' : 'text-ink-soft hover:bg-atmosphere hover:text-navy'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'dashboard' && <HospitalityDashboard stats={stats} />}
      {activeTab === 'participants' && <AllParticipants />}
      {activeTab === 'meals' && <MealsManager />}
      {activeTab === 'guests' && <GuestsManager />}
      {activeTab === 'ceremonies' && <CeremoniesManager />}
      {activeTab === 'volunteers' && <VolunteerDeployment />}
      {activeTab === 'helpdesk' && <HelpDeskManager />}
      {activeTab === 'materials' && <MaterialsManager />}
      {activeTab === 'certificates' && <CertificatesPlaceholder />}
      {activeTab === 'schedule' && <ScheduleTimeline />}
      {activeTab === 'export' && <ExportPanel />}
    </div>
  );
}

// ============ DASHBOARD ============
function HospitalityDashboard({ stats }) {
  if (!stats) return <div className="text-center py-12">Loading...</div>;

  const participantData = [
    { name: 'Students', value: stats.students_count, color: '#3b82f6' },
    { name: 'Professionals', value: stats.professionals_count, color: '#8b5cf6' },
    { name: 'Accompanying', value: stats.accompanying_count, color: '#ec4899' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Participants" value={stats.total_participants} subtitle={`${stats.students_count} students, ${stats.professionals_count} professionals`} icon={Users} color="bg-blue-500" />
        <StatCard title="Students Assisted" value={stats.students_assisted} subtitle={`of ${stats.students_count} students`} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Guests Confirmed" value={stats.guests_confirmed} subtitle="VIPs & speakers" icon={Award} color="bg-purple-500" />
        <StatCard title="Help Desk" value={stats.helpdesk_open} subtitle={`${stats.helpdesk_resolved} resolved`} icon={HelpCircle} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Participants by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={participantData} cx="50%" cy="50%" labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={90} fill="#8884d8" dataKey="value">
                {participantData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Operations Overview</h3>
          <div className="space-y-3">
            <QuickAction icon={Utensils} label={`${stats.meals_planned} meals planned`} color="text-green-600" />
            <QuickAction icon={UserCheck} label={`${stats.volunteers_active} volunteers available`} color="text-blue-600" />
            <QuickAction icon={Package} label={`${stats.materials_ready} material types ready`} color="text-purple-600" />
            <QuickAction icon={HelpCircle} label={`${stats.helpdesk_open} open requests`} color="text-orange-600" />
          </div>
        </div>
      </div>
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

function QuickAction({ icon: Icon, label, color }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-atmosphere/50 rounded-lg">
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="text-sm text-navy">{label}</span>
    </div>
  );
}

// ============ ALL PARTICIPANTS ============
function AllParticipants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assistedFilter, setAssistedFilter] = useState('all');
  const [editingAssistance, setEditingAssistance] = useState(null);

  useEffect(() => {
    fetchParticipants();
  }, [categoryFilter, assistedFilter]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const params = [];
      if (categoryFilter !== 'all') params.push(`category=${categoryFilter}`);
      if (assistedFilter !== 'all') params.push(`assisted_filter=${assistedFilter}`);
      const url = '/admin/hospitality/participants' + (params.length ? '?' + params.join('&') : '');
      const data = await request(url);
      setParticipants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: participants.length,
    assisted: participants.filter(p => p.assisted_at_registration).length,
    needsGuidance: participants.filter(p => p.needs_guidance).length,
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Total Participants</p>
          <p className="text-2xl font-display font-bold text-navy">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Assisted</p>
          <p className="text-2xl font-display font-bold text-green-600">{stats.assisted}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Needs Guidance</p>
          <p className="text-2xl font-display font-bold text-orange-600">{stats.needsGuidance}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Categories</option>
          <option value="student">Students</option>
          <option value="professional">Professionals</option>
          <option value="accompanying">Accompanying</option>
        </select>
        <select value={assistedFilter} onChange={(e) => setAssistedFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Assistance Status</option>
          <option value="assisted">Assisted Only</option>
          <option value="not_assisted">Not Assisted</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Assisted</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Guidance</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Materials</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {participants.map(p => (
              <tr key={p.registration_id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{p.name}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  <div>{p.email}</div>
                  <div>{p.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                    p.category === 'student' ? 'bg-blue-100 text-blue-700' :
                    p.category === 'professional' ? 'bg-purple-100 text-purple-700' :
                    'bg-pink-100 text-pink-700'
                  }`}>
                    {p.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {p.assisted_at_registration ? (
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">✓ Yes</span>
                  ) : (
                    <span className="text-xs text-ink-soft">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {p.needs_guidance ? (
                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700">⚠️ Yes</span>
                  ) : (
                    <span className="text-xs text-ink-soft">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-navy">{p.materials_collected_count}</td>
                <td className="px-6 py-4">
                  <button onClick={() => setEditingAssistance(p)}
                    className="p-1.5 text-ink-soft hover:text-ochre hover:bg-ochre/10 rounded" title="Edit assistance">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {participants.length === 0 && <div className="text-center py-12 text-ink-soft">No participants found</div>}
      </div>

      {editingAssistance && (
        <AssistanceModal participant={editingAssistance} onClose={() => setEditingAssistance(null)}
          onSaved={() => { setEditingAssistance(null); fetchParticipants(); }} />
      )}
    </div>
  );
}

function AssistanceModal({ participant, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    assisted_at_registration: participant.assisted_at_registration || false,
    needs_guidance: participant.needs_guidance || false,
    movement_group: participant.movement_group || '',
    notes: participant.assistance_notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request(`/admin/hospitality/participants/${participant.registration_id}/assistance`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
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
        <h3 className="text-xl font-display font-bold text-navy mb-2">Assistance Tracking</h3>
        <p className="text-sm text-ink-soft mb-4">{participant.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-atmosphere rounded-lg">
            <input type="checkbox" checked={formData.assisted_at_registration}
              onChange={(e) => setFormData({...formData, assisted_at_registration: e.target.checked})}
              className="w-4 h-4 accent-ochre" />
            <span className="text-sm text-navy">Assisted during registration (offline)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-3 bg-atmosphere rounded-lg">
            <input type="checkbox" checked={formData.needs_guidance}
              onChange={(e) => setFormData({...formData, needs_guidance: e.target.checked})}
              className="w-4 h-4 accent-ochre" />
            <span className="text-sm text-navy">Needs extra guidance/hand-holding</span>
          </label>

          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Movement Group</label>
            <input value={formData.movement_group}
              onChange={(e) => setFormData({...formData, movement_group: e.target.value})}
              placeholder="e.g., Group A, Group B"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Notes</label>
            <textarea value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
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

// ============ MEALS MANAGER ============
function MealsManager() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/hospitality/meals').then(setMeals).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this meal?')) return;
    try {
      await request(`/admin/hospitality/meals/${id}`, { method: 'DELETE' });
      setMeals(await request('/admin/hospitality/meals'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Meal
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Meal</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Time</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Expected</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Dietary</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Venue</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {meals.map(m => (
              <tr key={m.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{m.name || m.meal_type}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 capitalize">{m.meal_type}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">
                  {m.time_slot}
                  {m.date && <p className="text-xs">{new Date(m.date).toLocaleDateString()}</p>}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-navy">{m.expected_count}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  V:{m.veg_count} NV:{m.non_veg_count} J:{m.jain_count}
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{m.room_name || m.venue_name || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    m.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                    m.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    m.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{m.status.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditing(m); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <MealForm meal={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setMeals(await request('/admin/hospitality/meals')); }} />}
    </div>
  );
}

function MealForm({ meal, onClose, onSaved }) {
  const [formData, setFormData] = useState(meal || {
    meal_type: 'lunch', name: '', time_slot: '', expected_count: 100,
    menu_items: '', veg_count: 0, non_veg_count: 0, jain_count: 0,
    gluten_free_count: 0, water_stations: 0, vendor_name: '', status: 'planned', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (meal) {
        await request(`/admin/hospitality/meals/${meal.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/hospitality/meals', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{meal ? 'Edit Meal' : 'Add Meal'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Name</label>
              <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Day 1 Lunch" className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
              <select value={formData.meal_type} onChange={(e) => setFormData({...formData, meal_type: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="refreshment">Refreshment</option>
                <option value="tea">Tea</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Time Slot</label>
              <input value={formData.time_slot} onChange={(e) => setFormData({...formData, time_slot: e.target.value})}
                placeholder="08:00-10:00" className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Expected Count</label>
              <input type="number" min="0" value={formData.expected_count}
                onChange={(e) => setFormData({...formData, expected_count: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Menu Items</label>
            <textarea value={formData.menu_items} onChange={(e) => setFormData({...formData, menu_items: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Veg</label>
              <input type="number" min="0" value={formData.veg_count}
                onChange={(e) => setFormData({...formData, veg_count: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-2 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Non-Veg</label>
              <input type="number" min="0" value={formData.non_veg_count}
                onChange={(e) => setFormData({...formData, non_veg_count: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-2 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Jain</label>
              <input type="number" min="0" value={formData.jain_count}
                onChange={(e) => setFormData({...formData, jain_count: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-2 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">GF</label>
              <input type="number" min="0" value={formData.gluten_free_count}
                onChange={(e) => setFormData({...formData, gluten_free_count: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-2 py-2 border border-ink/15 rounded-lg" />
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

// ============ GUESTS MANAGER ============
function GuestsManager() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchGuests();
  }, [categoryFilter]);

  const fetchGuests = async () => {
    try {
      const url = categoryFilter === 'all' ? '/admin/hospitality/guests' : `/admin/hospitality/guests?category=${categoryFilter}`;
      setGuests(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this guest?')) return;
    try {
      await request(`/admin/hospitality/guests/${id}`, { method: 'DELETE' });
      fetchGuests();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Categories</option>
          <option value="chief_guest">Chief Guests</option>
          <option value="speaker">Speakers</option>
          <option value="sponsor">Sponsors</option>
          <option value="media">Media</option>
          <option value="other">Other</option>
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Guest
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Protocol</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {guests.map(g => (
              <tr key={g.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{g.name}</p>
                  <p className="text-xs text-ink-soft">{g.organization || ''}</p>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{g.designation || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                    g.category === 'chief_guest' ? 'bg-red-100 text-red-700' :
                    g.category === 'speaker' ? 'bg-blue-100 text-blue-700' :
                    g.category === 'sponsor' ? 'bg-green-100 text-green-700' :
                    g.category === 'media' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{g.category.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {g.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{g.email}</div>}
                  {g.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{g.phone}</div>}
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{g.protocol_officer || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    g.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    g.status === 'arrived' ? 'bg-green-100 text-green-700' :
                    g.status === 'departed' ? 'bg-gray-100 text-gray-700' :
                    'bg-red-100 text-red-700'
                  }`}>{g.status}</span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditing(g); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <GuestForm guest={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); fetchGuests(); }} />}
    </div>
  );
}

function GuestForm({ guest, onClose, onSaved }) {
  const [formData, setFormData] = useState(guest || {
    name: '', designation: '', organization: '', email: '', phone: '',
    category: 'other', accommodation_details: '', pickup_required: false,
    drop_required: false, dietary_requirements: '', protocol_officer: '',
    status: 'confirmed', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (guest) {
        await request(`/admin/hospitality/guests/${guest.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/hospitality/guests', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{guest ? 'Edit Guest' : 'Add Guest'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Designation</label>
              <input value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Organization</label>
              <input value={formData.organization} onChange={(e) => setFormData({...formData, organization: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Phone</label>
              <input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="chief_guest">Chief Guest</option>
                <option value="speaker">Speaker</option>
                <option value="sponsor">Sponsor</option>
                <option value="media">Media</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="confirmed">Confirmed</option>
                <option value="arrived">Arrived</option>
                <option value="departed">Departed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Protocol Officer</label>
            <input value={formData.protocol_officer} onChange={(e) => setFormData({...formData, protocol_officer: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Dietary Requirements</label>
            <input value={formData.dietary_requirements} onChange={(e) => setFormData({...formData, dietary_requirements: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.pickup_required}
                onChange={(e) => setFormData({...formData, pickup_required: e.target.checked})}
                className="w-4 h-4 accent-ochre" />
              <span className="text-sm text-navy">Pickup Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.drop_required}
                onChange={(e) => setFormData({...formData, drop_required: e.target.checked})}
                className="w-4 h-4 accent-ochre" />
              <span className="text-sm text-navy">Drop Required</span>
            </label>
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

// ============ CEREMONIES MANAGER ============
function CeremoniesManager() {
  const [ceremonies, setCeremonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/hospitality/ceremonies').then(setCeremonies).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this ceremony?')) return;
    try {
      await request(`/admin/hospitality/ceremonies/${id}`, { method: 'DELETE' });
      setCeremonies(await request('/admin/hospitality/ceremonies'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Ceremony
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ceremonies.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-ink/10 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-display font-bold text-navy">{c.name}</h3>
                <p className="text-xs text-ink-soft capitalize">{c.ceremony_type} • {c.time_slot}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                c.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                c.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>{c.status}</span>
            </div>
            
            {c.venue_name && <p className="text-sm text-ink-soft mb-3">📍 {c.venue_name}</p>}
            
            {c.protocol_checklist && c.protocol_checklist.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-ink-soft mb-2">Protocol Checklist</p>
                <div className="space-y-1">
                  {c.protocol_checklist.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className={`w-3 h-3 rounded-full ${item.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={item.completed ? 'line-through text-ink-soft' : 'text-navy'}>{item.item}</span>
                    </div>
                  ))}
                  {c.protocol_checklist.length > 3 && (
                    <p className="text-xs text-ink-soft">+ {c.protocol_checklist.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-2 border-t border-ink/10">
              <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && <CeremonyForm ceremony={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setCeremonies(await request('/admin/hospitality/ceremonies')); }} />}
    </div>
  );
}

function CeremonyForm({ ceremony, onClose, onSaved }) {
  const [formData, setFormData] = useState(ceremony || {
    name: '', ceremony_type: 'inauguration', time_slot: '', venue_name: '',
    dignitary_seating: [], stage_entry_order: [], mementos_list: [],
    protocol_checklist: [], status: 'planned', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (ceremony) {
        await request(`/admin/hospitality/ceremonies/${ceremony.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/hospitality/ceremonies', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{ceremony ? 'Edit Ceremony' : 'Add Ceremony'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
              <select value={formData.ceremony_type} onChange={(e) => setFormData({...formData, ceremony_type: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="inauguration">Inauguration</option>
                <option value="valedictory">Valedictory</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Time Slot</label>
              <input value={formData.time_slot} onChange={(e) => setFormData({...formData, time_slot: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Venue</label>
            <input value={formData.venue_name} onChange={(e) => setFormData({...formData, venue_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <p className="text-xs text-ink-soft">Note: Dignitary seating, stage order, and mementos can be edited via JSON in the database for advanced use.</p>
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

// ============ VOLUNTEER DEPLOYMENT (Filtered view of Logistics tasks) ============
function VolunteerDeployment() {
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      request('/admin/hospitality/volunteer-tasks'),
      request('/admin/hospitality/volunteers-list')
    ]).then(([t, v]) => {
      setTasks(t);
      setVolunteers(v);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await request(`/admin/venue/tasks/${id}`, { method: 'DELETE' });
      setTasks(await request('/admin/hospitality/volunteer-tasks'));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await request(`/admin/venue/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setTasks(await request('/admin/hospitality/volunteer-tasks'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Note:</strong> Volunteer tasks are shared with the Logistics module. Volunteers see their assignments in their dashboard under "My Tasks".
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-ink-soft">
          {tasks.length} tasks assigned to {volunteers.length} volunteers
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Assign Duty
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Task</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Volunteer</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {tasks.map(t => (
              <tr key={t.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{t.task_name}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{t.volunteer_name}</p>
                  <p className="text-xs text-ink-soft">{t.volunteer_phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    t.priority === 'high' ? 'bg-red-100 text-red-700' :
                    t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{t.priority}</span>
                </td>
                <td className="px-6 py-4">
                  <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    className="px-2 py-1 text-xs border border-ink/15 rounded">
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft max-w-xs truncate">{t.notes || '—'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No volunteer tasks yet. Click "Assign Duty" to create one.</div>
        )}
      </div>

      {showForm && <AssignDutyModal volunteers={volunteers} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setTasks(await request('/admin/hospitality/volunteer-tasks')); }} />}
    </div>
  );
}

function AssignDutyModal({ volunteers, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    volunteer_id: '', task_name: '', description: '', priority: 'medium', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/hospitality/volunteer-tasks', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Assign Duty to Volunteer</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Select Volunteer *</label>
            <select required value={formData.volunteer_id}
              onChange={(e) => setFormData({...formData, volunteer_id: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="">— Select —</option>
              {volunteers.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.active_tasks} active tasks)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Task Name *</label>
            <input required value={formData.task_name}
              onChange={(e) => setFormData({...formData, task_name: e.target.value})}
              placeholder="e.g., Guest Reception at Main Gate"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Priority</label>
            <select value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Notes (include duty area)</label>
            <input value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="e.g., Duty area: guest_assistance"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ HELP DESK ============
function HelpDeskManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      const url = statusFilter === 'all' ? '/admin/hospitality/helpdesk' : `/admin/hospitality/helpdesk?status_filter=${statusFilter}`;
      setRequests(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    try {
      await request(`/admin/hospitality/helpdesk/${id}`, { method: 'DELETE' });
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await request(`/admin/hospitality/helpdesk/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Requester</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Description</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Assigned</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{r.requester_name}</p>
                  <p className="text-xs text-ink-soft">{r.requester_email || ''}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{r.category.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    r.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    r.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    r.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{r.priority}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft max-w-xs truncate">{r.description}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{r.assigned_to_name || '—'}</td>
                <td className="px-6 py-4">
                  <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)}
                    className="px-2 py-1 text-xs border border-ink/15 rounded">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <HelpDeskForm onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); fetchRequests(); }} />}
    </div>
  );
}

function HelpDeskForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    requester_name: '', requester_email: '', participant_category: '',
    category: 'other', priority: 'medium', description: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/hospitality/helpdesk', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">New Help Desk Request</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Requester Name *</label>
            <input required value={formData.requester_name}
              onChange={(e) => setFormData({...formData, requester_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Email</label>
            <input type="email" value={formData.requester_email}
              onChange={(e) => setFormData({...formData, requester_email: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
              <select value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="registration">Registration</option>
                <option value="accommodation">Accommodation</option>
                <option value="transport">Transport</option>
                <option value="technical">Technical</option>
                <option value="meals">Meals</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Priority</label>
              <select value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description *</label>
            <textarea required value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ MATERIALS ============
function MaterialsManager() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/hospitality/materials').then(setMaterials).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    try {
      await request(`/admin/hospitality/materials/${id}`, { method: 'DELETE' });
      setMaterials(await request('/admin/hospitality/materials'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Material Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map(m => {
          const pct = m.total_quantity > 0 ? (m.distributed_count / m.total_quantity) * 100 : 0;
          return (
            <div key={m.id} className="bg-white rounded-xl border border-ink/10 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-display font-bold text-navy">{m.name}</h3>
                  {m.description && <p className="text-xs text-ink-soft">{m.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(m); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-soft">Distributed</span>
                  <span className="font-bold text-navy">{m.distributed_count} / {m.total_quantity}</span>
                </div>
                <div className="w-full bg-atmosphere rounded-full h-2">
                  <div className="bg-ochre h-2 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-soft">Remaining: <strong>{m.remaining_count}</strong></span>
                  <span className="text-ink-soft">{m.distribution_venue || ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && <MaterialForm material={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setMaterials(await request('/admin/hospitality/materials')); }} />}
    </div>
  );
}

function MaterialForm({ material, onClose, onSaved }) {
  const [formData, setFormData] = useState(material || {
    name: '', description: '', total_quantity: 0, distribution_venue: '', status: 'ready', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (material) {
        await request(`/admin/hospitality/materials/${material.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/hospitality/materials', { method: 'POST', body: JSON.stringify(formData) });
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
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-display font-bold text-navy mb-4">{material ? 'Edit Material' : 'Add Material'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Total Quantity</label>
              <input type="number" min="0" value={formData.total_quantity}
                onChange={(e) => setFormData({...formData, total_quantity: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Distribution Venue</label>
              <input value={formData.distribution_venue}
                onChange={(e) => setFormData({...formData, distribution_venue: e.target.value})}
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

// ============ CERTIFICATES PLACEHOLDER ============
function CertificatesPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-12 text-center">
      <div className="w-20 h-20 bg-ochre/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Certificate className="w-10 h-10 text-ochre" />
      </div>
      <h2 className="text-2xl font-display font-bold text-navy mb-2">Certificates</h2>
      <p className="text-sm text-ink-soft mb-4">
        Certificate generation and distribution will be managed here.
      </p>
      <div className="inline-block px-4 py-2 bg-ochre/10 text-ochre text-sm font-bold rounded-full">
        Coming Soon
      </div>
    </div>
  );
}

// ============ SCHEDULE TIMELINE ============
function ScheduleTimeline() {
  const [meals, setMeals] = useState([]);
  const [ceremonies, setCeremonies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request('/admin/hospitality/meals'),
      request('/admin/hospitality/ceremonies')
    ]).then(([m, c]) => {
      setMeals(m);
      setCeremonies(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const allEvents = [
    ...meals.map(m => ({ ...m, type: 'meal', color: 'bg-green-500', time: m.time_slot })),
    ...ceremonies.map(c => ({ ...c, type: 'ceremony', color: 'bg-purple-500', time: c.time_slot }))
  ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display font-bold text-navy">Hospitality Schedule</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Meals</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded"></span> Ceremonies</span>
        </div>
      </div>

      <div className="space-y-2">
        {allEvents.map((event, idx) => (
          <div key={`${event.type}-${event.id}`} className="flex items-center gap-4 p-3 bg-atmosphere/50 rounded-lg">
            <div className={`w-2 h-12 ${event.color} rounded-full`}></div>
            <div className="text-xs font-bold text-ink-soft w-24">{event.time || 'TBD'}</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-navy">{event.name || event.meal_type}</p>
              <p className="text-xs text-ink-soft capitalize">{event.type} {event.venue_name && `• ${event.venue_name}`}</p>
            </div>
          </div>
        ))}
        {allEvents.length === 0 && (
          <p className="text-center py-8 text-ink-soft">No events scheduled yet</p>
        )}
      </div>
    </div>
  );
}

// ============ EXPORT PANEL ============
function ExportPanel() {
  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`http://127.0.0.1:8000/admin/hospitality/export/${type}`, {
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

  const exports = [
    { type: 'participants', title: 'All Participants', desc: 'With assistance status', icon: Users },
    { type: 'guests', title: 'Guests & VIPs', desc: 'With special requirements', icon: Award },
    { type: 'volunteer-tasks', title: 'Volunteer Tasks', desc: 'All duty assignments', icon: UserCheck },
    { type: 'helpdesk', title: 'Help Desk', desc: 'All requests', icon: HelpCircle },
    { type: 'materials', title: 'Materials', desc: 'Distribution status', icon: Package },
    { type: 'meals', title: 'Meals Plan', desc: 'All meals with dietary info', icon: Utensils },
  ];

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-8">
      <h3 className="text-xl font-display font-bold text-navy mb-2">Export Hospitality Data</h3>
      <p className="text-sm text-ink-soft mb-6">Download CSV files for reporting and coordination.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exports.map(exp => {
          const Icon = exp.icon;
          return (
            <div key={exp.type} className="border border-ink/15 rounded-xl p-6 hover:border-ochre/50 transition-colors">
              <Icon className="w-10 h-10 text-ochre mb-3" />
              <h4 className="text-lg font-display font-bold text-navy mb-1">{exp.title}</h4>
              <p className="text-xs text-ink-soft mb-4">{exp.desc}</p>
              <button onClick={() => handleExport(exp.type)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
