import { useState, useEffect } from 'react';
import { 
  Camera, Megaphone, Share2, Newspaper, Plus, Edit2, Trash2,
  CheckCircle, Clock, AlertCircle, Image as ImageIcon, Video
} from 'lucide-react';
import { request } from '../../lib/api';

export default function AdminMedia() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    seedIfEmpty();
  }, []);

  const seedIfEmpty = async () => {
    try {
      const data = await request('/admin/media/publicity');
      if (data.length === 0) {
        await request('/admin/media/seed', { method: 'POST' });
        fetchStats();
      }
    } catch (err) {
      console.error('Seed check failed:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await request('/admin/media/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Camera },
    { id: 'publicity', label: 'Publicity', icon: Megaphone },
    { id: 'archive', label: 'Media Archive', icon: ImageIcon },
    { id: 'social', label: 'Social Media', icon: Share2 },
    { id: 'press', label: 'Press Notes', icon: Newspaper },
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

      {activeTab === 'dashboard' && <MediaDashboard stats={stats} />}
      {activeTab === 'publicity' && <PublicityManager onRefresh={fetchStats} />}
      {activeTab === 'archive' && <MediaArchiveManager />}
      {activeTab === 'social' && <SocialMediaManager />}
      {activeTab === 'press' && <PressNotesManager />}
    </div>
  );
}

// ============ DASHBOARD ============
function MediaDashboard({ stats }) {
  if (!stats) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Publicity Tasks"
          value={`${stats.publicity_tasks_completed}/${stats.publicity_tasks_total}`}
          subtitle="Completed / Total"
          icon={Megaphone}
          color="bg-blue-500"
        />
        <StatCard
          title="Media Items"
          value={stats.media_items_total}
          subtitle="Photos & videos archived"
          icon={ImageIcon}
          color="bg-purple-500"
        />
        <StatCard
          title="Social Posts"
          value={`${stats.social_posts_published}/${stats.social_posts_total}`}
          subtitle="Published / Total"
          icon={Share2}
          color="bg-green-500"
        />
        <StatCard
          title="Press Notes"
          value={`${stats.press_notes_issued}/${stats.press_notes_total}`}
          subtitle="Issued / Total"
          icon={Newspaper}
          color="bg-ochre"
        />
      </div>

      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Quick Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickInfo label="Publicity Progress" value={`${stats.publicity_tasks_total > 0 ? Math.round(stats.publicity_tasks_completed / stats.publicity_tasks_total * 100) : 0}%`} />
          <QuickInfo label="Social Media Activity" value={`${stats.social_posts_published} published`} />
          <QuickInfo label="Media Archive Size" value={`${stats.media_items_total} items`} />
          <QuickInfo label="Press Coverage" value={`${stats.press_notes_issued} issued`} />
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

function QuickInfo({ label, value }) {
  return (
    <div className="flex items-center justify-between p-4 bg-atmosphere/50 rounded-lg">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="text-sm font-bold text-navy">{value}</span>
    </div>
  );
}

// ============ PUBLICITY TASKS ============
function PublicityManager({ onRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      const url = filter === 'all' ? '/admin/media/publicity' : `/admin/media/publicity?status_filter=${filter}`;
      setTasks(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await request(`/admin/media/publicity/${id}`, { method: 'DELETE' });
      fetchTasks();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'pending', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${
                filter === s ? 'bg-navy text-white' : 'bg-white border border-ink/15'
              }`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Task</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {tasks.map(t => (
              <tr key={t.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{t.name}</p>
                  {t.description && <p className="text-xs text-ink-soft mt-1">{t.description}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    t.status === 'completed' ? 'bg-green-100 text-green-700' :
                    t.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{t.status.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft max-w-xs truncate">{t.notes || '—'}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <div className="text-center py-12 text-ink-soft">No tasks found</div>}
      </div>

      {showForm && <PublicityTaskForm task={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); fetchTasks(); onRefresh(); }} />}
    </div>
  );
}

function PublicityTaskForm({ task, onClose, onSaved }) {
  const [formData, setFormData] = useState(task || {
    name: '', description: '', status: 'pending', due_date: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, due_date: formData.due_date || null };
      if (task) {
        await request(`/admin/media/publicity/${task.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/admin/media/publicity', { method: 'POST', body: JSON.stringify(payload) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{task ? 'Edit' : 'Add'} Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Task Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Due Date</label>
              <input type="date" value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
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

// ============ MEDIA ARCHIVE ============
function MediaArchiveManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchItems();
  }, [typeFilter]);

  const fetchItems = async () => {
    try {
      const url = typeFilter === 'all' ? '/admin/media/archive' : `/admin/media/archive?media_type=${typeFilter}`;
      setItems(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await request(`/admin/media/archive/${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'photo', 'video'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${
                typeFilter === t ? 'bg-navy text-white' : 'bg-white border border-ink/15'
              }`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-ink/10 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {item.media_type === 'photo' ? (
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                ) : (
                  <Video className="w-5 h-5 text-purple-600" />
                )}
                <h3 className="text-md font-display font-bold text-navy">{item.title}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(item); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {item.event_name && <p className="text-xs text-ink-soft mb-1">📍 {item.event_name}</p>}
            {item.date_captured && <p className="text-xs text-ink-soft mb-2">📅 {new Date(item.date_captured).toLocaleDateString()}</p>}
            {item.tags && <p className="text-xs text-ochre mb-2">🏷️ {item.tags}</p>}
            {item.file_reference && (
              <p className="text-xs font-mono text-ink-soft truncate" title={item.file_reference}>
                📁 {item.file_reference}
              </p>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
          No media items yet
        </div>
      )}

      {showForm && <MediaArchiveForm item={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); fetchItems(); }} />}
    </div>
  );
}

function MediaArchiveForm({ item, onClose, onSaved }) {
  const [formData, setFormData] = useState(item || {
    title: '', media_type: 'photo', event_name: '', date_captured: '',
    file_reference: '', tags: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, date_captured: formData.date_captured || null };
      if (item) {
        await request(`/admin/media/archive/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/admin/media/archive', { method: 'POST', body: JSON.stringify(payload) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{item ? 'Edit' : 'Add'} Media Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Title *</label>
            <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
              <select value={formData.media_type} onChange={(e) => setFormData({...formData, media_type: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="photo">Photo</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Date Captured</label>
              <input type="date" value={formData.date_captured}
                onChange={(e) => setFormData({...formData, date_captured: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Event/Session</label>
            <input value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">File Reference (path)</label>
            <input value={formData.file_reference} onChange={(e) => setFormData({...formData, file_reference: e.target.value})}
              placeholder="/static/media/filename.jpg"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg font-mono text-xs" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Tags (comma-separated)</label>
            <input value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="ceremony, official, 2026"
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

// ============ SOCIAL MEDIA ============
function SocialMediaManager() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/media/social').then(setPosts).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await request(`/admin/media/social/${id}`, { method: 'DELETE' });
      setPosts(await request('/admin/media/social'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const platformColors = {
    twitter: 'bg-sky-100 text-sky-700',
    instagram: 'bg-pink-100 text-pink-700',
    linkedin: 'bg-blue-100 text-blue-700',
    facebook: 'bg-indigo-100 text-indigo-700',
    youtube: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Post
        </button>
      </div>

      <div className="space-y-3">
        {posts.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-ink/10 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${platformColors[p.platform] || 'bg-gray-100 text-gray-700'}`}>
                  {p.platform}
                </span>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  p.status === 'published' ? 'bg-green-100 text-green-700' :
                  p.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{p.status}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-navy mb-2">{p.content}</p>
            {p.scheduled_date && (
              <p className="text-xs text-ink-soft">
                📅 Scheduled: {new Date(p.scheduled_date).toLocaleString()}
              </p>
            )}
          </div>
        ))}
        {posts.length === 0 && (
          <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
            No social media posts yet
          </div>
        )}
      </div>

      {showForm && <SocialPostForm post={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setPosts(await request('/admin/media/social')); }} />}
    </div>
  );
}

