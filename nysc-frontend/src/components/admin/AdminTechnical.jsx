import { useState, useEffect } from 'react';
import { 
  GraduationCap, Calendar, FileText, Users, Award, Trophy, 
  Monitor, Award as Certificate, Clock, Download, Plus, Edit2, 
  Trash2, CheckCircle, X, Search, Link2, Unlink, Eye
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { request, API_BASE } from '../../lib/api';

export default function AdminTechnical() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    seedIfEmpty();
  }, []);

  const seedIfEmpty = async () => {
    try {
      const data = await request('/admin/technical/sessions');
      if (data.length === 0) {
        await request('/admin/technical/seed', { method: 'POST' });
        fetchStats();
      }
    } catch (err) {
      console.error('Seed check failed:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await request('/admin/technical/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'papers', label: 'Accepted Papers', icon: FileText },
    { id: 'judges', label: 'Judges', icon: Users },
    { id: 'rubrics', label: 'Rubrics', icon: Award },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'demos', label: 'Demos', icon: Monitor },
    { id: 'certificates', label: 'Certificates', icon: Certificate },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-ink/10 p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
      {activeTab === 'dashboard' && <TechnicalDashboard stats={stats} />}
      {activeTab === 'sessions' && <SessionsManager onRefresh={fetchStats} />}
      {activeTab === 'papers' && <AcceptedPapersView onRefresh={fetchStats} />}
      {activeTab === 'judges' && <JudgesManager />}
      {activeTab === 'rubrics' && <RubricsManager />}
      {activeTab === 'challenges' && <ChallengesManager />}
      {activeTab === 'demos' && <DemosManager />}
      {activeTab === 'certificates' && <CertificatesPlaceholder />}
      {activeTab === 'schedule' && <ScheduleTimeline />}
      {activeTab === 'export' && <ExportPanel />}
    </div>
  );
}

