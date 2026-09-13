import { useState, useEffect } from 'react';
import { Search, Filter, Shield, AlertTriangle, User, FileText, CreditCard, Settings } from 'lucide-react';
import { request } from '../../lib/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
    fetchActions();
  }, [filterAction]);

  const fetchLogs = async () => {
    try {
      const data = await request(`/admin/audit-logs?limit=200&action=${filterAction !== 'all' ? filterAction : ''}`);
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActions = async () => {
    try {
      const data = await request('/admin/audit-logs/actions');
      setActions(data);
    } catch (err) {
      console.error('Failed to fetch actions:', err);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('user')) return <User className="w-4 h-4" />;
    if (action.includes('paper') || action.includes('review')) return <FileText className="w-4 h-4" />;
    if (action.includes('payment')) return <CreditCard className="w-4 h-4" />;
    if (action.includes('settings')) return <Settings className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const getActionColor = (action) => {
    if (action.includes('delete') || action.includes('reject')) return 'bg-red-100 text-red-700';
    if (action.includes('create') || action.includes('accept') || action.includes('success')) return 'bg-green-100 text-green-700';
    if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-700';
    if (action.includes('login') || action.includes('auth')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.admin_email?.toLowerCase().includes(search) ||
      log.ip_address?.includes(search) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="text-center py-12">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <div className="bg-gradient-to-r from-navy/5 to-transparent border border-navy/20 rounded-xl p-6 flex items-start gap-4">
        <Shield className="w-8 h-8 text-navy flex-shrink-0" />
        <div>
          <h3 className="text-base font-bold text-navy mb-1">Immutable Audit Trail</h3>
          <p className="text-sm text-ink-soft">
            These logs are cryptographically protected and cannot be modified or deleted. 
            Every administrative action is permanently recorded for security and compliance.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
            <input
              type="text"
              placeholder="Search by action, admin, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
          >
            <option value="all">All Actions</option>
            {actions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
            <thead className="bg-atmosphere border-b border-ink/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Timestamp</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Admin</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Action</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Target</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">IP Address</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-atmosphere/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-ink-soft whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-base text-navy">{log.admin_email || 'System'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold rounded-full ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-base text-ink-soft">
                    {log.target_type ? (
                      <code className="text-sm bg-atmosphere px-2 py-1 rounded">
                        {log.target_type}:{log.target_id?.slice(0, 8)}
                      </code>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-ink-soft">{log.ip_address || '-'}</code>
                  </td>
                  <td className="px-6 py-4">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-ochre hover:underline">View</summary>
                        <pre className="mt-2 p-2 bg-atmosphere rounded text-sm overflow-auto max-w-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No audit logs found</div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-atmosphere/50 rounded-xl p-4 text-sm text-ink-soft text-center">
        Showing {filteredLogs.length} of {logs.length} audit log entries
      </div>
    </div>
  );
}
