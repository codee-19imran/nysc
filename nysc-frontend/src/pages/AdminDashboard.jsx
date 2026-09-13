import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, CreditCard, Shield, Settings, 
  LogOut, Menu, X, Bell, UserCheck, Camera, QrCode, GraduationCap, Home, Globe, DollarSign, Mail
} from 'lucide-react';
import { auth as apiAuth } from '../lib/api';
import MyQRModal from '../components/MyQRModal';
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminPapers from '../components/admin/AdminPapers';
import AdminPayments from '../components/admin/AdminPayments';
import AdminAuditLogs from '../components/admin/AdminAuditLogs';
import AdminSettings from '../components/admin/AdminSettings';
import AdminLogistics from '../components/admin/AdminLogistics';
import AdminTeam from '../components/admin/AdminTeam';
import AdminAttendance from '../components/admin/AdminAttendance';
import AdminTechnical from '../components/admin/AdminTechnical';
import AdminHospitality from '../components/admin/AdminHospitality';
import AdminWebsite from '../components/admin/AdminWebsite';
import AdminFinance from '../components/admin/AdminFinance';
import AdminMedia from '../components/admin/AdminMedia';
import AdminContact from '../components/admin/AdminContact';
import AdminIdCards from '../components/admin/AdminIdCards';
import { isAdminRole, getRoleDisplayName } from '../lib/roles';

