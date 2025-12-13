'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from './logoutbutton';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
    fetchUser();
  }, [router]);

  return (
    <>
      {/* Background system matching main app */}
      <div className="bg-base" aria-hidden />
      <div className="bg-anim" aria-hidden>
        <span
          className="bubble b-pink"
          style={{ "--sz": "520px", "--x": "10%", "--y": "-6%", "--d": "18s" } as any}
        />
        <span
          className="bubble b-blue"
          style={{ "--sz": "620px", "--x": "82%", "--y": "-12%", "--d": "22s" } as any}
        />
        <span
          className="bubble b-green"
          style={{ "--sz": "460px", "--x": "14%", "--y": "76%", "--d": "20s" } as any}
        />
        <span
          className="bubble b-neon"
          style={{ "--sz": "540px", "--x": "86%", "--y": "78%", "--d": "19s" } as any}
        />
        <span
          className="bubble b-purple"
          style={{ "--sz": "360px", "--x": "48%", "--y": "16%", "--d": "16s" } as any}
        />
        <span
          className="bubble b-amber"
          style={{ "--sz": "320px", "--x": "58%", "--y": "54%", "--d": "21s" } as any}
        />
        <span
          className="bubble b-cyan"
          style={{ "--sz": "340px", "--x": "30%", "--y": "52%", "--d": "17s" } as any}
        />
        <span
          className="bubble b-magenta"
          style={{ "--sz": "300px", "--x": "72%", "--y": "32%", "--d": "15s" } as any}
        />
      </div>

      {/* Sidebar - Outside scrollable container */}
      <aside 
        className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="dashboard-brand">Chefora</div>
        <nav className="dashboard-nav">
          <Link 
            href="/dashboard" 
            className={`dashboard-nav-link ${pathname === '/dashboard' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            href="/" 
            className={`dashboard-nav-link ${pathname === '/' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Recipes
          </Link>
          <Link 
            href="/ai-recipes" 
            className={`dashboard-nav-link ${pathname === '/ai-recipes' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            AI Recipe Generator
          </Link>
          <Link 
            href="/pantry" 
            className={`dashboard-nav-link ${pathname === '/pantry' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Pantry
          </Link>
          <Link 
            href="/shopping-list" 
            className={`dashboard-nav-link ${pathname === '/shopping-list' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Shopping List
          </Link>
          <Link 
            href="/meal-planner" 
            className={`dashboard-nav-link ${pathname === '/meal-planner' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Meal Planner
          </Link>
          <Link 
            href="/community" 
            className={`dashboard-nav-link ${pathname === '/community' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Community
          </Link>
          <Link 
            href="/settings" 
            className={`dashboard-nav-link ${pathname === '/settings' ? 'dashboard-nav-link-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Settings
          </Link>
        </nav>
      </aside>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="dashboard-sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Hamburger Menu Button */}
      <button 
        className="dashboard-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <span className={`hamburger-line ${sidebarOpen ? 'active' : ''}`}></span>
        <span className={`hamburger-line ${sidebarOpen ? 'active' : ''}`}></span>
        <span className={`hamburger-line ${sidebarOpen ? 'active' : ''}`}></span>
      </button>

      <div className="dashboard-layout layer-content">
        {/* Main Content */}
        <main className="dashboard-main">
          {/* Top Header */}
          <header className="dashboard-top-header">
            {/* Logo - Centered in header */}
            <div className="dashboard-logo-center-screen">
              <Link href="/dashboard">
                <Image
                  src="/assets/chefora-logo.svg"
                  alt="Chefora Logo"
                  width={80}
                  height={80}
                  className="dashboard-header-logo"
                  priority
                />
              </Link>
            </div>
            <div className="dashboard-search-wrapper">
              <div className="inputIcon" style={{ flex: 1 }}>
                <i>🔎</i>
                <input
                  className="input"
                  placeholder="Search or ask Chefora anything…"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                {searchValue && (
                  <button 
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(230, 237, 246, 0.6)',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    onClick={() => setSearchValue('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="dashboard-user-section">
              <button className="btn ghost tap-ripple dashboard-theme-toggle">☾</button>
              <div className="dashboard-user-info">
                <div className="dashboard-user-details">
                  <div className="dashboard-user-name">{user?.name || 'User'}</div>
                  <div className="dashboard-user-email">{user?.email || ''}</div>
                </div>
                <div className="dashboard-user-avatar" />
                <LogoutButton />
              </div>
            </div>
          </header>

          {/* Page Content */}
          {children}
        </main>
      </div>
    </>
  );
}

