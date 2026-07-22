'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  DollarSign, 
  Award, 
  Ticket, 
  Bell, 
  Utensils, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert,
  Link2,
  Wallet
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
  { name: 'Payments', href: '/dashboard/payments', icon: DollarSign },
  { name: 'Sponsors', href: '/dashboard/sponsors', icon: Award },
  { name: 'Referral Codes', href: '/dashboard/promo-codes', icon: Ticket },
  { name: 'Referral Tracking', href: '/dashboard/referral-tracking', icon: Link2 },
  { name: 'Sponsor Payments', href: '/dashboard/sponsor-payments', icon: Wallet },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Meals', href: '/dashboard/meals', icon: Utensils },
  { name: 'Logs & Audits', href: '/dashboard/logs', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Initializing admin panel...</p>
      </div>
    );
  }

  if (!admin) {
    return null; // Let the redirect in AuthContext handle it
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-container">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div style={styles.mobileOverlay} onClick={toggleSidebar}></div>
      )}

      {/* Sidebar Component */}
      <aside 
        style={{
          ...styles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : undefined
        }}
        className={sidebarOpen ? 'sidebar-open' : ''}
      >
        <div style={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <img src="/logo.png" alt="AI Meal Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={styles.sidebarBrand}>AI MEAL ADMIN</span>
          </div>
          <button style={styles.closeSidebarBtn} onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.name} 
                href={item.href}
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {})
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} style={isActive ? styles.iconActive : styles.icon} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={logout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="main-content">
        {/* Top Navbar */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.menuBtn} onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            <h2 style={styles.headerTitle}>
              {navItems.find(item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))?.name || 'Admin'}
            </h2>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.adminInfo}>
              {/* <span style={styles.adminEmail}>{admin.email}</span> */}
              <span 
                className={`badge ${
                  admin.role === 'super_admin' ? 'badge-error' : 'badge-info'
                }`}
                style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
              >
                {admin.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className="content-body animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-app)',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid #E2E8F0',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  sidebar: {
    width: 'var(--sidebar-width)',
    backgroundColor: 'var(--bg-sidebar)',
    color: 'var(--text-light)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    transition: 'transform var(--transition-normal)',
  },
  sidebarHeader: {
    height: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  sidebarBrand: {
    fontWeight: 800,
    fontSize: '1.1rem',
    letterSpacing: '0.05em',
    color: 'var(--primary-light)',
  },
  closeSidebarBtn: {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.6)',
    display: 'none',
    cursor: 'pointer',
  },
  nav: {
    flexGrow: 1,
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    overflowY: 'auto',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all var(--transition-fast)',
  },
  navLinkActive: {
    backgroundColor: 'var(--bg-sidebar-active)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.25)',
  },
  icon: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  iconActive: {
    color: 'white',
  },
  sidebarFooter: {
    padding: '1.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.625rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  header: {
    height: 'var(--header-height)',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 90,
    boxShadow: 'var(--shadow-sm)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  menuBtn: {
    background: 'transparent',
    color: 'var(--text-primary)',
    display: 'none',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-dark)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  adminInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  adminEmail: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(2px)',
    zIndex: 99,
  },
};
