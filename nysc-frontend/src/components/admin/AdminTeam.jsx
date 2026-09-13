import { useState, useEffect } from 'react';
import { 
  UserPlus, Users, Shield, Copy, Check, Trash2, Edit2, 
  AlertCircle, Mail, Phone, Calendar, X, Search, Ticket, Plus
} from 'lucide-react';
import { request } from '../../lib/api';

export default function AdminTeam() {
  const [activeTab, setActiveTab] = useState('invites');
  const [invites, setInvites] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invitesData, teamData] = await Promise.all([
        request('/admin/invites'),
        request('/admin/team')
      ]);
      setInvites(invitesData);
      setTeam(teamData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'invites', label: 'Pending Invites', icon: Mail, count: invites.filter(i => i.status === 'pending').length },
    { id: 'team', label: 'Team Members', icon: Users, count: team.length },
    { id: 'new', label: 'Invite New Admin', icon: UserPlus },
    { id: 'volunteer-codes', label: 'Volunteer Codes', icon: Ticket },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
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

      {/* Tab Content */}
      {activeTab === 'invites' && <InvitesList invites={invites} onRefresh={fetchData} />}
      {activeTab === 'team' && <TeamList team={team} onRefresh={fetchData} />}
      {activeTab === 'new' && <InviteForm onCreated={fetchData} />}
      {activeTab === 'volunteer-codes' && <VolunteerCodesManager />}
    </div>
  );
}

