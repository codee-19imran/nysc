import { useState, useEffect } from 'react';
import { Mail, CheckCircle, Clock, XCircle, Eye, Trash2, FileText } from 'lucide-react';
import { request } from '../../lib/api';

export default function AdminContact() {
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const [inqData, statsData] = await Promise.all([
        request(filter === 'all' ? '/contact/admin' : `/contact/admin?status_filter=${filter}`),
        request('/contact/admin/stats')
      ]);
      setInquiries(inqData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await request(`/contact/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this inquiry?')) return;
    try {
      await request(`/contact/admin/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const subjectLabels = {
    general_inquiry: 'General',
    registration_support: 'Registration',
    paper_submission_issue: 'Paper Issue',
    sponsorship_opportunities: 'Sponsorship',
    technical_issue: 'Technical',
    other: 'Other'
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Inquiries" value={stats.total} icon={Mail} color="bg-blue-500" />
          <StatCard title="New / Unread" value={stats.new} icon={Clock} color="bg-orange-500" />
          <StatCard title="Replied" value={stats.replied} icon={CheckCircle} color="bg-green-500" />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'new', 'read', 'replied', 'closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-bold rounded-lg capitalize ${
              filter === f ? 'bg-navy text-white' : 'bg-white border border-ink/15'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">From</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {inquiries.map(inq => (
              <tr key={inq.id} className={`hover:bg-atmosphere/50 ${inq.status === 'new' ? 'bg-blue-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-navy">{inq.first_name} {inq.last_name}</p>
                  <p className="text-xs text-ink-soft">{inq.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700">
                    {subjectLabels[inq.subject]}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {new Date(inq.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    inq.status === 'new' ? 'bg-orange-100 text-orange-700' :
                    inq.status === 'replied' ? 'bg-green-100 text-green-700' :
                    inq.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{inq.status}</span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => setViewing(inq)} className="p-1.5 hover:bg-atmosphere rounded" title="View">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(inq.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inquiries.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No inquiries found</div>
        )}
      </div>

      {/* View Modal */}
      {viewing && (
        <InquiryModal inquiry={viewing} onClose={() => setViewing(null)}
          onStatusChange={handleStatusChange} onRefresh={fetchData} />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6 flex items-center gap-4">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-ink-soft">{title}</p>
        <p className="text-2xl font-display font-bold text-navy">{value}</p>
      </div>
    </div>
  );
}

function InquiryModal({ inquiry, onClose, onStatusChange, onRefresh }) {
  const [notes, setNotes] = useState(inquiry.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await request(`/contact/admin/${inquiry.id}`, {
        method: 'PUT',
        body: JSON.stringify({ admin_notes: notes })
      });
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-6 border-b border-ink/10 pb-4">
          <div>
            <h3 className="text-xl font-display font-bold text-navy">Inquiry Details</h3>
            <p className="text-sm text-ink-soft">From: {inquiry.first_name} {inquiry.last_name} ({inquiry.email})</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-atmosphere rounded"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-atmosphere/50 rounded-lg">
            <p className="text-xs font-bold uppercase text-ink-soft mb-1">Message</p>
            <p className="text-sm text-navy whitespace-pre-wrap">{inquiry.message}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase text-ink-soft mb-1">IP Address</p>
              <p className="text-navy font-mono">{inquiry.ip_address || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-ink-soft mb-1">Submitted</p>
              <p className="text-navy">{new Date(inquiry.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-ink/10 pt-4 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft mb-1 block">Admin Notes (Internal)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-4 py-2 border border-ink/15 rounded-lg focus:border-ochre outline-none"
              placeholder="Add internal notes here (e.g., 'Replied via Gmail on 10/12')..." />
          </div>
          
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2">
              <button onClick={() => onStatusChange(inquiry.id, 'read')} className="px-3 py-1.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">Mark Read</button>
              <button onClick={() => onStatusChange(inquiry.id, 'replied')} className="px-3 py-1.5 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200">Mark Replied</button>
              <button onClick={() => onStatusChange(inquiry.id, 'closed')} className="px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Close</button>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 border border-ink/15 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-ochre text-white text-sm font-bold rounded-lg disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
