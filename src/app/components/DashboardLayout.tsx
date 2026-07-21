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
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          
          if (data.user?.id) {
            try {
              const profileRes = await fetch(`/api/community/profile?userId=${data.user.id}`);
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                setUsername(profileData.username);
                setAvatarUrl(profileData.avatar_url);
              }
            } catch (error) {
              console.error('Failed to fetch profile:', error);
            }
          }
        } else if (res.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
    fetchUser();
  }, [router]);

  useEffect(() => {
    async function fetchNotificationCount() {
      try {
        const res = await fetch('/api/community/notifications/count', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    }

    if (user) {
      fetchNotificationCount();
      
      const interval = setInterval(fetchNotificationCount, 5000);
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchNotificationCount();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      const handleNotificationsRead = () => {
        fetchNotificationCount();
      };
      window.addEventListener('notifications-read', handleNotificationsRead);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('notifications-read', handleNotificationsRead);
      };
    }
  }, [user]);

  return (
    <>
      {}
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

      {}
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
            style={{ position: 'relative' }}
          >
            <span>Community</span>
            {notificationCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '12px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                border: '2px solid var(--bg)',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                zIndex: 10
              }}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
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

      {}
      {sidebarOpen && (
        <div 
          className="dashboard-sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}
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
        {}
        <main className="dashboard-main">
          {}
          <header className="dashboard-top-header">
            {}
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
                  {username ? (
                    <Link 
                      href={`/community/u/${username}`}
                      className="dashboard-user-name"
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                    >
                      {user?.name || 'User'}
                    </Link>
                  ) : (
                    <div className="dashboard-user-name">{user?.name || 'User'}</div>
                  )}
                  <div className="dashboard-user-email">{user?.email || ''}</div>
                </div>
                {username ? (
                  <Link 
                    href={`/community/u/${username}`}
                    className="dashboard-user-avatar"
                    style={{ cursor: 'pointer', textDecoration: 'none', display: 'block', position: 'relative', overflow: 'hidden' }}
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={user?.name || 'User avatar'}
                        width={36}
                        height={36}
                        style={{ objectFit: 'cover', borderRadius: '50%' }}
                        unoptimized
                      />
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="dashboard-user-avatar">
                    {user?.name && (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <LogoutButton />
              </div>
            </div>
          </header>

          {}
          {children}
        </main>
      </div>
    </>
  );
}
