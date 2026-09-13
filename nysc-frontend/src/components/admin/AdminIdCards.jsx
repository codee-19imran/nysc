import { useState, useEffect } from 'react';
import { 
  CreditCard, Download, Printer, Eye, RefreshCw, 
  CheckCircle, Clock, Package, Users, Plus, Settings, X
} from 'lucide-react';
import { request } from '../../lib/api';

export default function AdminIdCards() {
  const [activeTab, setActiveTab] = useState('cards');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await request('/admin/id-cards/stats');
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: 'cards', label: 'ID Cards', icon: CreditCard },
    { id: 'templates', label: 'Templates', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MiniStat label="Total Generated" value={stats.total_generated} icon={CreditCard} />
          <MiniStat label="Pending Print" value={stats.pending} icon={Clock} />
          <MiniStat label="Printed" value={stats.printed} icon={Printer} />
          <MiniStat label="Collected" value={stats.collected} icon={CheckCircle} />
          <MiniStat label="Users w/o ID" value={stats.users_without_id} icon={Users} />
        </div>
      )}

      <div className="bg-white rounded-xl border border-ink/10 p-2">
        <div className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === tab.id ? 'bg-ochre text-white' : 'text-ink-soft hover:bg-atmosphere'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'cards' && <IdCardsList onRefresh={fetchStats} />}
      {activeTab === 'templates' && <TemplateManager />}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-4 flex items-center gap-3">
      <div className="bg-ochre/10 p-2 rounded-lg">
        <Icon className="w-5 h-5 text-ochre" />
      </div>
      <div>
        <p className="text-xs text-ink-soft">{label}</p>
        <p className="text-xl font-display font-bold text-navy">{value}</p>
      </div>
    </div>
  );
}