// Add this helper function at the top of the file (outside the component)
function getDefaultPageForRole(role) {
  const rolePageMap = {
    super_admin: 'overview',
    admin: 'overview',
    logistics_head: 'logistics',
    technical_head: 'technical',
    hospitality_head: 'hospitality',
    media_head: 'media',
    website_head: 'website',
  };
  return rolePageMap[role] || 'overview';
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [showMyQR, setShowMyQR] = useState(false);

  useEffect(() => {
    const currentUser = apiAuth.getUser();
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    
    // ✅ FIXED: Use the helper function instead of hardcoded roles
    if (!isAdminRole(currentUser.role)) {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    setUser(currentUser);

    // ✅ Cache-first: show cached permissions instantly (no flicker/spinner)
    const cachedPerms = apiAuth.getCachedPermissions();
    if (cachedPerms) {
      setUserPermissions(cachedPerms);
    }

    // ✅ Then fetch fresh permissions from backend in background
    apiAuth.getUserPermissions()
      .then(perms => setUserPermissions(perms))
      .catch(err => console.error('Permission fetch failed:', err));
  }, [navigate]);

  const handleLogout = () => {
    apiAuth.logout();
    navigate('/');
    window.location.reload();
  };

  const isSuperAdmin = user?.role === 'super_admin';

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'super_admin', 'logistics_head', 'technical_head', 'hospitality_head', 'media_head', 'website_head'] },
    { id: 'attendance', label: 'Attendance', icon: UserCheck, roles: ['admin', 'super_admin', 'logistics_head'] },
    { id: 'logistics', label: 'Logistics', icon: Settings, roles: ['logistics_head', 'admin', 'super_admin'] },
    { id: 'technical', label: 'Technical', icon: GraduationCap, roles: ['technical_head', 'admin', 'super_admin'] },
    { id: 'hospitality', label: 'Hospitality', icon: Home, roles: ['hospitality_head', 'admin', 'super_admin'] },
    { id: 'media', label: 'Media', icon: Camera, roles: ['media_head', 'admin', 'super_admin'] },
    { id: 'website', label: 'Website', icon: Globe, roles: ['website_head', 'admin', 'super_admin'] },
    { id: 'contact', label: 'Contact Inquiries', icon: Mail, roles: ['admin', 'super_admin'] },
    { id: 'idcards', label: 'ID Cards', icon: CreditCard, roles: ['admin', 'super_admin'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['admin', 'super_admin'] },
    { id: 'papers', label: 'Papers', icon: FileText, roles: ['admin', 'super_admin'] },
    { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['super_admin'] },
    { id: 'finance', label: 'Finance', icon: DollarSign, roles: ['super_admin'] },
    { id: 'audit', label: 'Audit Logs', icon: Shield, roles: ['super_admin'] },
    { id: 'team', label: 'Team', icon: Users, roles: ['admin', 'super_admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'super_admin'] },
  ];

  // Filter nav items based on user role
  const allowedNavItems = navItems.filter(item => item.roles.includes(user?.role));
  const allowedSectionIds = allowedNavItems.map(item => item.id);

  // --- URL-BASED ACTIVE SECTION ---
  // Extract section from URL: /admin/payments -> 'payments'
  const urlSection = location.pathname.split('/')[2];
  
  // Determine active section with smart defaults
  const getActiveSection = () => {
    // If no section in URL, use role-based default
    if (!urlSection) {
      const defaultPage = getDefaultPageForRole(user?.role);
      // Only use default if user has access to it
      if (allowedSectionIds.includes(defaultPage)) {
        return defaultPage;
      }
      return 'overview';
    }
    
    // If section is not allowed, redirect to role-based default
    if (!allowedSectionIds.includes(urlSection)) {
      const defaultPage = getDefaultPageForRole(user?.role);
      if (allowedSectionIds.includes(defaultPage)) {
        return defaultPage;
      }
      return 'overview';
    }
    
    return urlSection;
  };

  const activeSection = getActiveSection();

  // If user tried to access a forbidden section, redirect them
  useEffect(() => {
    if (!user) return;
    
    // If user is on /admin with no section, redirect to their default page
    if (!urlSection || urlSection === '') {
      const defaultPage = getDefaultPageForRole(user.role);
      if (allowedSectionIds.includes(defaultPage) && defaultPage !== 'overview') {
        navigate(`/admin/${defaultPage}`, { replace: true });
      }
    }
    // If user tried to access a forbidden section, redirect to their default
    else if (!allowedSectionIds.includes(urlSection)) {
      const defaultPage = getDefaultPageForRole(user.role);
      const target = allowedSectionIds.includes(defaultPage) ? defaultPage : 'overview';
      navigate(`/admin/${target}`, { replace: true });
    }
  }, [user, urlSection, allowedSectionIds, navigate]);

  const handleNavClick = (sectionId) => {
    navigate(`/admin/${sectionId}`);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': 
        return <AdminOverview userPermissions={userPermissions} user={user} />;
      case 'attendance': return <AdminAttendance />;
      case 'users': return <AdminUsers />;
      case 'papers': return <AdminPapers />;
      case 'payments': return userPermissions.includes('page:payments') ? <AdminPayments /> : <AccessDenied />;
      case 'audit': return userPermissions.includes('page:audit') ? <AdminAuditLogs /> : <AccessDenied />;
      case 'settings': return <AdminSettings />;
      case 'logistics': return userPermissions.includes('page:logistics') ? <AdminLogistics /> : <AccessDenied />;
      case 'technical': return userPermissions.includes('page:technical') ? <AdminTechnical /> : <AccessDenied />;
      case 'hospitality': return userPermissions.includes('page:hospitality') ? <AdminHospitality /> : <AccessDenied />;
      case 'media': return userPermissions.includes('page:media') ? <AdminMedia /> : <AccessDenied />;
      case 'website': return userPermissions.includes('page:website') ? <AdminWebsite /> : <AccessDenied />;
      case 'contact': return userPermissions.includes('page:overview') ? <AdminContact /> : <AccessDenied />;
      case 'idcards': return userPermissions.includes('page:overview') ? <AdminIdCards /> : <AccessDenied />;
      case 'finance': return user.role === 'super_admin' ? <AdminFinance /> : <AccessDenied />;
      case 'team': return userPermissions.includes('admin:manage') ? <AdminTeam /> : <AccessDenied />;
      default: return <AdminOverview userPermissions={userPermissions} user={user} />;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-atmosphere flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-navy text-white rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-navy text-white transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-display font-bold">NYSC-2026</h1>
            <p className="text-sm text-white/60 mt-1">Admin Dashboard</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {allowedNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-ochre text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="mb-3">
              <p className="text-base font-medium">{user.name}</p>
              <p className="text-sm text-white/60 capitalize">{getRoleDisplayName(user.role)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-base text-white/70 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-ink/10 pl-16 lg:pl-6 pr-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-navy capitalize">
              {activeSection === 'audit' ? 'Audit Logs' : activeSection}
            </h2>
            <p className="text-sm sm:text-base text-ink-soft mt-1">
              {activeSection === 'overview' && 'Live conference statistics'}
              {activeSection === 'attendance' && 'Monitor event check-ins and meals'}
              {activeSection === 'users' && 'Manage delegates and admins'}
              {activeSection === 'papers' && 'Review and manage paper submissions'}
              {activeSection === 'payments' && 'Financial transactions and reports'}
              {activeSection === 'technical' && 'Manage sessions, papers, and judges'}
              {activeSection === 'hospitality' && 'Manage guests, meals, and protocol'}
              {activeSection === 'website' && 'Manage website content and registrations'}
              {activeSection === 'finance' && 'Manage budgets, expenditures, and procurements'}
              {activeSection === 'audit' && 'System activity and security logs'}
              {activeSection === 'settings' && 'Conference configuration'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMyQR(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-navy border border-ochre/30 rounded-lg hover:bg-ochre/5 transition-colors"
              title="View my personal QR code"
            >
              <QrCode className="w-4 h-4 text-ochre" />
              <span className="hidden md:inline">My QR</span>
            </button>
            <button 
              onClick={() => navigate('/admin/scanner')}
              className="flex items-center gap-2 px-4 py-2 bg-ochre text-white rounded-lg hover:bg-ochre-dark transition-colors shadow-sm font-medium"
            >
              <Camera className="w-5 h-5" />
              <span className="hidden sm:inline">Launch Scanner</span>
            </button>
            <button className="relative p-2 text-ink-soft hover:text-navy transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        <div className="p-6">
          {renderContent()}
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modal */}
      {showMyQR && <MyQRModal onClose={() => setShowMyQR(false)} />}
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
      <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-2xl font-display font-bold text-navy mb-2">Access Denied</h3>
      <p className="text-base text-ink-soft">You don't have permission to view this section.</p>
    </div>
  );
}
