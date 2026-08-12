import React from 'react';
import { Activity, ShieldAlert, AlertTriangle, Users } from 'lucide-react';
import type { DashboardStats as StatsType } from '../api/client';

interface Props {
  stats: StatsType | null;
  agentCount?: number;
}

export const DashboardStats: React.FC<Props> = ({ stats, agentCount = 10 }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {/* 1. Total Sessions */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Total Sessions
          </span>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={17} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 700, lineHeight: 1.1 }}>
          {stats.total_sessions.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: '0.75rem', color: 'var(--status-low)' }}>
          <span style={{ fontWeight: 600 }}>● 100% Vectorized</span>
          <span style={{ color: 'var(--text-muted)' }}>• Real-time ingestion</span>
        </div>
      </div>

      {/* 2. Patterns Detected */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Detected Clusters
          </span>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(234, 179, 8, 0.15)',
            color: 'var(--status-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={17} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 700, lineHeight: 1.1 }}>
          {stats.total_patterns.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: '0.75rem', color: stats.total_patterns > 0 ? 'var(--status-medium)' : 'var(--text-muted)' }}>
          <span style={{ fontWeight: 600 }}>{stats.total_patterns > 0 ? 'Anomaly Clusters Found' : 'Clean Baseline'}</span>
        </div>
      </div>

      {/* 3. High Risk Patterns */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            High & Critical Threats
          </span>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--status-critical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={17} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 700, lineHeight: 1.1, color: stats.high_risk_count > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
          {stats.high_risk_count.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: '0.75rem', color: stats.high_risk_count > 0 ? 'var(--status-critical)' : 'var(--status-low)' }}>
          <span style={{ fontWeight: 600 }}>{stats.high_risk_count > 0 ? 'Action Required' : '0 High Threats'}</span>
        </div>
      </div>

      {/* 4. Agent Identities */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Monitored Agents
          </span>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(139, 92, 246, 0.15)',
            color: 'var(--accent-purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={17} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 700, lineHeight: 1.1 }}>
          {agentCount.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Risk tracking active across identities</span>
        </div>
      </div>
    </div>
  );
};