// ============ DASHBOARD ============
function TechnicalDashboard({ stats }) {
  if (!stats) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Accepted Papers" value={stats.accepted_papers} subtitle={`${stats.papers_assigned} assigned, ${stats.papers_unassigned} pending`} icon={FileText} color="bg-blue-500" />
        <StatCard title="Sessions Scheduled" value={stats.sessions_scheduled} subtitle={`${stats.judges_count} judges in panel`} icon={Calendar} color="bg-purple-500" />
        <StatCard title="Technical Challenges" value={stats.challenges_active} subtitle="Active challenges" icon={Trophy} color="bg-ochre" />
        <StatCard title="Demos & Exhibitions" value={stats.demos_scheduled} subtitle={`${stats.rubrics_active} rubrics ready`} icon={Monitor} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Paper Assignment Status</h3>
          <div className="space-y-3">
            <ProgressBar label="Papers Assigned" value={stats.papers_assigned} total={stats.accepted_papers} color="bg-green-500" />
            <ProgressBar label="Papers Pending" value={stats.papers_unassigned} total={stats.accepted_papers} color="bg-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <QuickAction icon={FileText} label={`${stats.papers_unassigned} papers need session assignment`} color="text-orange-600" />
            <QuickAction icon={Users} label={`${stats.judges_count} judges available for sessions`} color="text-blue-600" />
            <QuickAction icon={Award} label={`${stats.rubrics_active} evaluation rubrics ready`} color="text-purple-600" />
            <QuickAction icon={Trophy} label={`${stats.challenges_active} technical challenges active`} color="text-ochre" />
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

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-navy">{label}</span>
        <span className="text-ink-soft">{value} / {total}</span>
      </div>
      <div className="w-full bg-atmosphere rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
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

// ============ SESSIONS MANAGER ============
function SessionsManager({ onRefresh }) {
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([
      request('/admin/technical/sessions'),
      request('/admin/technical/rooms')
    ]).then(([s, r]) => {
      setSessions(s);
      setRooms(r);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this session?')) return;
    try {
      await request(`/admin/technical/sessions/${id}`, { method: 'DELETE' });
      const data = await request('/admin/technical/sessions');
      setSessions(data);
      onRefresh();
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
          <Plus className="w-4 h-4" /> Add Session
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Session</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Time</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Room</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Papers</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Judges</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {sessions.map(s => (
              <tr key={s.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{s.name}</p>
                  {s.chair_name && <p className="text-xs text-ink-soft">Chair: {s.chair_name}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{s.session_type.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{s.domain || '—'}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">
                  {s.time_slot || '—'}
                  {s.date && <p className="text-xs">{new Date(s.date).toLocaleDateString()}</p>}
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{s.room_name || '—'}</td>
                <td className="px-6 py-4 text-sm font-bold text-navy">{s.papers_assigned_count}</td>
                <td className="px-6 py-4 text-sm font-bold text-navy">{s.judges_assigned_count}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditing(s); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && <div className="text-center py-12 text-ink-soft">No sessions yet</div>}
      </div>

      {showForm && <SessionForm session={editing} rooms={rooms} onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          const data = await request('/admin/technical/sessions');
          setSessions(data);
          onRefresh();
        }} />}
    </div>
  );
}

function SessionForm({ session, rooms, onClose, onSaved }) {
  const [formData, setFormData] = useState(session || {
    name: '', session_type: 'technical', domain: '', description: '',
    date: '', time_slot: '', capacity: 50, chair_name: '', status: 'scheduled', notes: '', room_id: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, room_id: formData.room_id || null };
      if (session) {
        await request(`/admin/technical/sessions/${session.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/admin/technical/sessions', { method: 'POST', body: JSON.stringify(payload) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{session ? 'Edit Session' : 'Add Session'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Session Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
              <select value={formData.session_type} onChange={(e) => setFormData({...formData, session_type: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="keynote">Keynote</option>
                <option value="technical">Technical</option>
                <option value="workshop">Workshop</option>
                <option value="panel">Panel</option>
                <option value="student_research">Student Research</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Domain</label>
              <select value={formData.domain} onChange={(e) => setFormData({...formData, domain: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="">None</option>
                <option value="Mining & Earth Observation">Mining & Earth Observation</option>
                <option value="Renewable Energy & Sustainability">Renewable Energy</option>
                <option value="Environmental Science & Climate">Environmental Science</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Date</label>
              <input type="date" value={formData.date ? formData.date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Time Slot</label>
              <input value={formData.time_slot} onChange={(e) => setFormData({...formData, time_slot: e.target.value})}
                placeholder="e.g., 09:00-10:30" className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Capacity</label>
              <input type="number" min="0" value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Room</label>
            <select value={formData.room_id} onChange={(e) => setFormData({...formData, room_id: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="">— No room —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name} (Cap: {r.capacity})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Session Chair</label>
            <input value={formData.chair_name} onChange={(e) => setFormData({...formData, chair_name: e.target.value})}
              placeholder="Judge name" className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
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

// ============ ACCEPTED PAPERS VIEW ============
function AcceptedPapersView({ onRefresh }) {
  const [papers, setPapers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('all');
  const [assignFilter, setAssignFilter] = useState('all');
  const [assigningPaper, setAssigningPaper] = useState(null);

  useEffect(() => {
    Promise.all([
      request('/admin/technical/accepted-papers'),
      request('/admin/technical/sessions')
    ]).then(([p, s]) => {
      setPapers(p);
      setSessions(s);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = papers.filter(p => {
    if (domainFilter !== 'all' && p.domain !== domainFilter) return false;
    if (assignFilter === 'assigned' && !p.assigned_to_session) return false;
    if (assignFilter === 'unassigned' && p.assigned_to_session) return false;
    return true;
  });

  const handleAssign = async (paperId, sessionId) => {
    try {
      await request('/admin/technical/session-papers', {
        method: 'POST',
        body: JSON.stringify({ paper_id: paperId, session_id: sessionId })
      });
      const data = await request('/admin/technical/accepted-papers');
      setPapers(data);
      setAssigningPaper(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnassign = async (paperId) => {
    if (!confirm('Unassign this paper?')) return;
    try {
      await request(`/admin/technical/session-papers/${paperId}`, { method: 'DELETE' });
      const data = await request('/admin/technical/accepted-papers');
      setPapers(data);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const assignedCount = papers.filter(p => p.assigned_to_session).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Total Accepted</p>
          <p className="text-2xl font-display font-bold text-navy">{papers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Assigned</p>
          <p className="text-2xl font-display font-bold text-green-600">{assignedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Pending</p>
          <p className="text-2xl font-display font-bold text-orange-600">{papers.length - assignedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Domains</option>
          <option value="Mining & Earth Observation">Mining</option>
          <option value="Renewable Energy & Sustainability">Renewable Energy</option>
          <option value="Environmental Science & Climate">Environmental Science</option>
        </select>
        <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Papers</option>
          <option value="assigned">Assigned Only</option>
          <option value="unassigned">Unassigned Only</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Paper</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Author</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filtered.map(paper => {
              const assignedSession = sessions.find(s => s.id === paper.assigned_to_session);
              return (
                <tr key={paper.id} className={`hover:bg-atmosphere/50 ${!paper.assigned_to_session ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-navy">{paper.title}</p>
                    {paper.abstract && <p className="text-xs text-ink-soft mt-1 line-clamp-2">{paper.abstract}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{paper.author_name}</td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{paper.domain || '—'}</td>
                  <td className="px-6 py-4">
                    {assignedSession ? (
                      <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">
                        {assignedSession.name}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-600 font-bold">⚠️ Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setAssigningPaper(paper)}
                        className="p-1.5 text-ink-soft hover:text-ochre hover:bg-ochre/10 rounded" title="Assign to session">
                        <Link2 className="w-4 h-4" />
                      </button>
                      {paper.assigned_to_session && (
                        <button onClick={() => handleUnassign(paper.id)}
                          className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded" title="Unassign">
                          <Unlink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-ink-soft">No accepted papers found</div>}
      </div>

      {assigningPaper && (
        <AssignPaperModal paper={assigningPaper} sessions={sessions}
          onClose={() => setAssigningPaper(null)}
          onAssign={(sessionId) => handleAssign(assigningPaper.id, sessionId)} />
      )}
    </div>
  );
}

function AssignPaperModal({ paper, sessions, onClose, onAssign }) {
  const [selectedSession, setSelectedSession] = useState('');
  const [isStudent, setIsStudent] = useState(paper.is_student_research);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-display font-bold text-navy mb-2">Assign Paper to Session</h3>
        <p className="text-sm text-ink-soft mb-4">{paper.title}</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Select Session *</label>
            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="">— Select —</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.time_slot && `(${s.time_slot})`}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)}
              className="w-4 h-4 accent-ochre" />
            <span className="text-sm text-navy">Mark as Student Research Presentation</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
          <button onClick={() => onAssign(selectedSession)} disabled={!selectedSession}
            className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ JUDGES MANAGER ============
function JudgesManager() {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/technical/judges').then(setJudges).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this judge?')) return;
    try {
      await request(`/admin/technical/judges/${id}`, { method: 'DELETE' });
      setJudges(await request('/admin/technical/judges'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-ink-soft">Judges have no website accounts. Export their schedule to share with them.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Judge
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Institution</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Specialization</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Sessions</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {judges.map(j => (
              <tr key={j.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{j.name}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{j.institution || '—'}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{j.specialization || '—'}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{j.email || '—'}</td>
                <td className="px-6 py-4 text-sm font-bold text-navy">{j.sessions_assigned_count}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${j.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {j.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditing(j); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(j.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {judges.length === 0 && <div className="text-center py-12 text-ink-soft">No judges yet</div>}
      </div>

      {showForm && <JudgeForm judge={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setJudges(await request('/admin/technical/judges')); }} />}
    </div>
  );
}

function JudgeForm({ judge, onClose, onSaved }) {
  const [formData, setFormData] = useState(judge || {
    name: '', email: '', phone: '', institution: '', specialization: '', bio: '', is_available: true, notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (judge) {
        await request(`/admin/technical/judges/${judge.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/technical/judges', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{judge ? 'Edit Judge' : 'Add Judge'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
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
              <label className="text-xs font-bold uppercase text-ink-soft">Institution</label>
              <input value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Specialization</label>
              <select value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="">None</option>
                <option value="Mining & Earth Observation">Mining & Earth Observation</option>
                <option value="Renewable Energy & Sustainability">Renewable Energy</option>
                <option value="Environmental Science & Climate">Environmental Science</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Bio</label>
            <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.is_available} onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
              className="w-4 h-4 accent-ochre" />
            <span className="text-sm text-navy">Available for sessions</span>
          </label>
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

// ============ RUBRICS MANAGER ============
function RubricsManager() {
  const [rubrics, setRubrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingRubric, setViewingRubric] = useState(null);

  useEffect(() => {
    request('/admin/technical/rubrics').then(setRubrics).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this rubric and all its criteria?')) return;
    try {
      await request(`/admin/technical/rubrics/${id}`, { method: 'DELETE' });
      setRubrics(await request('/admin/technical/rubrics'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Rubric
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rubrics.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-ink/10 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-display font-bold text-navy">{r.name}</h3>
                <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 capitalize">
                  {r.category.replace('_', ' ')}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setViewingRubric(r)} className="p-1.5 hover:bg-atmosphere rounded" title="View criteria">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {r.description && <p className="text-sm text-ink-soft mb-3">{r.description}</p>}
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-soft">Total Score</p>
                <p className="font-bold text-navy">{r.total_score}</p>
              </div>
              <div>
                <p className="text-xs text-ink-soft">Passing</p>
                <p className="font-bold text-navy">{r.passing_threshold}</p>
              </div>
              <div>
                <p className="text-xs text-ink-soft">Criteria</p>
                <p className="font-bold text-navy">{r.criteria.length}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rubrics.length === 0 && (
        <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
          No rubrics yet. Create one to start evaluating presentations.
        </div>
      )}

      {showForm && <RubricForm onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setRubrics(await request('/admin/technical/rubrics')); }} />}
      
      {viewingRubric && <RubricDetailModal rubric={viewingRubric} onClose={() => setViewingRubric(null)} />}
    </div>
  );
}

function RubricForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: '', category: 'presentation', description: '', total_score: 100, passing_threshold: 50
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/technical/rubrics', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Create Rubric</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="presentation">Paper Presentation</option>
              <option value="student_research">Student Research</option>
              <option value="technical_challenge">Technical Challenge</option>
              <option value="demo">Demo</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Total Score</label>
              <input type="number" min="1" value={formData.total_score}
                onChange={(e) => setFormData({...formData, total_score: parseFloat(e.target.value)})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Passing Threshold</label>
              <input type="number" min="0" value={formData.passing_threshold}
                onChange={(e) => setFormData({...formData, passing_threshold: parseFloat(e.target.value)})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
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

function RubricDetailModal({ rubric, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-display font-bold text-navy">{rubric.name}</h3>
            <p className="text-sm text-ink-soft capitalize">{rubric.category.replace('_', ' ')}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-atmosphere rounded"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-2">
          {rubric.criteria.map((c, idx) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-atmosphere/50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-navy">{idx + 1}. {c.name}</p>
                {c.description && <p className="text-xs text-ink-soft">{c.description}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-navy">{c.max_score} pts</p>
                <p className="text-xs text-ink-soft">Weight: {c.weight}x</p>
              </div>
            </div>
          ))}
          {rubric.criteria.length === 0 && (
            <p className="text-center py-8 text-ink-soft">No criteria added yet</p>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-ink/10 flex justify-between text-sm">
          <span className="text-ink-soft">Total: <strong className="text-navy">{rubric.total_score}</strong></span>
          <span className="text-ink-soft">Passing: <strong className="text-navy">{rubric.passing_threshold}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ============ CHALLENGES MANAGER ============
function ChallengesManager() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/technical/challenges').then(setChallenges).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this challenge?')) return;
    try {
      await request(`/admin/technical/challenges/${id}`, { method: 'DELETE' });
      setChallenges(await request('/admin/technical/challenges'));
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
          <Plus className="w-4 h-4" /> Add Challenge
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challenges.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-ink/10 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-display font-bold text-navy">{c.name}</h3>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  c.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                  c.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{c.status}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {c.description && <p className="text-sm text-ink-soft mb-3">{c.description}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-ink-soft">Domain:</span> <span className="font-medium">{c.domain || '—'}</span></div>
              <div><span className="text-ink-soft">Team:</span> <span className="font-medium">{c.min_team_size}-{c.max_team_size}</span></div>
              <div><span className="text-ink-soft">Room:</span> <span className="font-medium">{c.room_name || '—'}</span></div>
              <div><span className="text-ink-soft">Teams:</span> <span className="font-medium">{c.registered_teams_count}</span></div>
            </div>
          </div>
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
          No technical challenges yet
        </div>
      )}

      {showForm && <ChallengeForm challenge={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setChallenges(await request('/admin/technical/challenges')); }} />}
    </div>
  );
}

function ChallengeForm({ challenge, onClose, onSaved }) {
  const [formData, setFormData] = useState(challenge || {
    name: '', description: '', domain: '', min_team_size: 2, max_team_size: 5,
    time_slot: '', status: 'upcoming', rules: '', prizes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (challenge) {
        await request(`/admin/technical/challenges/${challenge.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/technical/challenges', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{challenge ? 'Edit Challenge' : 'Add Challenge'}</h3>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Domain</label>
              <select value={formData.domain} onChange={(e) => setFormData({...formData, domain: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="">None</option>
                <option value="Mining & Earth Observation">Mining</option>
                <option value="Renewable Energy & Sustainability">Renewable</option>
                <option value="Environmental Science & Climate">Environmental</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Min Team</label>
              <input type="number" min="1" value={formData.min_team_size}
                onChange={(e) => setFormData({...formData, min_team_size: parseInt(e.target.value) || 1})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Max Team</label>
              <input type="number" min="1" value={formData.max_team_size}
                onChange={(e) => setFormData({...formData, max_team_size: parseInt(e.target.value) || 1})}
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

// ============ DEMOS MANAGER ============
function DemosManager() {
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/technical/demos').then(setDemos).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this demo?')) return;
    try {
      await request(`/admin/technical/demos/${id}`, { method: 'DELETE' });
      setDemos(await request('/admin/technical/demos'));
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
          <Plus className="w-4 h-4" /> Add Demo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Demo</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Presenter</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Booth</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Room</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {demos.map(d => (
              <tr key={d.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{d.name}</p>
                  {d.description && <p className="text-xs text-ink-soft mt-1">{d.description}</p>}
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{d.presenter_name || '—'}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{d.domain || '—'}</td>
                <td className="px-6 py-4 text-sm font-bold text-navy">{d.booth_number || '—'}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{d.room_name || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    d.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    d.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{d.status.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditing(d); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {demos.length === 0 && <div className="text-center py-12 text-ink-soft">No demos yet</div>}
      </div>

      {showForm && <DemoForm demo={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setDemos(await request('/admin/technical/demos')); }} />}
    </div>
  );
}

function DemoForm({ demo, onClose, onSaved }) {
  const [formData, setFormData] = useState(demo || {
    name: '', description: '', presenter_name: '', domain: '',
    booth_number: '', time_slot: '', status: 'scheduled', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (demo) {
        await request(`/admin/technical/demos/${demo.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/technical/demos', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{demo ? 'Edit Demo' : 'Add Demo'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Presenter</label>
              <input value={formData.presenter_name} onChange={(e) => setFormData({...formData, presenter_name: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Booth Number</label>
              <input value={formData.booth_number} onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                placeholder="e.g., D-01" className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Domain</label>
            <select value={formData.domain} onChange={(e) => setFormData({...formData, domain: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="">None</option>
              <option value="Mining & Earth Observation">Mining</option>
              <option value="Renewable Energy & Sustainability">Renewable</option>
              <option value="Environmental Science & Climate">Environmental</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
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

// ============ CERTIFICATES PLACEHOLDER ============
function CertificatesPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-12 text-center">
      <div className="w-20 h-20 bg-ochre/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Certificate className="w-10 h-10 text-ochre" />
      </div>
      <h2 className="text-2xl font-display font-bold text-navy mb-2">Certificates</h2>
      <p className="text-sm text-ink-soft mb-4">
        This section will manage technical certificates and recognition.
      </p>
      <div className="inline-block px-4 py-2 bg-ochre/10 text-ochre text-sm font-bold rounded-full">
        Coming Soon
      </div>
    </div>
  );
}

// ============ SCHEDULE TIMELINE ============
function ScheduleTimeline() {
  const [sessions, setSessions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request('/admin/technical/sessions'),
      request('/admin/technical/challenges'),
      request('/admin/technical/demos')
    ]).then(([s, c, d]) => {
      setSessions(s);
      setChallenges(c);
      setDemos(d);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  // Combine all events
  const allEvents = [
    ...sessions.map(s => ({ ...s, type: 'session', color: 'bg-blue-500' })),
    ...challenges.map(c => ({ ...c, type: 'challenge', color: 'bg-green-500' })),
    ...demos.map(d => ({ ...d, type: 'demo', color: 'bg-yellow-500' }))
  ].sort((a, b) => {
    const timeA = a.time_slot || '';
    const timeB = b.time_slot || '';
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display font-bold text-navy">Technical Schedule</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> Sessions</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Challenges</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> Demos</span>
        </div>
      </div>

      <div className="space-y-2">
        {allEvents.map((event, idx) => (
          <div key={`${event.type}-${event.id}`} className="flex items-center gap-4 p-3 bg-atmosphere/50 rounded-lg">
            <div className={`w-2 h-12 ${event.color} rounded-full`}></div>
            <div className="text-xs font-bold text-ink-soft w-24">{event.time_slot || 'TBD'}</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-navy">{event.name}</p>
              <p className="text-xs text-ink-soft capitalize">{event.type} {event.domain && `• ${event.domain}`}</p>
            </div>
            {event.room_name && <span className="text-xs text-ink-soft">{event.room_name}</span>}
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
      const response = await fetch(`${API_BASE}/admin/technical/export/${type}`, {
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
    { type: 'sessions', title: 'Sessions', desc: 'All technical sessions with schedule', icon: Calendar },
    { type: 'judges', title: 'Judges Schedule', desc: 'Judges with their session assignments', icon: Users },
    { type: 'papers-by-session', title: 'Papers by Session', desc: 'Accepted papers grouped by session', icon: FileText },
    { type: 'challenges', title: 'Challenges', desc: 'Technical challenges details', icon: Trophy },
    { type: 'demos', title: 'Demos', desc: 'Demos and exhibitions', icon: Monitor },
  ];

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-8">
      <h3 className="text-xl font-display font-bold text-navy mb-2">Export Technical Data</h3>
      <p className="text-sm text-ink-soft mb-6">Download CSV files for reporting and sharing with judges.</p>
      
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
