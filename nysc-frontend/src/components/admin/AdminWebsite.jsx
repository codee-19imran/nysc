import { useState, useEffect } from 'react';
import { 
  Globe, FileText, Users, Mail, FormInput, Archive, 
  Handshake, Award as Certificate, Download, Plus, Edit2, 
  Trash2, CheckCircle, Eye, Send, BarChart3, X
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { request, auth as apiAuth } from '../../lib/api';

export default function AdminWebsite() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = apiAuth.getUser();
    setUser(currentUser);
    fetchStats();
    seedIfEmpty();
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';

  const seedIfEmpty = async () => {
    try {
      const data = await request('/admin/website/pages');
      if (data.length === 0) {
        await request('/admin/website/seed', { method: 'POST' });
        fetchStats();
      }
    } catch (err) {
      console.error('Seed check failed:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await request('/admin/website/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const baseTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Globe },
    { id: 'content', label: 'Website Content', icon: FileText },
    { id: 'registrations', label: 'Registrations', icon: Users },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'communications', label: 'Communications', icon: Mail },
    { id: 'forms', label: 'Online Forms', icon: FormInput },
    { id: 'records', label: 'Digital Records', icon: Archive },
    { id: 'coordination', label: 'Coordination', icon: Handshake },
    { id: 'certificates', label: 'Certificates', icon: Certificate },
    { id: 'export', label: 'Export', icon: Download },
  ];

  // Super Admin only tabs
  const superAdminTabs = [
    { id: 'payments', label: 'Payment History', icon: BarChart3, superOnly: true },
    { id: 'papers', label: 'Paper Submissions', icon: FileText, superOnly: true },
    { id: 'reviews', label: 'Review Records', icon: Eye, superOnly: true },
  ];

  const tabs = isSuperAdmin ? [...baseTabs, ...superAdminTabs] : baseTabs;

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
                  activeTab === tab.id
                    ? tab.superOnly ? 'bg-red-600 text-white' : 'bg-ochre text-white'
                    : 'text-ink-soft hover:bg-atmosphere hover:text-navy'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.superOnly && <span className="text-[10px] bg-white/20 px-1 rounded">SA</span>}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'dashboard' && <WebsiteDashboard stats={stats} />}
      {activeTab === 'content' && <WebsiteContent />}
      {activeTab === 'registrations' && <RegistrationMonitor />}
      {activeTab === 'participants' && <ParticipantDatabase />}
      {activeTab === 'communications' && <CommunicationsManager />}
      {activeTab === 'forms' && <FormsManager />}
      {activeTab === 'records' && <DigitalRecords />}
      {activeTab === 'coordination' && <CoordinationQueue />}
      {activeTab === 'certificates' && <CertificatesPlaceholder />}
      {activeTab === 'export' && <ExportPanel />}
      
      {/* Super Admin Only Tabs */}
      {activeTab === 'payments' && isSuperAdmin && <PaymentHistory />}
      {activeTab === 'papers' && isSuperAdmin && <PaperSubmissions />}
      {activeTab === 'reviews' && isSuperAdmin && <ReviewRecords />}
    </div>
  );
}

