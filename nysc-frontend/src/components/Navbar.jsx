import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronDown, Menu, X, QrCode } from 'lucide-react';

import { auth as apiAuth } from '../lib/api';
import { isAdminRole } from '../lib/roles';
import MyQRModal from './MyQRModal';

export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);

  const navigate = useNavigate();
  const isLoggedIn = apiAuth.isAuthenticated();
  const user = apiAuth.getUser();
  const isAdmin = isAdminRole(user?.role);
  const isVolunteer = user?.role === 'volunteer' || user?.role === 'committee_member';

  const handleLogout = () => {
    apiAuth.logout();
    navigate('/'); // Redirect to home
    window.location.reload(); // Force navbar to update
  };

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'News', href: '/news' },
    {
      label: 'About',
      children: [
        { label: 'Conference Overview', href: '/overview' },
        { label: 'Patrons', href: '/patrons' },
        { label: 'Organizing Committee', href: '/committee' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      label: 'Program',
      children: [
        { label: 'Technical Schedule', href: '/schedule' },
        { label: 'Invited Speakers', href: '/speakers' },
      ],
    },
    {
      label: 'Authors',
      children: [
        { label: 'Call for Papers', href: '/#cfp' },
        { label: 'Submission Guidelines', href: '/guidelines' },
      ],
    },
    {
      label: 'Attend',
      children: [
        { label: 'Registration', href: '/register' },
        { label: 'Venue', href: '/venue' },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950 shadow-md border-b border-white/5">
      <div className="mx-auto flex flex-col w-full max-w-7xl">
        
        {/* Top Tier: Logo & Sponsors */}
        <div className="flex flex-row items-center justify-between px-6 py-4">
          {/* Logo and Details */}
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/" className="flex items-center gap-4 group">
              <img src="/logo.jpeg" alt="NYSC 2026 Logo" className="h-16 w-16 object-cover rounded-full border border-white/20 transition-opacity group-hover:opacity-90" />
              <div className="flex flex-col justify-center">
                <span className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white block leading-tight">
                  NYSC&ndash;2026
                </span>
                <span className="font-body font-bold text-amber-500 text-[10px] md:text-xs mt-1 uppercase tracking-widest">
                  Dec 17-18, 2026 | RANCHI
                </span>
              </div>
            </Link>
          </div>

          {/* Sponsor Logos (Grayscale by default) */}
          <div className="hidden md:flex items-center justify-end gap-6">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/bd/Indian_Space_Research_Organisation_Logo.svg" alt="ISRO" className="h-10 object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300" />
            <img src="https://jigyasa.iirs.gov.in/img/logo-yuvika.png" alt="YUVIKA" className="h-10 object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300" />
            <img src="/cuk_logo.jpeg" alt="CUK" className="h-10 object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300 rounded-sm" />
            <img src="/tws.png" alt="Taurian School" className="h-10 object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300" />
          </div>
        </div>

        {/* Bottom Tier: Navigation */}
        <div className="flex items-center justify-between px-6 py-2 border-t border-white/5">
          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden w-full justify-between items-center">
            <div className="flex md:hidden items-center gap-3">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/bd/Indian_Space_Research_Organisation_Logo.svg" alt="ISRO" className="h-6 object-contain grayscale" />
              <img src="/cuk_logo.jpeg" alt="CUK" className="h-6 object-contain grayscale rounded-sm" />
            </div>
            <button
              className="text-white hover:text-amber-500 p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            {navItems.map((item) => (
              <div key={item.label} className="group relative">
                {item.children ? (
                  <button className="flex items-center gap-1 py-2 font-body text-sm font-medium text-white/80 hover:text-white transition-colors">
                    {item.label}
                    <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180 opacity-70" />
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    className="flex items-center py-2 font-body text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                )}

                {/* Dropdown Menu */}
                {item.children && (
                  <div className="absolute top-full left-0 hidden w-56 flex-col bg-slate-900 border border-white/10 shadow-xl py-2 group-hover:flex z-50 rounded-md">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="px-4 py-2 font-body text-sm font-medium text-white/80 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => setShowMyQR(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors border border-white/20 rounded-md hover:bg-white/5"
                  title="View my personal QR code"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden xl:inline">My QR</span>
                </button>
                {isAdmin ? (
                  <button 
                    onClick={() => navigate('/admin')} 
                    className="text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors"
                  >
                    Admin
                  </button>
                ) : isVolunteer ? (
                  <>
                    <button 
                      onClick={() => navigate('/volunteer/dashboard')} 
                      className="text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors"
                    >
                      Dashboard
                    </button>
                    <button 
                      onClick={() => navigate('/volunteer/scanner')} 
                      className="text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors"
                    >
                      Scanner
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => navigate('/dashboard')} 
                    className="text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors"
                  >
                    Dashboard
                  </button>
                )}
                <button onClick={handleLogout} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors">
                  Log In
                </Link>
                <Link to="/register" className="bg-white text-slate-950 px-4 py-2 rounded-md font-body font-bold text-sm hover:bg-gray-100 transition-colors">
                  Register Now
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-navy border-t border-white/10 shadow-xl pb-4">
            <nav className="flex flex-col px-6 py-2">
              {navItems.map((item) => (
                <div key={item.label} className="py-2">
                  {item.children ? (
                    <div className="space-y-1">
                      <div className="font-body text-sm font-bold text-white uppercase tracking-wider mb-2">
                        {item.label}
                      </div>
                      <div className="flex flex-col pl-4 border-l border-white/20 space-y-2">
                        {item.children.map((child) => (
                          <Link
                            key={child.label}
                            to={child.href}
                            className="font-body text-sm font-medium text-white/80 hover:text-ochre transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className="font-body text-sm font-bold text-white hover:text-ochre uppercase tracking-wider transition-colors block py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}

              <div className="flex flex-col gap-3 mt-6 border-t border-white/10 pt-6">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => { setShowMyQR(true); setMobileMenuOpen(false); }}
                      className="flex items-center justify-center gap-2 bg-ochre/20 text-white border border-ochre/50 text-center px-4 py-3 rounded-xl font-body font-bold text-sm hover:bg-ochre/30 transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      My Personal QR
                    </button>
                    {isAdmin ? (
                      <button
                        onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}
                        className="bg-white text-navy text-center px-4 py-3 rounded-xl font-body font-bold text-sm hover:bg-atmosphere transition-colors"
                      >
                        Admin Dashboard
                      </button>
                    ) : isVolunteer ? (
                      <>
                        <button
                          onClick={() => { navigate('/volunteer/dashboard'); setMobileMenuOpen(false); }}
                          className="bg-white text-navy text-center px-4 py-3 rounded-xl font-body font-bold text-sm hover:bg-atmosphere transition-colors"
                        >
                          My Dashboard
                        </button>
                        <button
                          onClick={() => { navigate('/volunteer/scanner'); setMobileMenuOpen(false); }}
                          className="bg-white text-navy text-center px-4 py-3 rounded-xl font-body font-bold text-sm hover:bg-atmosphere transition-colors"
                        >
                          Scanner
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                        className="bg-white text-navy text-center px-4 py-3 rounded-xl font-body font-bold text-sm hover:bg-atmosphere transition-colors"
                      >
                        Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="bg-red-600 text-white text-center px-4 py-3 rounded-xl font-body font-bold text-sm hover:bg-red-700 transition-colors"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-white text-center px-4 py-3 rounded-xl font-body font-bold text-sm border border-white/20 hover:bg-white/5 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      to="/register"
                      className="bg-white text-navy text-center px-4 py-3 rounded-xl font-body font-bold text-sm hover:bg-atmosphere transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Register Now
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* My QR Modal */}
      {showMyQR && <MyQRModal onClose={() => setShowMyQR(false)} />}
    </header>
  );
}
