import { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, PieChart as PieIcon, TrendingUp, Receipt, Package, 
  Building2, HandCoins, Scale, Calendar, FolderOpen, FileSpreadsheet,
  Download, Upload, Plus, Edit2, Trash2, Eye, X, AlertCircle, CheckCircle,
  BarChart3, LineChart as LineIcon, FileText
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { request, auth as apiAuth } from '../../lib/api';

export default function AdminFinance() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = apiAuth.getUser();
    setUser(currentUser);
    
    // Super Admin check
    if (currentUser?.role !== 'super_admin') {
      alert('Access denied: Finance module is Super Admin only');
      window.location.href = '/admin';
      return;
    }
    
    fetchStats();
    seedIfEmpty();
  }, []);

  const seedIfEmpty = async () => {
    try {
      const data = await request('/admin/finance/budget');
      if (data.length === 0) {
        await request('/admin/finance/seed', { method: 'POST' });
        fetchStats();
      }
    } catch (err) {
      console.error('Seed check failed:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await request('/admin/finance/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: DollarSign },
    { id: 'budget', label: 'Budget', icon: PieIcon },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'expenditures', label: 'Expenditures', icon: Receipt },
    { id: 'bills', label: 'Bills & Vouchers', icon: FileText },
    { id: 'procurement', label: 'Procurement', icon: Package },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'sponsorships', label: 'Sponsorships', icon: HandCoins },
    { id: 'reconciliation', label: 'Reconciliation', icon: Scale },
    { id: 'committees', label: 'Committee Spend', icon: BarChart3 },
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'files', label: 'Admin Files', icon: FolderOpen },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Security Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span><strong>Super Admin Only:</strong> All operations are logged and monitored. Soft-delete preserves audit trail.</span>
      </div>

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

      {activeTab === 'dashboard' && <FinanceDashboard stats={stats} />}
      {activeTab === 'budget' && <BudgetManager onRefresh={fetchStats} />}
      {activeTab === 'income' && <IncomeTracker />}
      {activeTab === 'expenditures' && <ExpenditureTracker onRefresh={fetchStats} />}
      {activeTab === 'bills' && <BillsManager />}
      {activeTab === 'procurement' && <ProcurementManager />}
      {activeTab === 'vendors' && <VendorsManager />}
      {activeTab === 'sponsorships' && <SponsorshipsManager onRefresh={fetchStats} />}
      {activeTab === 'reconciliation' && <ReconciliationManager />}
      {activeTab === 'committees' && <CommitteeExpenditure />}
      {activeTab === 'meetings' && <MeetingsManager />}
      {activeTab === 'files' && <AdminFilesManager />}
      {activeTab === 'reports' && <ReportsPanel />}
    </div>
  );
}

