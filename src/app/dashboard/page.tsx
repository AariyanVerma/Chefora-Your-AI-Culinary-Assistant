// app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogoutButton } from '@/app/components/logoutbutton';

interface User {
  id: string;
  name: string;
  email: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    recipesCooked: 0,
    streak: 0,
    ingredientsExpiring: 3,
    weeklyMeals: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/data');
        if (res.ok) {
          const data = await res.json();
          console.log('Dashboard data received:', data); // Debug log
          setUser(data.user);
          setProfile(data.profile);
          setStats(data.stats || stats);
        } else if (res.status === 401) {
          router.push('/login');
        } else {
          console.error('Failed to fetch dashboard data:', res.status, res.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="dashboard-layout layer-content">
        <div className="dashboard-loading">Loading...</div>
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
          style={
            { "--sz": "520px", "--x": "10%", "--y": "-6%", "--d": "18s" } as any
          }
        />
        <span
          className="bubble b-blue"
          style={
            { "--sz": "620px", "--x": "82%", "--y": "-12%", "--d": "22s" } as any
          }
        />
        <span
          className="bubble b-green"
          style={
            { "--sz": "460px", "--x": "14%", "--y": "76%", "--d": "20s" } as any
          }
        />
        <span
          className="bubble b-neon"
          style={
            { "--sz": "540px", "--x": "86%", "--y": "78%", "--d": "19s" } as any
          }
        />
        <span
          className="bubble b-purple"
          style={
            { "--sz": "360px", "--x": "48%", "--y": "16%", "--d": "16s" } as any
          }
        />
        <span
          className="bubble b-amber"
          style={
            { "--sz": "320px", "--x": "58%", "--y": "54%", "--d": "21s" } as any
          }
        />
        <span
          className="bubble b-cyan"
          style={
            { "--sz": "340px", "--x": "30%", "--y": "52%", "--d": "17s" } as any
          }
        />
        <span
          className="bubble b-magenta"
          style={
            { "--sz": "300px", "--x": "72%", "--y": "32%", "--d": "15s" } as any
          }
        />
      </div>

      <div className="dashboard-layout layer-content">
        {/* Logo - Centered on entire screen */}
        <div className="dashboard-logo-center-screen">
          <Image
            src="/assets/chefora-logo.svg"
            alt="Chefora Logo"
            width={80}
            height={80}
            className="dashboard-header-logo"
            priority
          />
        </div>

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="dashboard-brand">Chefora</div>
          <nav className="dashboard-nav">
            <a href="/dashboard" className="dashboard-nav-link dashboard-nav-link-active">Dashboard</a>
            <a href="/recipes" className="dashboard-nav-link">Recipes</a>
            <a href="/ai-recipes" className="dashboard-nav-link">AI Recipe Generator</a>
            <a href="/pantry" className="dashboard-nav-link">Pantry</a>
            <a href="/shopping-list" className="dashboard-nav-link">Shopping List</a>
            <a href="/meal-planner" className="dashboard-nav-link">Meal Planner</a>
            <a href="/community" className="dashboard-nav-link">Community</a>
            <a href="/settings" className="dashboard-nav-link">Settings</a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Top Header */}
          <header className="dashboard-top-header">
            <div className="dashboard-search-wrapper">
              <div className="inputIcon" style={{ flex: 1 }}>
                <i>🔎</i>
                <input
                  className="input"
                  placeholder="Search or ask Chefora anything…"
                />
              </div>
            </div>
            <div className="dashboard-user-section">
              <button className="btn ghost tap-ripple dashboard-theme-toggle">☾</button>
              <div className="dashboard-user-info">
                <div className="dashboard-user-details">
                  <div className="dashboard-user-name">{user.name}</div>
                  <div className="dashboard-user-email">{user.email}</div>
                </div>
                <div className="dashboard-user-avatar" />
                <LogoutButton />
              </div>
            </div>
          </header>

          {/* Profile Tags - Fixed visibility */}
          <div className="dashboard-profile-section">
            <div className="card-wrapper dashboard-profile-card">
              <div className="card-background"></div>
              <div className="glass ios solid card">
                <div className="dashboard-profile-header">
                <span className="dashboard-profile-icon">👤</span>
                <span className="dashboard-profile-label">Your Profile</span>
              </div>
              {profile ? (
                <div className="chip-row dashboard-profile-chips">
                  {profile.dietary_profile && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">{profile.dietary_profile.replace('_', ' ')}</span>
                    </span>
                  )}
                  {profile.allergies && profile.allergies.length > 0 && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">⚠️ {profile.allergies.join(', ')}</span>
                    </span>
                  )}
                  {profile.skill_level && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">🎯 {profile.skill_level}</span>
                    </span>
                  )}
                  {profile.kitchen_tools && profile.kitchen_tools.length > 0 && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">🔪 {profile.kitchen_tools.join(', ')}</span>
                    </span>
                  )}
                  {profile.persona && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">
                        {profile.persona === 'student'
                          ? '🎓 Student mode'
                          : profile.persona === 'fitness'
                          ? '💪 Fitness mode'
                          : '👨‍👩‍👧 Family mode'}
                      </span>
                    </span>
                  )}
                  {profile.favorite_cuisines && profile.favorite_cuisines.length > 0 && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">❤️ {profile.favorite_cuisines.join(', ')}</span>
                    </span>
                  )}
                  {profile.max_prep_time_minutes && (
                    <span className="chip tap-ripple active dashboard-profile-chip">
                      <span className="chip-dot" />
                      <span className="chip-label">⏱️ Max {profile.max_prep_time_minutes} min</span>
                    </span>
                  )}
                  {!profile.dietary_profile && 
                   !profile.allergies?.length && 
                   !profile.skill_level && 
                   !profile.kitchen_tools?.length && 
                   !profile.persona && 
                   !profile.favorite_cuisines?.length && 
                   !profile.max_prep_time_minutes && (
                    <span className="dashboard-profile-empty">
                      No profile data yet. Complete your profile in settings!
                    </span>
                  )}
                </div>
              ) : (
                <div className="dashboard-profile-empty">
                  <p>No profile found. Please complete your profile setup.</p>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="dashboard-stats-row">
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">🔥</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.streak}</div>
                  <div className="dashboard-stat-label">Day Streak</div>
                </div>
              </div>
            </div>
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">🍳</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.recipesCooked}</div>
                  <div className="dashboard-stat-label">Recipes Cooked</div>
                </div>
              </div>
            </div>
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">⚠️</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.ingredientsExpiring}</div>
                  <div className="dashboard-stat-label">Expiring Soon</div>
                </div>
              </div>
            </div>
            <div className="card-wrapper dashboard-stat-card">
              <div className="card-background"></div>
              <div className="glass card card-mount">
                <div className="dashboard-stat-icon">📅</div>
                <div className="dashboard-stat-content">
                  <div className="dashboard-stat-value">{stats.weeklyMeals}</div>
                  <div className="dashboard-stat-label">This Week</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="container">
            <div className="dashboard-grid">
              {/* Hero Card */}
              <div className="card-wrapper dashboard-hero-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody">
                  <div className="dashboard-hero-content-wrapper">
                    <div className="dashboard-hero-left-section">
                      <div className="dashboard-greeting">
                        <h2 className="cardTitle" style={{ marginBottom: '6px', fontSize: 'clamp(16px, 2vw, 20px)' }}>
                          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name?.split(' ')[0] || 'chef'} 👋
                        </h2>
                        <p className="subtitle" style={{ marginBottom: '16px' }}>
                          You have {stats.ingredientsExpiring} ingredients expiring soon. Here&apos;s a quick dinner idea:
                        </p>
                      </div>

                      <div className="dashboard-recipe-preview">
                        <div className="dashboard-recipe-image">
                          <div className="dashboard-recipe-image-placeholder">🍝</div>
                        </div>
                        <div className="dashboard-recipe-content">
                          <div className="cardTitle" style={{ marginBottom: '4px' }}>Creamy Garlic Pasta</div>
                          <div className="subtitle" style={{ marginBottom: '8px', fontSize: '12px' }}>
                            ⏱️ 20 min • ⭐ Easy • 🍽️ 4 servings
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="dashboard-recipe-description-side">
                      A rich and creamy pasta dish with fresh garlic, parmesan, and herbs. Perfect for using up your expiring ingredients!
                    </div>
                  </div>
                  <div className="dashboard-recipe-tags">
                    {profile?.dietary_profile && (
                      <span className="dashboard-recipe-tag">{profile.dietary_profile.replace('_', ' ')}</span>
                    )}
                    {profile?.skill_level && (
                      <span className="dashboard-recipe-tag">{profile.skill_level}</span>
                    )}
                    <span className="dashboard-recipe-tag">Quick Meal</span>
                    <span className="dashboard-recipe-tag">One Pot</span>
                  </div>
                  <div className="toolbar dashboard-hero-toolbar">
                    <button className="btn tap-ripple">Cook this</button>
                    <button className="btn ghost tap-ripple">🔄 Another idea</button>
                  </div>
                  </div>
                </div>
              </div>

              {/* Pantry Card */}
              <div className="card-wrapper dashboard-pantry-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon">🥘</span>
                    <h3 className="cardTitle" style={{ marginBottom: '0' }}>Pantry Overview</h3>
                  </div>
                  <div className="dashboard-pantry-stats">
                    <div className="dashboard-pantry-stat">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span className="dashboard-pantry-stat-icon">📦</span>
                        <span className="dashboard-pantry-stat-label">Total ingredients</span>
                      </div>
                      <span className="dashboard-pantry-stat-value">24</span>
                    </div>
                    <div className="dashboard-pantry-stat-divider"></div>
                    <div className="dashboard-pantry-stat">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <span className="dashboard-pantry-stat-icon">⏰</span>
                        <span className="dashboard-pantry-stat-label">Expiring in days</span>
                      </div>
                      <span className="dashboard-pantry-stat-value urgent">3</span>
                    </div>
                  </div>
                  <ul className="dashboard-list">
                    <li className="dashboard-list-item urgent">🥛 Milk – expires in 1 day</li>
                    <li className="dashboard-list-item warning">🍅 Tomatoes – expires in 2 days</li>
                    <li className="dashboard-list-item warning">🥬 Spinach – expires in 2 days</li>
                  </ul>
                  <button className="dashboard-card-button" style={{ marginTop: '12px' }}>
                    <span>View pantry</span>
                  </button>
                  </div>
                </div>
              </div>

              {/* Meal Planner Card - Fixed cropping */}
              <div className="card-wrapper dashboard-planner-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon">📅</span>
                    <h3 className="cardTitle" style={{ marginBottom: '0' }}>This Week&apos;s Plan</h3>
                  </div>
                  <div className="dashboard-week-container">
                    <div className="dashboard-week-grid">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <button
                          key={day}
                          className="dashboard-day-button"
                          style={{ ["--i" as any]: index }}
                        >
                          <span className="dashboard-day-name">{day}</span>
                          <span className="dashboard-day-status">Not planned</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="dashboard-card-button dashboard-card-button-primary" style={{ marginTop: '12px' }}>
                    <span className="dashboard-button-icon">🤖</span>
                    <span>Auto-fill week with AI</span>
                  </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="card-wrapper dashboard-actions-card">
                <div className="card-background"></div>
                <div className="glass card card-mount">
                  <div className="cardBody">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-icon">⚡</span>
                    <h3 className="cardTitle" style={{ marginBottom: '0' }}>Quick Actions</h3>
                  </div>
                  <div className="dashboard-quick-actions">
                    <button className="dashboard-action-btn tap-ripple">
                      <span className="dashboard-action-icon">🔍</span>
                      <span>Find Recipe</span>
                    </button>
                    <button className="dashboard-action-btn tap-ripple">
                      <span className="dashboard-action-icon">🤖</span>
                      <span>AI Generator</span>
                    </button>
                    <button className="dashboard-action-btn tap-ripple">
                      <span className="dashboard-action-icon">📝</span>
                      <span>Meal Plan</span>
                    </button>
                    <button className="dashboard-action-btn tap-ripple">
                      <span className="dashboard-action-icon">🛒</span>
                      <span>Shopping List</span>
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