function SocialPostForm({ post, onClose, onSaved }) {
  const [formData, setFormData] = useState(post || {
    platform: 'twitter', content: '', scheduled_date: '', status: 'draft', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, scheduled_date: formData.scheduled_date || null };
      if (post) {
        await request(`/admin/media/social/${post.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/admin/media/social', { method: 'POST', body: JSON.stringify(payload) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{post ? 'Edit' : 'Add'} Post</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Platform</label>
              <select value={formData.platform} onChange={(e) => setFormData({...formData, platform: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Content *</label>
            <textarea required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={4} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Scheduled Date/Time</label>
            <input type="datetime-local" value={formData.scheduled_date ? formData.scheduled_date.slice(0, 16) : ''}
              onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
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

// ============ PRESS NOTES ============
function PressNotesManager() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    request('/admin/media/press').then(setNotes).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this press note?')) return;
    try {
      await request(`/admin/media/press/${id}`, { method: 'DELETE' });
      setNotes(await request('/admin/media/press'));
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
          <Plus className="w-4 h-4" /> Add Press Note
        </button>
      </div>

      <div className="space-y-3">
        {notes.map(n => (
          <div key={n.id} className="bg-white rounded-xl border border-ink/10 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-md font-display font-bold text-navy">{n.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    n.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>{n.status}</span>
                  {n.issue_date && (
                    <span className="text-xs text-ink-soft">📅 {new Date(n.issue_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(n); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(n.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-ink leading-relaxed mb-2">{n.content}</p>
            {n.target_media && (
              <p className="text-xs text-ochre">🎯 Target: {n.target_media}</p>
            )}
          </div>
        ))}
        {notes.length === 0 && (
          <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
            No press notes yet
          </div>
        )}
      </div>

      {showForm && <PressNoteForm note={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setNotes(await request('/admin/media/press')); }} />}
    </div>
  );
}

function PressNoteForm({ note, onClose, onSaved }) {
  const [formData, setFormData] = useState(note || {
    title: '', content: '', issue_date: '', target_media: '', status: 'draft', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, issue_date: formData.issue_date || null };
      if (note) {
        await request(`/admin/media/press/${note.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/admin/media/press', { method: 'POST', body: JSON.stringify(payload) });
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
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-display font-bold text-navy mb-4">{note ? 'Edit' : 'Add'} Press Note</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Title *</label>
            <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Content *</label>
            <textarea required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={5} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Issue Date</label>
              <input type="date" value={formData.issue_date}
                onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Target Media (comma-separated)</label>
            <input value={formData.target_media} onChange={(e) => setFormData({...formData, target_media: e.target.value})}
              placeholder="The Hindu, Indian Express"
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