// ============ DASHBOARD ============
function WebsiteDashboard({ stats }) {
  if (!stats) return <div className="text-center py-12">Loading...</div>;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Prepare payment status data for pie chart
  const paymentData = (stats.payment_status_distribution || []).map(item => ({
    name: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown',
    value: item.count
  }));

  // Prepare category data for donut
  const categoryData = (stats.category_distribution || []).map(item => ({
    name: item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Unknown',
    value: item.count
  }));

  // Prepare form submissions data for bar chart
  const formData = stats.form_submissions_distribution || [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Registrations" value={stats.total_registrations} 
          subtitle={`${stats.paid_registrations} paid, ${stats.pending_registrations} pending`} 
          icon={Users} color="bg-blue-500" />
        <StatCard title="Pages Published" value={stats.pages_published} 
          subtitle={`${stats.news_active} news items`} 
          icon={FileText} color="bg-green-500" />
        <StatCard title="Active Forms" value={stats.forms_active} 
          subtitle={`${stats.total_form_submissions} total submissions`} 
          icon={FormInput} color="bg-purple-500" />
        <StatCard title="Communications" value={stats.communications_sent_week} 
          subtitle="Sent this week" 
          icon={Mail} color="bg-ochre" />
      </div>

      {/* Charts Row 1: Registration Trend */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">
          Registration Trend (Last 30 Days)
        </h3>
        {stats.registration_trend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.registration_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip 
                labelFormatter={(v) => new Date(v).toLocaleDateString()}
                formatter={(v) => [`${v} registrations`, 'Count']}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#f59e0b" 
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center py-12 text-ink-soft">No registration data yet</p>
        )}
      </div>

      {/* Charts Row 2: Two pie charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Distribution */}
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">
            Payment Status Distribution
          </h3>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} registrations`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-ink-soft">No data yet</p>
          )}
        </div>

        {/* Category Distribution (Donut) */}
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">
            Registrations by Category
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} registrations`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-ink-soft">No data yet</p>
          )}
        </div>
      </div>

      {/* Charts Row 3: Form Submissions Bar Chart */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">
          Form Submissions by Form
        </h3>
        {formData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="form_name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(v) => [`${v} submissions`, 'Count']} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center py-12 text-ink-soft">No form submissions yet</p>
        )}
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

