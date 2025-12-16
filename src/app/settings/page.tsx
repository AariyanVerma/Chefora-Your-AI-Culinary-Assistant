'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from '@/app/components/logoutbutton';

interface User {
  id: string;
  name: string;
  email: string;
  country: string | null;
  time_zone: string | null;
  cook_frequency: string | null;
  created_at: Date;
}

interface Profile {
  dietary_profile: string | null;
  allergies: string[] | null;
  skill_level: string | null;
  kitchen_tools: string[] | null;
  favorite_cuisines: string[] | null;
  max_prep_time_minutes: number | null;
  persona: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRecipes: 0,
    streak: 0,
  });
  const [recentPages, setRecentPages] = useState<Array<{
    path: string;
    title: string;
    icon: string;
    visited_at: Date;
    postImageUrl?: string | null;
    isPost?: boolean;
  }>>([]);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [cookFrequency, setCookFrequency] = useState('');
  
  // Profile form states
  const [dietaryProfile, setDietaryProfile] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [kitchenTools, setKitchenTools] = useState<string[]>([]);
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);
  const [maxPrepTime, setMaxPrepTime] = useState<number | null>(null);
  const [persona, setPersona] = useState('');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchUserData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await fetch('/api/dashboard/data');
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalRecipes: data.stats?.totalRecipes || 0,
          streak: data.stats?.streak || 0,
        });
        setRecentPages(data.recentPages || []);
        
        // Fetch community profile for avatar
        if (data.user?.id) {
          try {
            const profileRes = await fetch(`/api/community/profile?userId=${data.user.id}`);
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              setUsername(profileData.username || null);
              setAvatarUrl(profileData.avatar_url || null);
            }
          } catch (err) {
            console.error('Error fetching community profile:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }

  async function fetchUserData() {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/user-data');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfile(data.profile || null);
        
        // Populate form fields
        if (data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setCountry(data.user.country || '');
          setTimeZone(data.user.time_zone || '');
          setCookFrequency(data.user.cook_frequency || '');
        }
        
        if (data.profile) {
          setDietaryProfile(data.profile.dietary_profile || '');
          setAllergies(data.profile.allergies || []);
          setSkillLevel(data.profile.skill_level || '');
          setKitchenTools(data.profile.kitchen_tools || []);
          setFavoriteCuisines(data.profile.favorite_cuisines || []);
          setMaxPrepTime(data.profile.max_prep_time_minutes || null);
          setPersona(data.profile.persona || '');
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to load user data' });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMessage({ type: 'error', text: 'Error loading user data' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          country: country || null,
          timeZone: timeZone || null,
          cookFrequency: cookFrequency || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Profile updated successfully!' });
        await fetchUserData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Error updating profile' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUserProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/update-user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietaryProfile: dietaryProfile || null,
          allergies,
          skillLevel: skillLevel || null,
          kitchenTools,
          favoriteCuisines,
          maxPrepTimeMinutes: maxPrepTime || null,
          persona: persona || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'User profile updated successfully!' });
        await fetchUserData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update user profile' });
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      setMessage({ type: 'error', text: 'Error updating user profile' });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Password changed successfully!' });
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Error changing password' });
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-layout layer-content">
        <div className="dashboard-loading">Loading settings...</div>
      </div>
    );
  }

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
      </div>

      {/* Sidebar - Outside scrollable container */}
      <aside 
        className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
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
          
          {/* Recent Activity Section */}
          <div className="dashboard-sidebar-section">
            <div className="dashboard-sidebar-section-header">
              <span>Recent</span>
            </div>
            <div className="dashboard-recent-items">
              {recentPages.map((page, index) => (
                <Link
                  key={index}
                  href={page.path}
                  className="dashboard-recent-item"
                  onClick={() => setSidebarOpen(false)}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {page.isPost && page.postImageUrl ? (
                    <Image
                      src={page.postImageUrl}
                      alt={page.title}
                      width={24}
                      height={24}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                      unoptimized
                    />
                  ) : (
                    <span className="dashboard-recent-icon">{page.icon}</span>
                  )}
                  <span className="dashboard-recent-text" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {page.title}
                  </span>
                </Link>
              ))}
              {recentPages.length === 0 && (
                <div className="dashboard-recent-item" style={{ opacity: 0.6 }}>
                  <span className="dashboard-recent-text">No recent activity</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Section */}
          <div className="dashboard-sidebar-section">
            <div className="dashboard-sidebar-section-header">
              <span>Quick Stats</span>
            </div>
            <div className="dashboard-quick-stats">
              <div className="dashboard-quick-stat">
                <span className="dashboard-quick-stat-value">{stats.totalRecipes}</span>
                <span className="dashboard-quick-stat-label">Recipes</span>
              </div>
              <div className="dashboard-quick-stat">
                <span className="dashboard-quick-stat-value">{stats.streak}</span>
                <span className="dashboard-quick-stat-label">Day Streak</span>
              </div>
            </div>
          </div>
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
                  <div className="dashboard-user-name">{user?.name || ''}</div>
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

        <div className="dashboard-container">
          {/* Message Display */}
          {message && (
            <div
              className="card-wrapper"
              style={{
                width: '100%',
                margin: '0 auto 1.5rem',
              }}
            >
              <div className="card-background"></div>
              <div className={`glass card card-mount ${message.type === 'success' ? 'dashboard-stat-card' : ''}`}>
                <div className="cardBody" style={{ padding: 'var(--pad-md)' }}>
                  <div
                    style={{
                      color: message.type === 'success' ? '#4ade80' : '#f87171',
                      fontSize: 'var(--fs-md)',
                      fontWeight: '500',
                    }}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="card-wrapper" style={{ width: '100%', margin: '0 auto' }}>
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-icon">⚙️</span>
                  <h2 className="cardTitle" style={{ marginBottom: '0' }}>Settings</h2>
                </div>
                <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: 'var(--fs-sm)' }}>
                  Manage your account settings and preferences
                </p>
              </div>
            </div>
          </div>

          {/* User Information Section */}
          <div className="card-wrapper dashboard-stat-card" style={{ width: '100%', margin: '1.5rem auto 0' }}>
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-icon">👤</span>
                  <h3 className="cardTitle" style={{ marginBottom: '0' }}>User Information</h3>
                </div>

                <form onSubmit={handleUpdateProfile} style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Country
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Time Zone
                      </label>
                      <input
                        type="text"
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        placeholder="e.g., UTC, EST, PST"
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Cooking Frequency
                      </label>
                      <select
                        value={cookFrequency}
                        onChange={(e) => setCookFrequency(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      >
                        <option value="">Select frequency</option>
                        <option value="daily">Daily</option>
                        <option value="few-times-week">Few times a week</option>
                        <option value="weekly">Weekly</option>
                        <option value="few-times-month">Few times a month</option>
                        <option value="rarely">Rarely</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="dashboard-card-button"
                      style={{ marginTop: '1rem' }}
                    >
                      {saving ? 'Saving...' : 'Update User Information'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* User Profile Section (Dietary, Skills, etc.) */}
          <div className="card-wrapper dashboard-stat-card" style={{ width: '100%', margin: '1.5rem auto 0' }}>
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-icon">🍳</span>
                  <h3 className="cardTitle" style={{ marginBottom: '0' }}>Cooking Preferences</h3>
                </div>

                <form onSubmit={handleUpdateUserProfile} style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Dietary Profile
                      </label>
                      <input
                        type="text"
                        value={dietaryProfile}
                        onChange={(e) => setDietaryProfile(e.target.value)}
                        placeholder="e.g., Vegetarian, Vegan, Gluten-free"
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Skill Level
                      </label>
                      <select
                        value={skillLevel}
                        onChange={(e) => setSkillLevel(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      >
                        <option value="">Select skill level</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Max Prep Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={maxPrepTime || ''}
                        onChange={(e) => setMaxPrepTime(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="e.g., 30"
                        min="0"
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="dashboard-card-button"
                      style={{ marginTop: '1rem' }}
                    >
                      {saving ? 'Saving...' : 'Update Cooking Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="card-wrapper dashboard-stat-card" style={{ width: '100%', margin: '1.5rem auto 0' }}>
            <div className="card-background"></div>
            <div className="glass card card-mount">
              <div className="cardBody">
                <div className="dashboard-card-header">
                  <span className="dashboard-card-icon">🔒</span>
                  <h3 className="cardTitle" style={{ marginBottom: '0' }}>Change Password</h3>
                </div>

                <form onSubmit={handleChangePassword} style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Current Password *
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        New Password *
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                      <p style={{ marginTop: '0.25rem', fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
                        Must be at least 6 characters
                      </p>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        style={{
                          width: '100%',
                          padding: 'var(--pad-md)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          fontSize: 'var(--fs-md)',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="dashboard-card-button"
                      style={{ marginTop: '1rem' }}
                    >
                      {changingPassword ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Account Info Display */}
          {user && (
            <div className="card-wrapper dashboard-stat-card" style={{ width: '100%', margin: '1.5rem auto 2rem' }}>
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="cardBody">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon">ℹ️</span>
                    <h3 className="cardTitle" style={{ marginBottom: '0' }}>Account Information</h3>
                  </div>

                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)' }}>Account Created:</span>
                      <span style={{ color: 'var(--text)', fontSize: 'var(--fs-sm)' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)' }}>User ID:</span>
                      <span style={{ color: 'var(--text)', fontSize: 'var(--fs-sm)', fontFamily: 'monospace' }}>
                        {user.id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </main>
      </div>
    </>
  );
}
