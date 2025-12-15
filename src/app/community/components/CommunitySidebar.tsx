'use client';

import React from 'react';
import Link from 'next/link';

export default function CommunitySidebar() {
  return (
    <div className="community-sidebar-horizontal" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px'
    }}>
      {/* Trending Tags */}
      <div className="community-sidebar-card community-neon-card" style={{ 
        padding: 'var(--pad-lg)',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{
            width: '4px',
            height: '36px',
            background: 'linear-gradient(135deg, var(--accent) 0%, rgba(147, 197, 253, 0.8) 100%)',
            borderRadius: '2px',
            alignSelf: 'center',
            marginTop: '-12px'
          }}></div>
          <h3 className="cardTitle" style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0, lineHeight: '36px' }}>
            Trending Tags
          </h3>
        </div>
        <div className="chip-row community-trending-tags" style={{ gap: '8px', flexWrap: 'wrap' }}>
          {['#vegan', '#quick', '#dessert', '#healthy', '#pasta', '#italian', '#spicy'].map(tag => (
            <Link key={tag} href={`/community?tag=${tag.slice(1)}`} style={{ textDecoration: 'none' }}>
              <span className="chip tap-ripple community-tag-chip">
                <span className="chip-label">{tag}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Suggested Creators */}
      <div className="community-sidebar-card community-neon-card" style={{ 
        padding: 'var(--pad-lg)',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{
            width: '4px',
            height: '36px',
            background: 'linear-gradient(135deg, var(--accent) 0%, rgba(147, 197, 253, 0.8) 100%)',
            borderRadius: '2px',
            alignSelf: 'center',
            marginTop: '-12px'
          }}></div>
          <h3 className="cardTitle" style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0, lineHeight: '36px' }}>
            Suggested Creators
          </h3>
        </div>
        <div className="community-suggested-creators">
          <p className="subtitle" style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
            Discover amazing chefs and food creators from around the world
          </p>
        </div>
      </div>

      {/* Weekly Challenge */}
      <div className="community-sidebar-card community-challenge-card community-neon-card" style={{
        padding: 'var(--pad-lg)',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{
            width: '4px',
            height: '36px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
            borderRadius: '2px',
            alignSelf: 'center',
            marginTop: '-12px'
          }}></div>
          <h3 className="cardTitle" style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, margin: 0, lineHeight: '36px' }}>
            Weekly Challenge
          </h3>
        </div>
        <div className="community-challenge">
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            marginBottom: '12px'
          }}>
            <p className="subtitle" style={{ marginBottom: '8px', fontSize: 'var(--fs-md)', fontWeight: 600 }}>
              🍝 One-Pot Pasta Week
            </p>
            <p className="subtitle" style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
              Share your best one-pot pasta recipe and win amazing prizes!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

