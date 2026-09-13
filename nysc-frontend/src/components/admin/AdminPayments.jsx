import { useState, useEffect } from 'react';
import { Search, Download, DollarSign, CheckCircle, Clock, XCircle, RefreshCw, TrendingUp, CreditCard } from 'lucide-react';
import { request } from '../../lib/api';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const [paymentsData, statsData] = await Promise.all([
        request(`/admin/payments?limit=100&status=${filterStatus !== 'all' ? filterStatus : ''}&search=${searchTerm}`),
        request('/admin/payments/stats')
      ]);
      setPayments(paymentsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('nysc_token');
      const response = await fetch('http://127.0.0.1:8000/admin/payments/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-700',
      created: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'created':
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'refunded': return <RefreshCw className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  if (loading || !stats) {
    return <div className="text-center py-12">Loading payment data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${stats.total_revenue.toLocaleString('en-IN')}`}
          icon={DollarSign}
          color="bg-green-500"
          subtitle={`${stats.successful} successful transactions`}
        />
        <StatCard
          title="Success Rate"
          value={`${stats.success_rate}%`}
          icon={TrendingUp}
          color="bg-blue-500"
          subtitle={`Avg ticket: ₹${stats.average_ticket.toLocaleString('en-IN')}`}
        />
        <StatCard
          title="Pending Payments"
          value={stats.pending}
          icon={Clock}
          color="bg-yellow-500"
          subtitle="Awaiting completion"
        />
        <StatCard
          title="Failed/Refunded"
          value={stats.failed + stats.refunded}
          icon={XCircle}
          color="bg-red-500"
          subtitle={`${stats.failed} failed, ${stats.refunded} refunded`}
        />
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-soft" />
            <input
              type="text"
              placeholder="Search by name, email, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="w-full pl-10 pr-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-ink/15 rounded-lg focus:outline-none focus:border-ochre"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="created">Created (Awaiting)</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-ink/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap min-w-[800px] md:min-w-0 md:whitespace-normal">
            <thead className="bg-atmosphere border-b border-ink/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Date</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">User</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-ink-soft">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {payments.map(payment => (
                <tr key={payment.id} className="hover:bg-atmosphere/50 transition-colors">
                  <td className="px-6 py-4 text-base text-ink-soft">
                    {new Date(payment.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-base font-medium text-navy">{payment.user_name || 'Unknown'}</p>
                      <p className="text-sm text-ink-soft">{payment.user_email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-atmosphere px-2 py-1 rounded">{payment.order_id}</code>
                  </td>
                  <td className="px-6 py-4 text-base font-bold text-navy">
                    ₹{(payment.amount / 100).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold rounded-full ${getStatusBadge(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <div className="text-center py-12 text-ink-soft">No payments found</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base text-ink-soft mb-1">{title}</p>
          <p className="text-4xl font-display font-bold text-navy">{value}</p>
          {subtitle && <p className="text-sm text-ink-soft mt-2">{subtitle}</p>}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
