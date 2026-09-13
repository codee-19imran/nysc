import { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, MoreVertical, Eye, 
  XCircle, CheckCircle, Edit2, X 
} from 'lucide-react';
import { request, auth as apiAuth } from '../../lib/api';

function getDepartmentDisplay(user) {
  const role = user.role;
  
  // Department heads: derive from role name
  if (role?.includes('_head')) {
    const dept = role.replace('_head', '').replace('_', ' ');
    return dept; // e.g., "logistics", "technical", "hospitality"
  }
  
  // Volunteers/Committee members: use assigned department
  if (['volunteer', 'committee_member'].includes(role) && user.department) {
    return user.department;
  }
  
  // Paper reviewers/admins: show specialized domain
  if (user.specialized_domain) {
    return user.specialized_domain;
  }
  
  // Everyone else: show nothing
  return '—';
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null); // Track open dropdown
  const [viewingUser, setViewingUser] = useState(null); // For Details Modal
  const [editingUser, setEditingUser] = useState(null); // For Role Change Modal
  
  const currentUser = apiAuth.getUser();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await request('/admin/users'); // Adjust endpoint if needed
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.is_active ? 0 : 1;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

    try {
      await request(`/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: newStatus })
      });
      fetchUsers(); // Refresh list
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await request(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Department', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(u => [
        `"${u.name}"`,
        `"${u.email}"`,
        `"${u.role}"`,
        `"${getDepartmentDisplay(u)}"`,
        `"${u.is_active ? 'Active' : 'Inactive'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'users_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) return <div className="text-center py-12">Loading users...</div>;

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-ink/15 rounded-lg bg-white focus:border-ochre outline-none"
          />
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-ink/10 overflow-x-auto">
        <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
          <thead className="bg-atmosphere border-b border-ink/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">User</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Role</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Department</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase text-ink-soft">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-atmosphere/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-navy">{user.name}</p>
                  <p className="text-xs text-ink-soft">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 capitalize">
                    {user.role?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-ink-soft capitalize">
                  {getDepartmentDisplay(user)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === user.id ? null : user.id);
                    }}
                    className="p-1.5 text-ink-soft hover:text-navy hover:bg-atmosphere rounded-full transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {activeMenu === user.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-ink/10 z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingUser(user); setActiveMenu(null); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-atmosphere flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> View Details
                      </button>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(user); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-atmosphere flex items-center gap-2"
                      >
                        {user.is_active ? (
                          <><XCircle className="w-4 h-4 text-red-600" /> Deactivate</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 text-green-600" /> Activate</>
                        )}
                      </button>
                      
                      {currentUser?.role === 'super_admin' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingUser(user); setActiveMenu(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-navy hover:bg-atmosphere flex items-center gap-2 border-t border-ink/10 mt-1 pt-2"
                        >
                          <Edit2 className="w-4 h-4" /> Change Role
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No users found matching your search.</div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. View Details Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button onClick={() => setViewingUser(null)} className="absolute top-4 right-4 p-1 hover:bg-atmosphere rounded">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-display font-bold text-navy mb-4">User Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink-soft">Name</span>
                <span className="font-bold text-navy">{viewingUser.name}</span>
              </div>
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink-soft">Email</span>
                <span className="font-medium text-navy">{viewingUser.email}</span>
              </div>
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink-soft">Phone</span>
                <span className="font-medium text-navy">{viewingUser.phone || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink-soft">Role</span>
                <span className="font-medium text-navy capitalize">{viewingUser.role?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-ink/10 pb-2">
                <span className="text-ink-soft">Department</span>
                <span className="font-medium text-navy capitalize">{getDepartmentDisplay(viewingUser)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-ink-soft">Status</span>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${viewingUser.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {viewingUser.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Change Role Modal (Super Admin Only) */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 relative">
            <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 p-1 hover:bg-atmosphere rounded">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-display font-bold text-navy mb-2">Change Role</h3>
            <p className="text-sm text-ink-soft mb-4">Updating role for <strong>{editingUser.name}</strong></p>
            
            <select 
              className="w-full px-4 py-2 border border-ink/15 rounded-lg mb-4 focus:border-ochre outline-none"
              defaultValue={editingUser.role}
              onChange={(e) => handleRoleChange(editingUser.id, e.target.value)}
            >
              <option value="delegate">Delegate</option>
              <option value="presenter">Presenter</option>
              <option value="volunteer">Volunteer</option>
              <option value="committee_member">Committee Member</option>
              <option value="logistics_head">Logistics Head</option>
              <option value="technical_head">Technical Head</option>
              <option value="hospitality_head">Hospitality Head</option>
              <option value="media_head">Media Head</option>
              <option value="website_head">Website Head</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            
            <div className="flex justify-end">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm font-bold text-navy hover:bg-atmosphere rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