// ============ REUSABLE: IMPORT/EXPORT BUTTONS ============
function ImportExportButtons({ importEndpoint, exportEndpoint, onImportComplete }) {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('nysc_token');
      
      // Preview first
      const previewResponse = await fetch(`http://127.0.0.1:8000${importEndpoint}?preview=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const previewData = await previewResponse.json();
      setPreview(previewData);
      setShowPreview(true);
    } catch (err) {
      alert('Import preview failed: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    
    setImporting(true);
    try {
      // Re-upload and commit
      const formData = new FormData();
      formData.append('file', new Blob([JSON.stringify(preview.valid_rows)], { type: 'text/csv' }));
      
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`http://127.0.0.1:8000${importEndpoint}?preview=false`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const result = await response.json();
      alert(result.message || 'Import complete');
      setShowPreview(false);
      setPreview(null);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`http://127.0.0.1:8000${exportEndpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportEndpoint.split('/').pop()}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <Upload className="w-3 h-3" /> Import CSV
      </button>
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
      >
        <Download className="w-3 h-3" /> Export CSV
      </button>
      
      {showPreview && preview && (
        <ImportPreviewModal
          preview={preview}
          onCommit={handleCommit}
          onCancel={() => { setShowPreview(false); setPreview(null); }}
          importing={importing}
        />
      )}
    </>
  );
}

function ImportPreviewModal({ preview, onCommit, onCancel, importing }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-display font-bold text-navy">Import Preview</h3>
            <p className="text-sm text-ink-soft">
              {preview.valid_count} valid rows, {preview.invalid_count} invalid rows
            </p>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-atmosphere rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {preview.valid_rows?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-bold text-green-700 mb-2">✓ Valid Rows (first 5):</h4>
            <div className="bg-green-50 rounded-lg p-3 text-xs overflow-auto max-h-40">
              <pre>{JSON.stringify(preview.valid_rows, null, 2)}</pre>
            </div>
          </div>
        )}

        {preview.invalid_rows?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-bold text-red-700 mb-2">✗ Invalid Rows (first 10):</h4>
            <div className="bg-red-50 rounded-lg p-3 text-xs overflow-auto max-h-40">
              <pre>{JSON.stringify(preview.invalid_rows, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-ink/10">
          <button onClick={onCancel} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
          <button
            onClick={onCommit}
            disabled={importing || preview.valid_count === 0}
            className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${preview.valid_count} Valid Rows`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ DASHBOARD ============
function FinanceDashboard({ stats }) {
  const [budgetData, setBudgetData] = useState([]);
  const [committeeData, setCommitteeData] = useState(null);

  useEffect(() => {
    if (stats) {
      loadBudgetChart();
      loadCommitteeChart();
    }
  }, [stats]);

  const loadBudgetChart = async () => {
    try {
      const data = await request('/admin/finance/budget');
      setBudgetData(data.map(b => ({
        name: b.category,
        allocated: b.allocated_amount,
        spent: b.spent_amount,
        remaining: b.remaining_amount
      })));
    } catch (err) {
      console.error(err);
    }
  };

  const loadCommitteeChart = async () => {
    try {
      const data = await request('/admin/finance/committee-expenditure');
      setCommitteeData(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!stats) return <div className="text-center py-12">Loading...</div>;

  const committeePieData = committeeData ? Object.entries(committeeData).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: data.total
  })) : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Budget" value={`₹${(stats.total_budget / 100000).toFixed(1)}L`} subtitle={`₹${stats.remaining_budget.toLocaleString('en-IN')} remaining`} icon={PieIcon} color="bg-blue-500" />
        <StatCard title="Total Income" value={`₹${(stats.total_income / 100000).toFixed(1)}L`} subtitle={`Reg: ₹${stats.registration_revenue.toLocaleString('en-IN')} + Sponsor: ₹${stats.sponsorship_income.toLocaleString('en-IN')}`} icon={TrendingUp} color="bg-green-500" />
        <StatCard title="Total Spent" value={`₹${(stats.total_spent / 100000).toFixed(1)}L`} subtitle={`${stats.budget_utilization_percent}% of budget`} icon={Receipt} color="bg-orange-500" />
        <StatCard title="Pending Items" value={stats.pending_bills + stats.pending_expenditures} subtitle={`${stats.pending_bills} bills, ${stats.pending_expenditures} expenditures`} icon={AlertCircle} color="bg-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Actual */}
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Budget vs Actual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
              <YAxis />
              <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              <Legend />
              <Bar dataKey="allocated" fill="#3b82f6" name="Allocated" />
              <Bar dataKey="spent" fill="#f59e0b" name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Committee Expenditure */}
        <div className="bg-white rounded-xl border border-ink/10 p-6">
          <h3 className="text-lg font-display font-bold text-navy mb-4">Committee-wise Expenditure</h3>
          {committeePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={committeePieData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90} fill="#8884d8" dataKey="value">
                  {committeePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-ink-soft">No data yet</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat label="Active Vendors" value={stats.active_vendors} />
        <MiniStat label="Confirmed Sponsors" value={stats.confirmed_sponsors} />
        <MiniStat label="Active Procurements" value={stats.active_procurements} />
        <MiniStat label="Budget Utilization" value={`${stats.budget_utilization_percent}%`} />
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
          <p className="text-2xl font-display font-bold text-navy">{value}</p>
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
    <div className="bg-white rounded-xl border border-ink/10 p-4 text-center">
      <p className="text-2xl font-display font-bold text-navy">{value}</p>
      <p className="text-xs text-ink-soft mt-1">{label}</p>
    </div>
  );
}

// ============ BUDGET MANAGER ============
function BudgetManager({ onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setItems(await request('/admin/finance/budget'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this budget item?')) return;
    try {
      await request(`/admin/finance/budget/${id}`, { method: 'DELETE' });
      fetchItems();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const totalAllocated = items.reduce((sum, i) => sum + i.allocated_amount, 0);
  const totalSpent = items.reduce((sum, i) => sum + i.spent_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/budget/import"
            exportEndpoint="/admin/finance/budget/export"
            onImportComplete={fetchItems}
          />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Budget Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniStat label="Total Allocated" value={`₹${totalAllocated.toLocaleString('en-IN')}`} />
        <MiniStat label="Total Spent" value={`₹${totalSpent.toLocaleString('en-IN')}`} />
        <MiniStat label="Remaining" value={`₹${(totalAllocated - totalSpent).toLocaleString('en-IN')}`} />
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Description</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Allocated</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Spent</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{item.category}</span>
                </td>
                <td className="px-6 py-4 text-sm text-navy">{item.description}</td>
                <td className="px-6 py-4 text-sm font-bold text-navy">₹{item.allocated_amount.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm font-bold text-orange-600">₹{item.spent_amount.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm font-bold text-green-600">₹{item.remaining_amount.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    item.status === 'approved' ? 'bg-green-100 text-green-700' :
                    item.status === 'overspent' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{item.status}</span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditing(item); setShowForm(true); }} className="p-1.5 hover:bg-atmosphere rounded">
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

      {showForm && <BudgetForm item={editing} onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); fetchItems(); onRefresh(); }} />}
    </div>
  );
}

function BudgetForm({ item, onClose, onSaved }) {
  const [formData, setFormData] = useState(item || {
    category: 'venue', description: '', allocated_amount: 0, spent_amount: 0,
    financial_year: '2026-27', status: 'planned', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (item) {
        await request(`/admin/finance/budget/${item.id}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await request('/admin/finance/budget', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">{item ? 'Edit' : 'Add'} Budget Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Category *</label>
            <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="venue">Venue</option>
              <option value="catering">Catering</option>
              <option value="logistics">Logistics</option>
              <option value="publicity">Publicity</option>
              <option value="technical">Technical</option>
              <option value="hospitality">Hospitality</option>
              <option value="administration">Administration</option>
              <option value="contingency">Contingency</option>
              <option value="sponsorship_benefits">Sponsorship Benefits</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description *</label>
            <input required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Allocated (₹) *</label>
              <input type="number" min="0" required value={formData.allocated_amount}
                onChange={(e) => setFormData({...formData, allocated_amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Spent (₹)</label>
              <input type="number" min="0" value={formData.spent_amount}
                onChange={(e) => setFormData({...formData, spent_amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="planned">Planned</option>
              <option value="approved">Approved</option>
              <option value="overspent">Overspent</option>
            </select>
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

// ============ INCOME TRACKER ============
function IncomeTracker() {
  const [revenue, setRevenue] = useState(null);
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request('/admin/finance/registration-revenue'),
      request('/admin/finance/sponsorships')
    ]).then(([r, s]) => {
      setRevenue(r);
      setSponsorships(s);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const totalSponsorship = sponsorships.reduce((sum, s) => sum + (s.total_value || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniStat label="Registration Revenue" value={`₹${(revenue?.summary?.total_revenue || 0).toLocaleString('en-IN')}`} />
        <MiniStat label="Sponsorship Income" value={`₹${totalSponsorship.toLocaleString('en-IN')}`} />
        <MiniStat label="Total Income" value={`₹${((revenue?.summary?.total_revenue || 0) + totalSponsorship).toLocaleString('en-IN')}`} />
      </div>

      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Registration Payments</h3>
        <p className="text-xs text-ink-soft mb-4">Read-only view from payment system. {revenue?.payments?.length || 0} transactions.</p>
        <div className="max-h-96 overflow-x-auto">
          <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
            <thead className="bg-atmosphere border-b border-ink/10 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-ink-soft">User</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-ink-soft">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-ink-soft">Method</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase text-ink-soft">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {revenue?.payments?.map(p => (
                <tr key={p.id} className="hover:bg-atmosphere/50">
                  <td className="px-4 py-2 text-sm">
                    <p className="font-medium text-navy">{p.user_name}</p>
                    <p className="text-xs text-ink-soft">{p.user_email}</p>
                  </td>
                  <td className="px-4 py-2 text-sm font-bold text-green-600">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-sm text-ink-soft capitalize">{p.method}</td>
                  <td className="px-4 py-2 text-xs text-ink-soft">{p.date ? new Date(p.date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Sponsorships</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sponsorships.map(s => (
            <div key={s.id} className="p-4 border border-ink/15 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-navy">{s.sponsor_name}</h4>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  s.status === 'received' ? 'bg-green-100 text-green-700' :
                  s.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{s.status}</span>
              </div>
              <p className="text-sm text-ink-soft">{s.tier || s.sponsorship_type}</p>
              <p className="text-md font-bold text-ochre mt-2">₹{s.total_value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ EXPENDITURE TRACKER ============
function ExpenditureTracker({ onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [committeeFilter, setCommitteeFilter] = useState('all');

  useEffect(() => {
    fetchItems();
  }, [committeeFilter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = committeeFilter === 'all' ? '/admin/finance/expenditures' : `/admin/finance/expenditures?committee=${committeeFilter}`;
      setItems(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expenditure?')) return;
    try {
      await request(`/admin/finance/expenditures/${id}`, { method: 'DELETE' });
      fetchItems();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const total = items.reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/expenditures/import"
            exportEndpoint="/admin/finance/expenditures/export"
            onImportComplete={fetchItems}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Expenditure
        </button>
      </div>

      <div className="flex gap-3">
        <select value={committeeFilter} onChange={(e) => setCommitteeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
          <option value="all">All Committees</option>
          <option value="logistics">Logistics</option>
          <option value="technical">Technical</option>
          <option value="hospitality">Hospitality</option>
          <option value="website">Website</option>
          <option value="media">Media</option>
          <option value="administration">Administration</option>
        </select>
        <div className="flex-1"></div>
        <MiniStat label="Total Expenditure" value={`₹${total.toLocaleString('en-IN')}`} />
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Description</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Committee</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Paid To</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{item.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 capitalize">{item.committee}</span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-orange-600">₹{item.total_amount.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{item.paid_to}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">{new Date(item.expenditure_date).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    item.status === 'paid' ? 'bg-green-100 text-green-700' :
                    item.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{item.status}</span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <ExpenditureForm onClose={() => setShowForm(false)}
        onSaved={async () => { setShowForm(false); fetchItems(); onRefresh(); }} />}
    </div>
  );
}

function ExpenditureForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    description: '', category: 'venue', amount: 0, gst_amount: 0, total_amount: 0,
    expenditure_date: new Date().toISOString().split('T')[0], committee: 'logistics',
    payment_method: 'bank_transfer', paid_to: '', status: 'pending', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, total_amount: prev.amount + (prev.gst_amount || 0) }));
  }, [formData.amount, formData.gst_amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/finance/expenditures', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Expenditure</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description *</label>
            <input required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="venue">Venue</option>
                <option value="catering">Catering</option>
                <option value="logistics">Logistics</option>
                <option value="publicity">Publicity</option>
                <option value="technical">Technical</option>
                <option value="hospitality">Hospitality</option>
                <option value="administration">Administration</option>
                <option value="contingency">Contingency</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Committee</label>
              <select value={formData.committee} onChange={(e) => setFormData({...formData, committee: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="logistics">Logistics</option>
                <option value="technical">Technical</option>
                <option value="hospitality">Hospitality</option>
                <option value="website">Website</option>
                <option value="media">Media</option>
                <option value="administration">Administration</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Amount (₹) *</label>
              <input type="number" min="0" required value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">GST (₹)</label>
              <input type="number" min="0" value={formData.gst_amount}
                onChange={(e) => setFormData({...formData, gst_amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Total (₹)</label>
              <input type="number" value={formData.total_amount} readOnly
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg bg-atmosphere" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Date *</label>
              <input type="date" required value={formData.expenditure_date}
                onChange={(e) => setFormData({...formData, expenditure_date: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Payment Method</label>
              <select value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Paid To *</label>
            <input required value={formData.paid_to} onChange={(e) => setFormData({...formData, paid_to: e.target.value})}
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

// ============ BILLS MANAGER ============
function BillsManager() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setBills(await request('/admin/finance/bills'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await request(`/admin/finance/bills/${id}`, { method: 'DELETE' });
      fetchBills();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/bills/import"
            exportEndpoint="/admin/finance/bills/export"
            onImportComplete={fetchBills}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Bill
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Bill #</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Verification</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {bills.map(b => (
              <tr key={b.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-mono font-bold text-navy">{b.bill_number}</td>
                <td className="px-6 py-4 text-sm text-navy">{b.vendor_name}</td>
                <td className="px-6 py-4 text-sm font-bold text-orange-600">₹{b.total_amount.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">{new Date(b.bill_date).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{b.bill_type.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    b.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                    b.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{b.verification_status}</span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <BillForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchBills(); }} />}
    </div>
  );
}

function BillForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    bill_number: '', vendor_name: '', description: '', amount: 0, gst_amount: 0,
    total_amount: 0, bill_date: new Date().toISOString().split('T')[0],
    bill_type: 'invoice', verification_status: 'pending'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, total_amount: prev.amount + (prev.gst_amount || 0) }));
  }, [formData.amount, formData.gst_amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/finance/bills', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Bill/Voucher</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Bill Number *</label>
              <input required value={formData.bill_number} onChange={(e) => setFormData({...formData, bill_number: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
              <select value={formData.bill_type} onChange={(e) => setFormData({...formData, bill_type: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="voucher">Voucher</option>
                <option value="cash_memo">Cash Memo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Vendor Name *</label>
            <input required value={formData.vendor_name} onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description *</label>
            <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Amount</label>
              <input type="number" min="0" value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">GST</label>
              <input type="number" min="0" value={formData.gst_amount}
                onChange={(e) => setFormData({...formData, gst_amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Total</label>
              <input type="number" value={formData.total_amount} readOnly
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg bg-atmosphere" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Bill Date *</label>
            <input type="date" required value={formData.bill_date}
              onChange={(e) => setFormData({...formData, bill_date: e.target.value})}
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

// ============ PROCUREMENT MANAGER ============
function ProcurementManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setItems(await request('/admin/finance/procurements'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this procurement?')) return;
    try {
      await request(`/admin/finance/procurements/${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/procurements/import"
            exportEndpoint="/admin/finance/procurements/export"
            onImportComplete={fetchItems}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Procurement
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Item</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Committee</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Est. Cost</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {items.map(p => (
              <tr key={p.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{p.item_name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 capitalize">{p.committee_requesting}</span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{p.quantity}</td>
                <td className="px-6 py-4 text-sm font-bold text-orange-600">₹{p.estimated_cost.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{p.vendor_name || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    p.status === 'received' ? 'bg-green-100 text-green-700' :
                    p.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                    p.status === 'approved' ? 'bg-yellow-100 text-yellow-700' :
                    p.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{p.status.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <ProcurementForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchItems(); }} />}
    </div>
  );
}

function ProcurementForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    item_name: '', description: '', quantity: 1, estimated_cost: 0,
    committee_requesting: 'logistics', status: 'requested', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/finance/procurements', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Procurement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Item Name *</label>
            <input required value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Qty</label>
              <input type="number" min="1" value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Est. Cost</label>
              <input type="number" min="0" value={formData.estimated_cost}
                onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Committee</label>
              <select value={formData.committee_requesting} onChange={(e) => setFormData({...formData, committee_requesting: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="logistics">Logistics</option>
                <option value="technical">Technical</option>
                <option value="hospitality">Hospitality</option>
                <option value="website">Website</option>
                <option value="media">Media</option>
                <option value="administration">Admin</option>
              </select>
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

// ============ VENDORS MANAGER ============
function VendorsManager() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setVendors(await request('/admin/finance/vendors'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return;
    try {
      await request(`/admin/finance/vendors/${id}`, { method: 'DELETE' });
      fetchVendors();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/vendors/import"
            exportEndpoint="/admin/finance/vendors/export"
            onImportComplete={fetchVendors}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">GSTIN</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {vendors.map(v => (
              <tr key={v.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{v.name}</p>
                  <p className="text-xs text-ink-soft">{v.contact_person || ''}</p>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {v.email && <div>{v.email}</div>}
                  {v.phone && <div>{v.phone}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{v.category.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-ink-soft">{v.gstin || '—'}</td>
                <td className="px-6 py-4">
                  {v.rating ? <span className="text-ochre font-bold">{'★'.repeat(v.rating)}</span> : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    v.status === 'active' ? 'bg-green-100 text-green-700' :
                    v.status === 'blacklisted' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{v.status}</span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <VendorForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchVendors(); }} />}
    </div>
  );
}

function VendorForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: '', contact_person: '', email: '', phone: '', category: 'other',
    gstin: '', payment_terms: '', rating: 3, status: 'active', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/finance/vendors', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Vendor</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Vendor Name *</label>
            <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Contact Person</label>
              <input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="catering">Catering</option>
                <option value="printing">Printing</option>
                <option value="av_equipment">AV Equipment</option>
                <option value="transport">Transport</option>
                <option value="accommodation">Accommodation</option>
                <option value="stationery">Stationery</option>
                <option value="it_services">IT Services</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">GSTIN</label>
            <input value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value})}
              placeholder="29AAACU1234F1Z5" className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg font-mono" />
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

// ============ SPONSORSHIPS MANAGER ============
function SponsorshipsManager({ onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setItems(await request('/admin/finance/sponsorships'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sponsorship?')) return;
    try {
      await request(`/admin/finance/sponsorships/${id}`, { method: 'DELETE' });
      fetchItems();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const totalValue = items.reduce((sum, s) => sum + (s.total_value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/sponsorships/import"
            exportEndpoint="/admin/finance/sponsorships/export"
            onImportComplete={fetchItems}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Sponsorship
        </button>
      </div>

      <MiniStat label="Total Sponsorship Value" value={`₹${totalValue.toLocaleString('en-IN')}`} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-ink/10 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-md font-display font-bold text-navy">{s.sponsor_name}</h3>
                <p className="text-xs text-ink-soft">{s.tier || s.sponsorship_type}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                s.status === 'received' ? 'bg-green-100 text-green-700' :
                s.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                s.status === 'declined' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{s.status.replace('_', ' ')}</span>
            </div>
            <p className="text-2xl font-display font-bold text-ochre mb-2">₹{s.total_value.toLocaleString('en-IN')}</p>
            {s.benefits_offered && <p className="text-xs text-ink-soft mb-2">Benefits: {s.benefits_offered}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t border-ink/10">
              <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && <SponsorshipForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchItems(); onRefresh(); }} />}
    </div>
  );
}

function SponsorshipForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    sponsor_name: '', contact_person: '', email: '', phone: '',
    sponsorship_type: 'cash', cash_amount: 0, in_kind_value: 0,
    tier: '', benefits_offered: '', status: 'prospective', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/finance/sponsorships', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Sponsorship</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Sponsor Name *</label>
            <input required value={formData.sponsor_name} onChange={(e) => setFormData({...formData, sponsor_name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Contact Person</label>
              <input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Tier</label>
              <select value={formData.tier} onChange={(e) => setFormData({...formData, tier: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="">None</option>
                <option value="Platinum">Platinum</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Bronze">Bronze</option>
                <option value="In-Kind Partner">In-Kind Partner</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
            <select value={formData.sponsorship_type} onChange={(e) => setFormData({...formData, sponsorship_type: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="cash">Cash</option>
              <option value="in_kind">In-Kind</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Cash Amount (₹)</label>
              <input type="number" min="0" value={formData.cash_amount}
                onChange={(e) => setFormData({...formData, cash_amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">In-Kind Value (₹)</label>
              <input type="number" min="0" value={formData.in_kind_value}
                onChange={(e) => setFormData({...formData, in_kind_value: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Benefits Offered</label>
            <textarea value={formData.benefits_offered} onChange={(e) => setFormData({...formData, benefits_offered: e.target.value})}
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

// ============ RECONCILIATION ============
function ReconciliationManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setItems(await request('/admin/finance/reconciliation'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this reconciliation?')) return;
    try {
      await request(`/admin/finance/reconciliation/${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/reconciliation/import"
            exportEndpoint="/admin/finance/reconciliation/export"
            onImportComplete={fetchItems}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Reconciliation
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Period</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Expected</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actual</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Difference</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {items.map(r => (
              <tr key={r.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy capitalize">{r.reconciliation_type.replace('_', ' ')}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {new Date(r.period_start).toLocaleDateString()} - {new Date(r.period_end).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-navy">₹{r.expected_amount.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 text-sm font-bold text-navy">₹{r.actual_amount.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-bold ${r.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{r.difference.toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    r.status === 'matched' ? 'bg-green-100 text-green-700' :
                    r.status === 'mismatched' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{r.status}</span>
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

      {showForm && <ReconciliationForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchItems(); }} />}
    </div>
  );
}

function ReconciliationForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    reconciliation_type: 'registration', period_start: '', period_end: '',
    expected_amount: 0, actual_amount: 0, difference: 0, status: 'pending', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, difference: prev.actual_amount - prev.expected_amount }));
  }, [formData.expected_amount, formData.actual_amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/finance/reconciliation', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Reconciliation</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
            <select value={formData.reconciliation_type} onChange={(e) => setFormData({...formData, reconciliation_type: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
              <option value="registration">Registration</option>
              <option value="sponsorship">Sponsorship</option>
              <option value="expenditure">Expenditure</option>
              <option value="procurement">Procurement</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Period Start</label>
              <input type="date" required value={formData.period_start}
                onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Period End</label>
              <input type="date" required value={formData.period_end}
                onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Expected</label>
              <input type="number" value={formData.expected_amount}
                onChange={(e) => setFormData({...formData, expected_amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Actual</label>
              <input type="number" value={formData.actual_amount}
                onChange={(e) => setFormData({...formData, actual_amount: parseFloat(e.target.value) || 0})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Difference</label>
              <input type="number" value={formData.difference} readOnly
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg bg-atmosphere" />
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

// ============ COMMITTEE EXPENDITURE ============
function CommitteeExpenditure() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/admin/finance/committee-expenditure').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const pieData = Object.entries(data || {}).map(([name, d]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: d.total
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <h3 className="text-lg font-display font-bold text-navy mb-4">Committee-wise Expenditure</h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={120} fill="#8884d8" dataKey="value">
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(data || {}).map(([name, d]) => (
          <div key={name} className="bg-white rounded-xl border border-ink/10 p-5">
            <h4 className="text-md font-display font-bold text-navy mb-3 capitalize">{name}</h4>
            <p className="text-2xl font-display font-bold text-ochre mb-3">₹{d.total.toLocaleString('en-IN')}</p>
            <p className="text-xs text-ink-soft mb-2">{d.count} transactions</p>
            <div className="space-y-1">
              {Object.entries(d.by_category || {}).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-xs">
                  <span className="text-ink-soft capitalize">{cat}</span>
                  <span className="font-bold text-navy">₹{amt.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MEETINGS ============
function MeetingsManager() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setMeetings(await request('/admin/finance/meetings'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this meeting record?')) return;
    try {
      await request(`/admin/finance/meetings/${id}`, { method: 'DELETE' });
      fetchMeetings();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/meetings/import"
            exportEndpoint="/admin/finance/meetings/export"
            onImportComplete={fetchMeetings}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add Meeting
        </button>
      </div>

      <div className="space-y-3">
        {meetings.map(m => (
          <div key={m.id} className="bg-white rounded-xl border border-ink/10 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-md font-display font-bold text-navy">{m.title}</h3>
                <p className="text-xs text-ink-soft capitalize">{m.meeting_type.replace('_', ' ')} • {new Date(m.meeting_date).toLocaleString()}</p>
              </div>
              <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {m.attendees?.length > 0 && (
              <p className="text-xs text-ink-soft mb-2">Attendees: {m.attendees.join(', ')}</p>
            )}
            {m.decisions && <p className="text-sm text-navy mb-2"><strong>Decisions:</strong> {m.decisions}</p>}
            {m.action_items && <p className="text-sm text-ochre"><strong>Action Items:</strong> {m.action_items}</p>}
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">No meetings recorded</div>
        )}
      </div>

      {showForm && <MeetingForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchMeetings(); }} />}
    </div>
  );
}

function MeetingForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    title: '', meeting_type: 'finance_committee',
    meeting_date: new Date().toISOString().slice(0, 16),
    duration_minutes: 60, attendees: [], agenda: '', minutes: '',
    decisions: '', action_items: ''
  });
  const [attendeesText, setAttendeesText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        attendees: attendeesText.split(',').map(a => a.trim()).filter(a => a)
      };
      await request('/admin/finance/meetings', { method: 'POST', body: JSON.stringify(payload) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add Meeting Record</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Title *</label>
            <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Type</label>
              <select value={formData.meeting_type} onChange={(e) => setFormData({...formData, meeting_type: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="finance_committee">Finance Committee</option>
                <option value="coordination">Coordination</option>
                <option value="review">Review</option>
                <option value="audit">Audit</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Date/Time</label>
              <input type="datetime-local" value={formData.meeting_date}
                onChange={(e) => setFormData({...formData, meeting_date: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Attendees (comma-separated)</label>
            <input value={attendeesText} onChange={(e) => setAttendeesText(e.target.value)}
              placeholder="John, Jane, Bob"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Agenda</label>
            <textarea value={formData.agenda} onChange={(e) => setFormData({...formData, agenda: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Minutes</label>
            <textarea value={formData.minutes} onChange={(e) => setFormData({...formData, minutes: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Decisions</label>
            <textarea value={formData.decisions} onChange={(e) => setFormData({...formData, decisions: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Action Items</label>
            <textarea value={formData.action_items} onChange={(e) => setFormData({...formData, action_items: e.target.value})}
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

// ============ ADMIN FILES ============
function AdminFilesManager() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setFiles(await request('/admin/finance/admin-files'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this file record?')) return;
    try {
      await request(`/admin/finance/admin-files/${id}`, { method: 'DELETE' });
      fetchFiles();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <ImportExportButtons
            importEndpoint="/admin/finance/admin-files/import"
            exportEndpoint="/admin/finance/admin-files/export"
            onImportComplete={fetchFiles}
          />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> Add File Record
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Title</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Category</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Ref #</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Confidentiality</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {files.map(f => (
              <tr key={f.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{f.title}</p>
                  {f.description && <p className="text-xs text-ink-soft mt-1">{f.description}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">{f.category.replace('_', ' ')}</span>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-ink-soft">{f.file_reference_number || '—'}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">{f.file_date ? new Date(f.file_date).toLocaleDateString() : '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    f.confidentiality === 'restricted' ? 'bg-red-100 text-red-700' :
                    f.confidentiality === 'confidential' ? 'bg-orange-100 text-orange-700' :
                    f.confidentiality === 'internal' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>{f.confidentiality}</span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <AdminFileForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchFiles(); }} />}
    </div>
  );
}

function AdminFileForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    title: '', category: 'conference_files', description: '',
    file_reference_number: '', file_date: '', confidentiality: 'internal',
    status: 'active', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('/admin/finance/admin-files', { method: 'POST', body: JSON.stringify(formData) });
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
        <h3 className="text-xl font-display font-bold text-navy mb-4">Add File Record</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Title *</label>
            <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="official_correspondence">Official Correspondence</option>
                <option value="institutional_docs">Institutional Docs</option>
                <option value="committee_docs">Committee Docs</option>
                <option value="certificates">Certificates</option>
                <option value="conference_files">Conference Files</option>
                <option value="legal">Legal</option>
                <option value="financial">Financial</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Confidentiality</label>
              <select value={formData.confidentiality} onChange={(e) => setFormData({...formData, confidentiality: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Reference Number</label>
            <input value={formData.file_reference_number} onChange={(e) => setFormData({...formData, file_reference_number: e.target.value})}
              placeholder="FIN/2026/001" className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg font-mono" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2} className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">File Date</label>
            <input type="date" value={formData.file_date} onChange={(e) => setFormData({...formData, file_date: e.target.value})}
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

// ============ REPORTS PANEL ============
function ReportsPanel() {
  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(`http://127.0.0.1:8000/admin/finance/${type}/export`, {
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

  const reports = [
    { type: 'budget', title: 'Budget Report', desc: 'All budget items with allocations', icon: PieIcon },
    { type: 'expenditures', title: 'Expenditure Report', desc: 'All expenses with details', icon: Receipt },
    { type: 'bills', title: 'Bills & Vouchers', desc: 'All bills and vouchers', icon: FileText },
    { type: 'procurements', title: 'Procurement Report', desc: 'All purchase orders', icon: Package },
    { type: 'vendors', title: 'Vendor Directory', desc: 'All registered vendors', icon: Building2 },
    { type: 'sponsorships', title: 'Sponsorship Report', desc: 'All sponsorships', icon: HandCoins },
    { type: 'reconciliation', title: 'Reconciliation Report', desc: 'All reconciliation records', icon: Scale },
    { type: 'meetings', title: 'Meeting Records', desc: 'All meeting minutes', icon: Calendar },
    { type: 'admin-files', title: 'Admin Files', desc: 'All administrative files', icon: FolderOpen },
  ];

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-8">
      <h3 className="text-xl font-display font-bold text-navy mb-2">Financial Reports</h3>
      <p className="text-sm text-ink-soft mb-6">Download CSV reports for analysis and auditing.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.type} className="border border-ink/15 rounded-xl p-6 hover:border-ochre/50 transition-colors">
              <Icon className="w-10 h-10 text-ochre mb-3" />
              <h4 className="text-lg font-display font-bold text-navy mb-1">{r.title}</h4>
              <p className="text-xs text-ink-soft mb-4">{r.desc}</p>
              <button onClick={() => handleExport(r.type)}
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
