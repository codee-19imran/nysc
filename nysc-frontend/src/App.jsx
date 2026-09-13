import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth as apiAuth } from './lib/api';
import { isAdminRole } from './lib/roles';

// Pages
import Home from './pages/Landing';
import Login from './pages/Login';
import Registration from './pages/Registration';
import DelegateDashboard from './pages/DelegateDashboard';
import VolunteerRegister from './pages/VolunteerRegister';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import AcceptInvite from './pages/AcceptInvite';
import VolunteerScanner from './pages/VolunteerScanner';
import AdminScanner from './pages/AdminScanner';
import NewsFeed from './pages/NewsFeed';
import FormRenderer from './pages/FormRenderer';

import Overview from './pages/Overview';
import PatronsPage from './pages/PatronsPage';
import CommitteePage from './pages/CommitteePage';
import Contact from './pages/Contact';
import Schedule from './pages/Schedule';
import Speakers from './pages/Speakers';
import Guidelines from './pages/Guidelines';
import VenuePage from './pages/VenuePage';
import ComingSoon from './pages/ComingSoon';

// Layout
import Layout from './components/Layout';

// Protected Route Wrappers
function ProtectedRoute({ children }) {
  const user = apiAuth.getUser();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

function ProtectedAdminRoute({ children }) {
  const user = apiAuth.getUser();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // ✅ FIXED: Use the helper function
  if (!isAdminRole(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function PublicRoute({ children }) {
  const user = apiAuth.getUser();
  
  // If already logged in, redirect based on role
  if (user) {
    if (isAdminRole(user.role)) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      
      {/* Website CMS routes */}
      <Route path="/news" element={<Layout><NewsFeed /></Layout>} />
      <Route path="/form/:formId" element={<Layout><FormRenderer /></Layout>} />
      
      {/* Other Info Pages */}
      <Route path="/overview" element={<Layout><Overview /></Layout>} />
      <Route path="/patrons" element={<Layout><PatronsPage /></Layout>} />
      <Route path="/committee" element={<Layout><CommitteePage /></Layout>} />
      <Route path="/contact" element={<Layout><Contact /></Layout>} />
      <Route path="/schedule" element={<Layout><Schedule /></Layout>} />
      <Route path="/speakers" element={<Layout><Speakers /></Layout>} />
      <Route path="/guidelines" element={<Layout><Guidelines /></Layout>} />
      <Route path="/venue" element={<Layout><VenuePage /></Layout>} />
      <Route path="/coming-soon" element={<Layout><ComingSoon /></Layout>} />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Layout><Registration /></Layout>
        </PublicRoute>
      } />

      {/* Public volunteer registration */}
      <Route path="/volunteer/register" element={
        <PublicRoute>
          <VolunteerRegister />
        </PublicRoute>
      } />

      {/* Protected delegate routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><DelegateDashboard /></Layout>
        </ProtectedRoute>
      } />

      {/* Protected volunteer dashboard */}
      <Route path="/volunteer/dashboard" element={
        <ProtectedRoute>
          <VolunteerDashboard />
        </ProtectedRoute>
      } />

      {/* Protected admin routes - ALL sub-paths handled by AdminDashboard */}
      <Route path="/admin/invite/accept" element={<AcceptInvite />} />
      <Route path="/admin" element={
        <ProtectedAdminRoute>
          <AdminDashboard />
        </ProtectedAdminRoute>
      } />
      {/* Admin Scanner must come before /admin/* */}
      <Route path="/admin/scanner" element={
        <ProtectedAdminRoute>
          <AdminScanner />
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedAdminRoute>
          <AdminDashboard />
        </ProtectedAdminRoute>
      } />

      {/* Volunteer Scanner */}
      <Route 
        path="/volunteer/scanner" 
        element={
          <ProtectedRoute>
            <VolunteerScanner />
          </ProtectedRoute>
        } 
      />

      {/* 404 - No Layout wrapper (clean 404 page) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