// ============ ID CARDS LIST ============
function IdCardsList({ onRefresh }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetchCards();
  }, [statusFilter, roleFilter]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const params = [];
      if (statusFilter !== 'all') params.push(`status_filter=${statusFilter}`);
      if (roleFilter !== 'all') params.push(`role_filter=${roleFilter}`);
      const url = '/admin/id-cards/' + (params.length ? '?' + params.join('&') : '');
      setCards(await request(url));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (cardId, newStatus) => {
    try {
      await request(`/admin/id-cards/${cardId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchCards();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkStatus = async (newStatus) => {
    if (selected.length === 0) return;
    try {
      await request('/admin/id-cards/bulk-status', {
        method: 'PUT',
        body: JSON.stringify({ card_ids: selected, status: newStatus })
      });
      setSelected([]);
      fetchCards();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBatchPrint = async () => {
    try {
      const token = localStorage.getItem('nysc_token');
      const filter = statusFilter !== 'all' ? statusFilter : 'pending';
      const response = await fetch(
        `http://127.0.0.1:8000/admin/id-cards/batch-print?status_filter=${filter}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `id_cards_batch.pdf`;
      a.click();
    } catch (err) {
      alert('Batch print failed: ' + err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === cards.length) {
      setSelected([]);
    } else {
      setSelected(cards.map(c => c.id));
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="printed">Printed</option>
            <option value="collected">Collected</option>
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-ink/15 rounded-lg bg-white">
            <option value="all">All Roles</option>
            <option value="delegate">Delegate</option>
            <option value="presenter">Presenter</option>
            <option value="volunteer">Volunteer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleBatchPrint}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90">
            <Printer className="w-4 h-4" /> Print-Ready PDF
          </button>
          {selected.length > 0 && (
            <>
              <button onClick={() => handleBulkStatus('printed')}
                className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg">
                Mark {selected.length} as Printed
              </button>
              <button onClick={() => handleBulkStatus('collected')}
                className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">
                Mark {selected.length} Collected
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={selected.length === cards.length && cards.length > 0}
                  onChange={selectAll} className="w-4 h-4 accent-ochre" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">User</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Role</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Template</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Generated</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {cards.map(card => (
              <tr key={card.id} className="hover:bg-atmosphere/50">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(card.id)}
                    onChange={() => toggleSelect(card.id)} className="w-4 h-4 accent-ochre" />
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{card.user_name}</p>
                  <p className="text-xs text-ink-soft">{card.user_email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">
                    {card.user_role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">{card.template_name}</td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {new Date(card.generated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <select value={card.print_status}
                    onChange={(e) => handleStatusChange(card.id, e.target.value)}
                    className={`px-2 py-1 text-xs font-bold rounded-full border-0 ${
                      card.print_status === 'collected' ? 'bg-blue-100 text-blue-700' :
                      card.print_status === 'printed' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                    <option value="pending">Pending</option>
                    <option value="printed">Printed</option>
                    <option value="collected">Collected</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <a href={`http://127.0.0.1:8000/admin/id-cards/${card.id}/download`}
                    target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-ink-soft hover:text-ochre hover:bg-ochre/10 rounded inline-block"
                    title="View PDF">
                    <Eye className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cards.length === 0 && (
          <div className="text-center py-12 text-ink-soft">
            No ID cards generated yet. They are auto-generated on first check-in scan.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ TEMPLATE MANAGER ============
function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setTemplates(await request('/admin/id-cards/templates'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      await request(`/admin/id-cards/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentActive })
      });
      fetchTemplates();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePreview = async (id) => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch(
        `http://127.0.0.1:8000/admin/id-cards/templates/${id}/preview?sample_name=Sample User`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert('Preview failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await request(`/admin/id-cards/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-ink-soft">
          Templates determine the design of ID cards per role. Upload a background image and configure field positions.
        </p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-ink/10 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-md font-display font-bold text-navy">{t.name}</h3>
                <p className="text-xs text-ink-soft capitalize">For: {t.target_role}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {t.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-2 pt-2 border-t border-ink/10">
              <button onClick={() => handlePreview(t.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-navy text-white rounded-lg hover:bg-navy/90">
                <Eye className="w-3 h-3" /> Preview
              </button>
              <button onClick={() => handleToggleActive(t.id, t.is_active)}
                className="px-3 py-1.5 text-xs font-bold bg-atmosphere text-navy rounded-lg hover:bg-atmosphere/70">
                {t.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleDelete(t.id)}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="bg-white rounded-xl border border-ink/10 p-12 text-center text-ink-soft">
          No templates yet. Create one to start generating ID cards.
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 relative">
            <button onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 p-1 hover:bg-atmosphere rounded">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-display font-bold text-navy mb-4">Template Preview</h3>
            <iframe src={previewUrl} className="w-full h-[500px] rounded border" title="Preview" />
          </div>
        </div>
      )}

      {showForm && <TemplateForm onClose={() => setShowForm(false)} onSaved={async () => { setShowForm(false); fetchTemplates(); }} />}
    </div>
  );
}

function TemplateForm({ onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: '', target_role: 'delegate', image: null,
    config_json: JSON.stringify({
      canvas_size: { width: 1000, height: 600 },
      fields: {
        name: { x: 10, y: 30, font: "Helvetica-Bold", size: 14, color: "#1a1a4e" },
        role: { x: 10, y: 40, font: "Helvetica", size: 9, color: "#f59e0b" },
        category: { x: 10, y: 46, font: "Helvetica", size: 8, color: "#555555" },
        reg_code: { x: 10, y: 65, font: "Courier-Bold", size: 7, color: "#1a1a4e" },
        qr_code: { x: 60, y: 55, size: 25 }
      }
    }, null, 2)
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) {
      alert('Please upload a template image');
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('target_role', formData.target_role);
      form.append('config_json', formData.config_json);
      form.append('template_image', formData.image);
      
      const token = localStorage.getItem('nysc_token');
      await fetch('http://127.0.0.1:8000/admin/id-cards/templates', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      onSaved();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-xl font-display font-bold text-navy mb-4">Create Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Template Name *</label>
              <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Delegate ID Card"
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-ink-soft">Target Role *</label>
              <select value={formData.target_role} onChange={(e) => setFormData({...formData, target_role: e.target.value})}
                className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg">
                <option value="delegate">Delegate</option>
                <option value="presenter">Presenter</option>
                <option value="volunteer">Volunteer</option>
                <option value="staff">Staff (All)</option>
                <option value="all">All Roles</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Background Image (PNG/JPG) *</label>
            <input type="file" accept="image/*" required
              onChange={(e) => setFormData({...formData, image: e.target.files[0]})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg" />
            <p className="text-xs text-ink-soft mt-1">
              Recommended size: 1000×600 px (credit card ratio). Will be scaled to fit.
            </p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Field Configuration (JSON) *</label>
            <textarea value={formData.config_json}
              onChange={(e) => setFormData({...formData, config_json: e.target.value})}
              rows={12}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg font-mono text-xs" />
            <p className="text-xs text-ink-soft mt-1">
              Positions are in mm from top-left of card. Font sizes in points.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