// ============ WEBSITE CONTENT (CMS) ============
function WebsiteContent() {
  const [pages, setPages] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('page');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Promise.all([
      request('/admin/website/pages'),
      request('/admin/website/news')
    ]).then(([p, n]) => {
      setPages(p);
      setNews(n);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (type, id) => {
    if (!confirm(`Delete this ${type}?`)) return;
    try {
      await request(`/admin/website/${type === 'page' ? 'pages' : 'news'}/${id}`, { method: 'DELETE' });
      if (type === 'page') setPages(await request('/admin/website/pages'));
      else setNews(await request('/admin/website/news'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Pages Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-bold text-navy">Website Pages</h3>
          <button onClick={() => { setFormType('page'); setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
            <Plus className="w-4 h-4" /> Add Page
          </button>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-atmosphere border-b border-ink/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Title</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Order</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {pages.map(p => (
                <tr key={p.id} className="hover:bg-atmosphere/50">
                  <td className="px-6 py-4 text-sm font-medium text-navy">{p.title}</td>
                  <td className="px-6 py-4 text-sm text-ink-soft font-mono">/{p.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      p.status === 'published' ? 'bg-green-100 text-green-700' :
                      p.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">{p.order_index}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => { setFormType('page'); setEditing(p); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete('page', p.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* News Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-display font-bold text-navy">News & Updates</h3>
          <button onClick={() => { setFormType('news'); setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
            <Plus className="w-4 h-4" /> Add News
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {news.map(n => (
            <div key={n.id} className="bg-white rounded-xl border border-ink/10 p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-md font-display font-bold text-navy">{n.title}</h4>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{n.category}</span>
                    {n.is_featured && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-ochre/10 text-ochre">Featured</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setFormType('news'); setEditing(n); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete('news', n.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-ink-soft line-clamp-3">{n.content}</p>
            </div>
          ))}
        </div>
      </div>

      {showForm && <ContentForm type={formType} item={editing} onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          if (formType === 'page') setPages(await request('/admin/website/pages'));
          else setNews(await request('/admin/website/news'));
        }} />}
    </div>
  );
}

function ContentForm({ type, item, onClose, onSaved }) {
  const [formData, setFormData] = useState(item || (type === 'page' ? {
    title: '', slug: '', content: '', status: 'draft', order_index: 0
  } : {
    title: '', content: '', category: 'news', is_featured: false, target_audience: 'all', status: 'draft'
  }));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = type === 'page' ? '/admin/website/pages' : '/admin/website/news';
      if (item) {
        await request(`${endpoint}/${item.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request(endpoint, { method: 'POST', body: JSON.stringify(formData) });
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
          {item ? 'Edit' : 'Add'} {type === 'page' ? 'Page' : 'News'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Title *</label>
            <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          {type === 'page' && (
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Slug *</label>
              <input required value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg font-mono" />
            </div>
          )}
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Content *</label>
            <textarea required value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={6} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          {type === 'news' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                  <option value="announcement">Announcement</option>
                  <option value="news">News</option>
                  <option value="update">Update</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-ink-soft">Order</label>
                <input type="number" value={formData.order_index}
                  onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
                  className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
              </div>
            </div>
          )}
          {type === 'news' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_featured}
                onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                className="w-4 h-4 accent-ochre" />
              <span className="text-sm text-navy">Featured</span>
            </label>
          )}
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

// ============ REGISTRATION MONITOR (Read-only) ============
function RegistrationMonitor() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchRegistrations();
  }, [statusFilter, categoryFilter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params = [];
      if (statusFilter !== 'all') params.push(`status_filter=${statusFilter}`);
      if (categoryFilter !== 'all') params.push(`category=${categoryFilter}`);
      const url = '/admin/website/registrations' + (params.length ? '?' + params.join('&') : '');
      setRegistrations(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const stats = {
    total: registrations.length,
    paid: registrations.filter(r => r.payment_status === 'paid').length,
    pending: registrations.filter(r => r.payment_status === 'pending').length,
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Read-only view:</strong> This is a monitoring dashboard. Manual payment marking and refunds are disabled.
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Total</p>
          <p className="text-2xl font-display font-bold text-navy">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Paid</p>
          <p className="text-2xl font-display font-bold text-green-600">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <p className="text-xs text-ink-soft uppercase font-bold">Pending</p>
          <p className="text-2xl font-display font-bold text-orange-600">{stats.pending}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Categories</option>
          <option value="student">Student</option>
          <option value="professional">Professional</option>
          <option value="accompanying">Accompanying</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {registrations.map(r => (
              <tr key={r.registration_id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{r.name}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{r.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                    r.category === 'student' ? 'bg-blue-100 text-blue-700' :
                    r.category === 'professional' ? 'bg-purple-100 text-purple-700' :
                    'bg-pink-100 text-pink-700'
                  }`}>{r.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    r.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    r.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{r.payment_status}</span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {r.registered_at ? new Date(r.registered_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ PARTICIPANT DATABASE (No payment/paper data) ============
function ParticipantDatabase() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchParticipants();
  }, [category]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (category !== 'all') params.push(`category=${category}`);
      const url = '/admin/website/participants' + (params.length ? '?' + params.join('&') : '');
      setParticipants(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <strong>Privacy Notice:</strong> Payment history, paper submissions, and review records are restricted to Super Admin only (double-blind protection).
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 relative min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={fetchParticipants}
            className="w-full px-4 py-2 border border-ink/15 rounded-lg bg-white"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Categories</option>
          <option value="student">Student</option>
          <option value="professional">Professional</option>
          <option value="accompanying">Accompanying</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {participants.map(p => (
              <tr key={p.user_id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{p.name}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{p.email}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{p.phone}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${
                    p.category === 'student' ? 'bg-blue-100 text-blue-700' :
                    p.category === 'professional' ? 'bg-purple-100 text-purple-700' :
                    'bg-pink-100 text-pink-700'
                  }`}>{p.category || '—'}</span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {participants.length === 0 && <div className="text-center py-12 text-ink-soft">No participants found</div>}
      </div>
    </div>
  );
}

// ============ COMMUNICATIONS ============
function CommunicationsManager() {
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    request('/admin/website/communications').then(setComms).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this communication?')) return;
    try {
      await request(`/admin/website/communications/${id}`, { method: 'DELETE' });
      setComms(await request('/admin/website/communications'));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-ink-soft">Communications are logged. Actual email delivery requires SMTP configuration.</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Send className="w-4 h-4" /> New Communication
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Channel</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Recipients</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Sent At</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {comms.map(c => (
              <tr key={c.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{c.subject}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{c.channel.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">
                  {c.recipient_count} <span className="text-xs">({c.recipient_filter})</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    c.status === 'sent' ? 'bg-green-100 text-green-700' :
                    c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                    c.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{c.status}</span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {c.sent_at ? new Date(c.sent_at).toLocaleString() : '—'}
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {comms.length === 0 && <div className="text-center py-12 text-ink-soft">No communications yet</div>}
      </div>

      {showForm && <CommunicationForm onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setComms(await request('/admin/website/communications')); }} />}
    </div>
  );
}

function CommunicationForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    subject: '', body: '', channel: 'email', recipient_filter: 'all'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/website/communications', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">New Communication</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Subject *</label>
            <input required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Body *</label>
            <textarea required value={formData.body} onChange={(e) => setFormData({...formData, body: e.target.value})}
              rows={5} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Channel</label>
              <select value={formData.channel} onChange={(e) => setFormData({...formData, channel: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="email">Email</option>
                <option value="in_app">In-App</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Recipients</label>
              <select value={formData.recipient_filter} onChange={(e) => setFormData({...formData, recipient_filter: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="all">All Participants</option>
                <option value="student">Students Only</option>
                <option value="professional">Professionals Only</option>
                <option value="accompanying">Accompanying Only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ FORMS MANAGER ============
function FormsManager() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingSubmissions, setViewingSubmissions] = useState(null);

  useEffect(() => {
    request('/admin/website/forms').then(setForms).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this form and all submissions?')) return;
    try {
      await request(`/admin/website/forms/${id}`, { method: 'DELETE' });
      setForms(await request('/admin/website/forms'));
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
          <Plus className="w-4 h-4" /> Create Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map(f => (
          <div key={f.id} className="bg-white rounded-xl border border-ink/10 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-display font-bold text-navy">{f.name}</h3>
                <p className="text-xs text-ink-soft">{f.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                f.status === 'active' ? 'bg-green-100 text-green-700' :
                f.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>{f.status}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div><span className="text-ink-soft">Fields:</span> <strong>{f.fields.length}</strong></div>
              <div><span className="text-ink-soft">Submissions:</span> <strong>{f.submission_count}</strong></div>
              <div><span className="text-ink-soft">Audience:</span> <strong className="capitalize">{f.target_audience}</strong></div>
            </div>
            
            <div className="flex gap-2 pt-2 border-t border-ink/10">
              <button onClick={() => { setEditing(f); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewingSubmissions(f)} className="p-1.5 hover:bg-atmosphere rounded" title="View submissions">
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && <FormBuilder form={editing} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={async () => { setShowForm(false); setEditing(null); setForms(await request('/admin/website/forms')); }} />}
      
      {viewingSubmissions && <SubmissionsViewer form={viewingSubmissions} onClose={() => setViewingSubmissions(null)} />}
    </div>
  );
}

function FormBuilder({ form, onClose, onSaved }) {
  const [formData, setFormData] = useState(form || {
    name: '', description: '', target_audience: 'all', status: 'draft'
  });
  const [fields, setFields] = useState(form?.fields || []);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form) {
        await request(`/admin/website/forms/${form.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/website/forms', { method: 'POST', body: JSON.stringify(formData) });
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    setFields([...fields, { label: '', field_type: 'text', required: false, order_index: fields.length }]);
  };

  const removeField = (idx) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-display font-bold text-navy mb-4">{form ? 'Edit Form' : 'Create Form'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Form Name *</label>
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
              <label className="text-xs font-bold uppercase text-ink-soft">Target Audience</label>
              <select value={formData.target_audience} onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="all">All</option>
                <option value="registered">Registered Only</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="border-t border-ink/10 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-navy">Form Fields</h4>
              <button type="button" onClick={addField} className="text-xs text-ochre font-bold hover:underline">
                + Add Field
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 bg-atmosphere rounded">
                  <input placeholder="Label" value={field.label}
                    onChange={(e) => { const newFields = [...fields]; newFields[idx].label = e.target.value; setFields(newFields); }}
                    className="flex-1 px-2 py-1 text-sm border border-ink/15 rounded" />
                  <select value={field.field_type}
                    onChange={(e) => { const newFields = [...fields]; newFields[idx].field_type = e.target.value; setFields(newFields); }}
                    className="px-2 py-1 text-sm border border-ink/15 rounded">
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="radio">Radio</option>
                    <option value="date">Date</option>
                    <option value="email">Email</option>
                    <option value="number">Number</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={field.required}
                      onChange={(e) => { const newFields = [...fields]; newFields[idx].required = e.target.checked; setFields(newFields); }} />
                    Req
                  </label>
                  <button type="button" onClick={() => removeField(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {fields.length === 0 && <p className="text-xs text-ink-soft text-center py-4">No fields yet. Click "Add Field" to start.</p>}
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

function SubmissionsViewer({ form, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request(`/admin/website/forms/${form.id}/submissions`).then(setSubmissions).finally(() => setLoading(false));
  }, [form.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-display font-bold text-navy">{form.name} — Submissions</h3>
            <p className="text-sm text-ink-soft">{submissions.length} submissions</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-atmosphere rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-ink-soft">No submissions yet</div>
        ) : (
          <div className="space-y-3">
            {submissions.map(s => (
              <div key={s.id} className="p-4 bg-atmosphere rounded-lg">
                <div className="flex justify-between text-xs text-ink-soft mb-2">
                  <span>{s.user_name || 'Anonymous'}</span>
                  <span>{new Date(s.submitted_at).toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(s.data || {}).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium text-navy">{key}:</span>{' '}
                      <span className="text-ink-soft">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ DIGITAL RECORDS ============
function DigitalRecords() {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-8">
      <h3 className="text-lg font-display font-bold text-navy mb-4">Digital Records Archive</h3>
      <p className="text-sm text-ink-soft mb-6">
        View archived digital records. Note: Payment records, paper submissions, and review records are restricted to Super Admin.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RecordCard title="Registration Records" count="Available" icon={Users} />
        <RecordCard title="Attendance Records" count="Available" icon={CheckCircle} />
        <RecordCard title="Communication Logs" count="Available" icon={Mail} />
      </div>
    </div>
  );
}

function RecordCard({ title, count, icon: Icon }) {
  return (
    <div className="border border-ink/15 rounded-xl p-6">
      <Icon className="w-8 h-8 text-ochre mb-3" />
      <h4 className="text-md font-display font-bold text-navy mb-1">{title}</h4>
      <p className="text-xs text-green-600 font-bold">{count}</p>
    </div>
  );
}

// ============ COORDINATION QUEUE ============
function CoordinationQueue() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    request('/admin/website/coordination').then(setRequests).finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await request(`/admin/website/coordination/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setRequests(await request('/admin/website/coordination'));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    try {
      await request(`/admin/website/coordination/${id}`, { method: 'DELETE' });
      setRequests(await request('/admin/website/coordination'));
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
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-ink/10 p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 uppercase">{r.from_department}</span>
                  <span className="text-xs text-ink-soft">→</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 uppercase">{r.to_department}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    r.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    r.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    r.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{r.priority}</span>
                </div>
                <h4 className="text-md font-display font-bold text-navy">{r.title}</h4>
              </div>
              <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)}
                className="px-2 py-1 text-xs border border-ink/15 rounded">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="addressed">Addressed</option>
              </select>
            </div>
            <p className="text-sm text-ink-soft mb-3">{r.description}</p>
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-soft">Created: {new Date(r.created_at).toLocaleDateString()}</span>
              <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
            No coordination requests
          </div>
        )}
      </div>

      {showForm && <CoordinationForm onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); setRequests(await request('/admin/website/coordination')); }} />}
    </div>
  );
}

function CoordinationForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    from_department: 'website', to_department: 'technical',
    title: '', description: '', priority: 'medium'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/website/coordination', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">New Coordination Request</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">From</label>
              <select value={formData.from_department} onChange={(e) => setFormData({...formData, from_department: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="website">Website</option>
                <option value="technical">Technical</option>
                <option value="logistics">Logistics</option>
                <option value="hospitality">Hospitality</option>
                <option value="media">Media</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">To</label>
              <select value={formData.to_department} onChange={(e) => setFormData({...formData, to_department: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="technical">Technical</option>
                <option value="logistics">Logistics</option>
                <option value="hospitality">Hospitality</option>
                <option value="media">Media</option>
                <option value="website">Website</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Title *</label>
            <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description *</label>
            <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Priority</label>
            <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
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

// ============ CERTIFICATES PLACEHOLDER ============
function CertificatesPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-12 text-center">
      <div className="w-20 h-20 bg-ochre/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Certificate className="w-10 h-10 text-ochre" />
      </div>
      <h2 className="text-2xl font-display font-bold text-navy mb-2">Certificates</h2>
      <p className="text-sm text-ink-soft mb-4">
        Digital certificate generation and distribution will be managed here.
      </p>
      <div className="inline-block px-4 py-2 bg-ochre/10 text-ochre text-sm font-bold rounded-full">
        Coming Soon
      </div>
    </div>
  );
}

// ============ SUPER ADMIN ONLY: PAYMENT HISTORY ============
function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/admin/website/payment-history').then(setPayments).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        <strong>Super Admin Only:</strong> This tab shows payment history. Access is restricted for double-blind protection and data confidentiality.
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">User</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Method</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{p.user_name}</p>
                  <p className="text-xs text-ink-soft">{p.user_email}</p>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-navy">₹{p.amount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    p.status === 'completed' ? 'bg-green-100 text-green-700' :
                    p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{p.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft capitalize">{p.method}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && <div className="text-center py-12 text-ink-soft">No payment records</div>}
      </div>
    </div>
  );
}

// ============ SUPER ADMIN ONLY: PAPER SUBMISSIONS ============
function PaperSubmissions() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/admin/website/paper-submissions').then(setPapers).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        <strong>Super Admin Only:</strong> Paper submissions are visible only to Super Admin to maintain the double-blind review system.
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Title</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Author</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {papers.map(p => (
              <tr key={p.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{p.title}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-navy">{p.author_name}</p>
                  <p className="text-xs text-ink-soft">{p.author_email}</p>
                  {p.co_authors && p.co_authors.length > 0 && (
                    <p className="text-xs text-ink-soft mt-1" title={p.co_authors.join(', ')}>
                      +{p.co_authors.length} co-author(s)
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{p.domain || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    p.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    p.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{p.status?.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {papers.length === 0 && <div className="text-center py-12 text-ink-soft">No paper submissions</div>}
      </div>
    </div>
  );
}

// ============ SUPER ADMIN ONLY: REVIEW RECORDS ============
function ReviewRecords() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/admin/website/review-records').then(setReviews).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
        <strong>Super Admin Only:</strong> Review records are anonymized to maintain the double-blind review system. Reviewer identities are hidden.
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Paper</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Score</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Recommendation</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Reviewer</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {reviews.map(r => (
              <tr key={r.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{r.paper_title}</td>
                <td className="px-6 py-4 text-sm font-bold text-navy">{r.score ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    r.recommendation === 'accept' ? 'bg-green-100 text-green-700' :
                    r.recommendation === 'reject' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{r.recommendation}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">
                    🔒 {r.reviewer_id}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews.length === 0 && <div className="text-center py-12 text-ink-soft">No review records</div>}
      </div>
    </div>
  );
}

// ============ EXPORT PANEL ============
function ExportPanel() {
  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`http://127.0.0.1:8000/admin/website/export/${type}`, {
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
    { type: 'participants', title: 'Participants', desc: 'All participants (no payment/paper data)', icon: Users },
    { type: 'registrations', title: 'Registrations', desc: 'Registration records with status', icon: Users },
    { type: 'communications', title: 'Communications', desc: 'Communication log', icon: Mail },
    { type: 'website-content', title: 'Website Content', desc: 'Pages and news', icon: FileText },
  ];

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-8">
      <h3 className="text-xl font-display font-bold text-navy mb-2">Export Website Data</h3>
      <p className="text-sm text-ink-soft mb-6">Download CSV files for reporting.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
