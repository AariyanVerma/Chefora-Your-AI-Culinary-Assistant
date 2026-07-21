'use client';

import { PantryStats } from '../actions';

interface PantryOverviewProps {
  stats: PantryStats;
}

export default function PantryOverview({ stats }: PantryOverviewProps) {
  const healthColor = 
    stats.health_score >= 80 ? '#4ade80' :
    stats.health_score >= 60 ? '#fbbf24' :
    stats.health_score >= 40 ? '#fb923c' :
    '#ef4444';

  return (
    <div className="pantry-overview">
      <div className="pantry-overview-card">
        <div className="pantry-overview-header">
          <h1 className="cardTitle">Pantry Overview</h1>
          <div className="pantry-overview-header-right">
            <div className="pantry-health-score">
              <div className="pantry-health-label">Health Score</div>
              <div className="pantry-health-value" style={{ color: healthColor }}>
                {stats.health_score}
              </div>
            </div>
          </div>
        </div>

        <div className="pantry-stats-grid">
          <div className="pantry-stat-item">
            <div className="pantry-stat-icon">📦</div>
            <div className="pantry-stat-content">
              <div className="pantry-stat-value">{stats.total_items}</div>
              <div className="pantry-stat-label">Total Items</div>
            </div>
          </div>

          <div className="pantry-stat-item urgent">
            <div className="pantry-stat-icon">⚠️</div>
            <div className="pantry-stat-content">
              <div className="pantry-stat-value">{stats.expired}</div>
              <div className="pantry-stat-label">Expired</div>
            </div>
          </div>

          <div className="pantry-stat-item warning">
            <div className="pantry-stat-icon">⏰</div>
            <div className="pantry-stat-content">
              <div className="pantry-stat-value">{stats.expiring_1_3_days}</div>
              <div className="pantry-stat-label">Expiring 1-3 Days</div>
            </div>
          </div>

          <div className="pantry-stat-item info">
            <div className="pantry-stat-icon">📅</div>
            <div className="pantry-stat-content">
              <div className="pantry-stat-value">{stats.expiring_7_days}</div>
              <div className="pantry-stat-label">Expiring This Week</div>
            </div>
          </div>
        </div>

        <div className="pantry-health-bar">
          <div 
            className="pantry-health-bar-fill" 
            style={{ 
              width: `${stats.health_score}%`,
              backgroundColor: healthColor
            }}
          />
        </div>
      </div>
    </div>
  );
}