// ============ INVITE FORM ============
function InviteForm({ onCreated }) {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: 'admin',
    specialized_domain: '', department: 'logistics', custom_permissions: []
  });
  const [showCustomPerms, setShowCustomPerms] = useState(false);
  const [allPermissions, setAllPermissions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const ROLES = [
    { value: 'admin', label: 'Regular Admin (Full Access except Audit)' },
    { value: 'logistics_head', label: 'Head of Logistics' },
    { value: 'technical_head', label: 'Head of Technical' },
    { value: 'hospitality_head', label: 'Head of Hospitality' },
    { value: 'media_head', label: 'Head of Media' },
    { value: 'website_head', label: 'Head of Website' },
    { value: 'committee_member', label: 'Committee Member' },
    { value: 'volunteer', label: 'Volunteer' },
  ];

  const DOMAINS = [
    'Mining & Earth Observation',
    'Renewable Energy & Sustainability',
    'Environmental Science & Climate'
  ];

  useEffect(() => {
    if (showCustomPerms) {
      request('/admin/permissions/list').then(setAllPermissions).catch(console.error);
    }
  }, [showCustomPerms]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setResult(null);
    
    try {
      const payload = {
        ...formData,
        custom_permissions: showCustomPerms ? formData.custom_permissions : null
      };
      const data = await request('/admin/invites', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setResult(data);
      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create invite');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(result.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = (permName) => {
    setFormData(prev => ({
      ...prev,
      custom_permissions: prev.custom_permissions.includes(permName)
        ? prev.custom_permissions.filter(p => p !== permName)
        : [...prev.custom_permissions, permName]
    }));
  };

  if (result) {
    return (
      <div className="bg-white rounded-xl border border-ink/10 p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-display font-bold text-navy mb-2">Invite Created!</h3>
          <p className="text-sm text-ink-soft">
            Share this link with <span className="font-bold text-navy">{result.email}</span>
          </p>
        </div>

        <div className="bg-atmosphere rounded-lg p-4 mb-4">
          <p className="text-xs font-bold uppercase text-ink-soft mb-2">Invite Link</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={result.invite_url}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-ink/15 rounded-lg text-xs font-mono text-navy"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-ink-soft mt-2">
            ⏰ Expires in 24 hours • Single use only
          </p>
        </div>

        <button
          onClick={() => { setResult(null); setFormData({ name: '', email: '', phone: '', role: 'admin', specialized_domain: '', custom_permissions: [] }); }}
          className="w-full py-2 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90"
        >
          Create Another Invite
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6 max-w-2xl">
      <h3 className="text-xl font-display font-bold text-navy mb-2">Invite New Admin</h3>
      <p className="text-sm text-ink-soft mb-6">
        Create a secure invite link. The invitee will set their own password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Full Name *</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Phone *</label>
            <input
              required
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="10 digits"
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-ink-soft">Email *</label>
          <input
            required
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-ink-soft">Role *</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {(formData.role === 'committee_member' || formData.role.endsWith('_head')) && (
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">Department *</label>
            <select
              required
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
            >
              <option value="logistics">Logistics</option>
              <option value="technical">Technical</option>
              <option value="hospitality">Hospitality</option>
              <option value="media">Media</option>
              <option value="website">Website</option>
            </select>
          </div>
        )}

        {formData.role === 'admin' && (
          <div>
            <label className="text-xs font-bold uppercase text-ink-soft">
              Domain Specialization <span className="text-ink-soft/60 normal-case">(for paper review)</span>
            </label>
            <select
              value={formData.specialized_domain}
              onChange={(e) => setFormData({...formData, specialized_domain: e.target.value})}
              className="w-full mt-1 px-4 py-2 border border-ink/15 rounded-lg"
            >
              <option value="">None</option>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        {/* Custom Permissions Toggle */}
        <div className="border border-ink/15 rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCustomPerms}
              onChange={(e) => setShowCustomPerms(e.target.checked)}
              className="w-4 h-4 accent-ochre"
            />
            <div>
              <p className="text-sm font-bold text-navy">Customize Permissions</p>
              <p className="text-xs text-ink-soft">
                Override default role permissions with a custom set
              </p>
            </div>
          </label>

          {showCustomPerms && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-ochre font-bold">
                ⚠️ Warning: Only grant permissions this admin truly needs
              </p>
              {Object.entries(allPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold uppercase text-ink-soft mb-2 capitalize">
                    {category} ({perms.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map(perm => (
                      <label key={perm.name} className="flex items-start gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={formData.custom_permissions.includes(perm.name)}
                          onChange={() => togglePermission(perm.name)}
                          className="mt-0.5 w-3.5 h-3.5 accent-ochre"
                        />
                        <div>
                          <p className="font-medium text-navy">{perm.name}</p>
                          {perm.description && (
                            <p className="text-ink-soft text-[10px]">{perm.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-ink-soft">
                Selected: {formData.custom_permissions.length} permissions
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50"
        >
          {submitting ? 'Creating Invite...' : 'Generate Invite Link'}
        </button>
      </form>
    </div>
  );
}

// ============ INVITES LIST ============
function InvitesList({ invites, onRefresh }) {
  const [filter, setFilter] = useState('pending');

  const filtered = invites.filter(i => 
    filter === 'all' ? true : i.status === filter
  );

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this invite?')) return;
    try {
      await request(`/admin/invites/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      used: 'bg-green-100 text-green-700',
      expired: 'bg-gray-100 text-gray-700',
      revoked: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'used', 'expired', 'revoked', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
              filter === s ? 'bg-navy text-white' : 'bg-white border border-ink/15'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Created</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Expires</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filtered.map(invite => (
              <tr key={invite.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4 text-sm font-medium text-navy">{invite.name}</td>
                <td className="px-6 py-4 text-sm text-ink-soft">{invite.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${getStatusBadge(invite.status)}`}>
                    {invite.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {new Date(invite.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-xs text-ink-soft">
                  {new Date(invite.expires_at).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {invite.status === 'pending' && (
                    <button
                      onClick={() => handleRevoke(invite.id)}
                      className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded"
                      title="Revoke"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No invites found</div>
        )}
      </div>
    </div>
  );
}

// ============ TEAM LIST ============
function TeamList({ team, onRefresh }) {
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = team.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`${action} this admin?`)) return;
    try {
      await request(`/admin/team/${userId}/status?is_active=${currentStatus ? 0 : 1}`, {
        method: 'PUT'
      });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      super_admin: 'bg-red-100 text-red-700',
      admin: 'bg-ochre/10 text-ochre',
      logistics_head: 'bg-blue-100 text-blue-700',
      technical_head: 'bg-purple-100 text-purple-700',
      hospitality_head: 'bg-pink-100 text-pink-700',
      media_head: 'bg-indigo-100 text-indigo-700',
      website_head: 'bg-teal-100 text-teal-700',
    };
    return styles[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      logistics_head: 'Head of Logistics',
      technical_head: 'Head of Technical',
      hospitality_head: 'Head of Hospitality',
      media_head: 'Head of Media',
      website_head: 'Head of Website',
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
        <input
          type="text"
          placeholder="Search team members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-ink/15 rounded-lg bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Role</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filtered.map(user => (
              <tr key={user.id} className={`hover:bg-atmosphere/50 ${!user.is_active ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-navy">{user.name}</p>
                  <p className="text-xs text-ink-soft">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${getRoleBadge(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft">
                  {user.specialized_domain || '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-navy">{user.permission_count}</span>
                    {user.has_custom_permissions && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full">
                        CUSTOM
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-1.5 text-ink-soft hover:text-ochre hover:bg-ochre/10 rounded"
                      title="Edit Permissions"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className={`p-1.5 rounded ${
                        user.is_active 
                          ? 'text-ink-soft hover:text-red-600 hover:bg-red-50' 
                          : 'text-ink-soft hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No team members found</div>
        )}
      </div>

      {editingUser && (
        <PermissionEditor
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ============ PERMISSION EDITOR ============
function PermissionEditor({ user, onClose, onSaved }) {
  const [allPermissions, setAllPermissions] = useState({});
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [useCustom, setUseCustom] = useState(user.has_custom_permissions);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const data = await request('/admin/permissions/list');
      setAllPermissions(data);
      
      // If user has custom permissions, fetch them
      if (user.has_custom_permissions) {
        // We'd need an endpoint to get user's current permissions
        // For now, we'll start empty and let user select
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (useCustom) {
        await request(`/admin/team/${user.id}/permissions`, {
          method: 'PUT',
          body: JSON.stringify({
            permissions: selectedPerms,
            reset_to_role_defaults: false
          })
        });
      } else {
        await request(`/admin/team/${user.id}/permissions`, {
          method: 'PUT',
          body: JSON.stringify({
            permissions: [],
            reset_to_role_defaults: true
          })
        });
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permName) => {
    setSelectedPerms(prev => 
      prev.includes(permName)
        ? prev.filter(p => p !== permName)
        : [...prev, permName]
    );
  };

  const selectAllInCategory = (category) => {
    const perms = allPermissions[category].map(p => p.name);
    const allSelected = perms.every(p => selectedPerms.includes(p));
    
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !perms.includes(p)));
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...perms])]);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-ink/10 sticky top-0 bg-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-display font-bold text-navy">Edit Permissions</h3>
              <p className="text-sm text-ink-soft mt-1">
                {user.name} • {user.email}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-atmosphere rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-atmosphere rounded-lg">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="w-4 h-4 accent-ochre"
            />
            <div>
              <p className="text-sm font-bold text-navy">Use Custom Permissions</p>
              <p className="text-xs text-ink-soft">
                {useCustom 
                  ? 'Custom permissions active — role defaults are overridden' 
                  : 'Using role default permissions'}
              </p>
            </div>
          </label>

          {useCustom && (
            <div className="space-y-4">
              {Object.entries(allPermissions).map(([category, perms]) => {
                const selectedCount = perms.filter(p => selectedPerms.includes(p.name)).length;
                const allSelected = selectedCount === perms.length;
                
                return (
                  <div key={category} className="border border-ink/15 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold uppercase text-navy capitalize">
                        {category}
                      </h4>
                      <button
                        onClick={() => selectAllInCategory(category)}
                        className="text-xs text-ochre font-bold hover:underline"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'} ({selectedCount}/{perms.length})
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map(perm => (
                        <label key={perm.name} className="flex items-start gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={selectedPerms.includes(perm.name)}
                            onChange={() => togglePermission(perm.name)}
                            className="mt-0.5 w-3.5 h-3.5 accent-ochre"
                          />
                          <div>
                            <p className="font-medium text-navy">{perm.name}</p>
                            {perm.description && (
                              <p className="text-ink-soft text-[10px]">{perm.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-ochre font-bold">
                Selected: {selectedPerms.length} permissions
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-ink/10 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2 border border-ink/15 rounded-lg hover:bg-atmosphere">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-ochre text-white font-bold rounded-lg hover:bg-ochre/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============ VOLUNTEER CODES MANAGER ============
function VolunteerCodesManager() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const data = await request('/admin/volunteer-codes');
      setCodes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (codeId) => {
    try {
      await request(`/admin/volunteer-codes/${codeId}/toggle`, { method: 'PUT' });
      fetchCodes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (codeId) => {
    if (!window.confirm("Delete this volunteer code forever?")) return;
    try {
      await request(`/admin/volunteer-codes/${codeId}`, { method: 'DELETE' });
      fetchCodes();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-ink/10">
        <div>
          <h2 className="text-lg font-bold text-navy">Volunteer Registration Codes</h2>
          <p className="text-sm text-ink-soft">Create codes that volunteers can use to self-register.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-ochre text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-ochre/90"
        >
          <Plus className="w-4 h-4" /> Generate Code
        </button>
      </div>

      {showCreate && (
        <CreateCodeForm onClose={() => setShowCreate(false)} onCreated={fetchCodes} />
      )}

      {loading ? (
        <div className="p-8 text-center text-ink-soft">Loading codes...</div>
      ) : codes.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-ink/10 text-center">
          <Ticket className="w-12 h-12 text-ink/20 mx-auto mb-3" />
          <p className="text-navy font-bold">No codes created yet</p>
          <p className="text-sm text-ink-soft mt-1">Generate a code to invite volunteers</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {codes.map(code => (
            <div key={code.id} className={`bg-white rounded-xl border p-4 ${code.is_active ? 'border-ink/20' : 'border-red-200 opacity-75'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-navy">{code.name}</h3>
                  {code.department && (
                    <span className="text-[10px] uppercase font-bold text-ochre bg-ochre/10 px-2 py-0.5 rounded-full">
                      {code.department}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${code.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {code.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              
              <div className="bg-atmosphere p-3 rounded-lg flex justify-between items-center mb-3">
                <code className="font-mono font-bold text-navy text-lg">{code.code}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(code.code);
                    alert('Code copied to clipboard!');
                  }}
                  className="p-2 text-ink-soft hover:text-navy bg-white rounded shadow-sm"
                  title="Copy Code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between text-xs text-ink-soft mb-4">
                <span>Uses: <strong className="text-navy">{code.current_uses}</strong> / {code.max_uses}</span>
                <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-ink/10">
                <button
                  onClick={() => handleToggle(code.id)}
                  className={`flex-1 py-1.5 rounded text-xs font-bold ${code.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                >
                  {code.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(code.id)}
                  className="flex-1 py-1.5 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCodeForm({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    max_uses: 100,
    expires_days: 30
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.department) payload.department = null;
      
      await request('/admin/volunteer-codes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      onCreated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-ink/20 border-l-4 border-l-ochre shadow-lg mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-navy">Generate New Code</h3>
        <button onClick={onClose} className="p-1 text-ink-soft hover:bg-atmosphere rounded"><X className="w-4 h-4" /></button>
      </div>
      
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-ink-soft uppercase">Reference Name *</label>
          <input
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g. Host School Volunteers"
            className="w-full mt-1 px-3 py-2 border rounded focus:border-ochre text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-ink-soft uppercase">Department (Optional)</label>
          <select
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            className="w-full mt-1 px-3 py-2 border rounded focus:border-ochre text-sm"
          >
            <option value="">-- None --</option>
            <option value="logistics">Logistics</option>
            <option value="technical">Technical</option>
            <option value="hospitality">Hospitality</option>
            <option value="media">Media</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-ink-soft uppercase">Max Uses</label>
          <input
            type="number"
            min="1" max="1000"
            value={formData.max_uses}
            onChange={(e) => setFormData({...formData, max_uses: parseInt(e.target.value)})}
            className="w-full mt-1 px-3 py-2 border rounded focus:border-ochre text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-ink-soft uppercase">Expires In (Days)</label>
          <input
            type="number"
            min="1" max="365"
            value={formData.expires_days}
            onChange={(e) => setFormData({...formData, expires_days: parseInt(e.target.value)})}
            className="w-full mt-1 px-3 py-2 border rounded focus:border-ochre text-sm"
          />
        </div>
        
        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-navy text-white py-2 rounded-lg font-bold hover:bg-navy/90 disabled:opacity-50"
          >
            {submitting ? 'Generating...' : 'Generate Code'}
          </button>
        </div>
      </form>
    </div>
  );
}
