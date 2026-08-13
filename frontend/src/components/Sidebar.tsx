import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  Users,
  Database,
  MessageSquare,
  CheckCircle2,
  Crosshair,
  Activity,
  CheckSquare
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import type { Pattern, Alert } from '../api/client';

interface SidebarProps {
  patterns: Pattern[];
  alerts?: Alert[];
}

const NavItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}> = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    end={to === '/'}
  >
    {icon}
    <span style={{ flex: 1 }}>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span style={{
        fontSize: '0.68rem',
        fontWeight: 700,
        padding: '0.1rem 0.45rem',
        borderRadius: '9999px',
        background: 'rgba(239,68,68,0.15)',
        color: '#fca5a5',
        border: '1px solid rgba(239,68,68,0.3)',
        lineHeight: 1.4,
      }}>
        {badge}
      </span>
    )}
  </NavLink>
);

export const Sidebar: React.FC<SidebarProps> = ({ patterns, alerts = [] }) => {
  const hasThreat = patterns.length > 0;
  const openAlertsCount = alerts.filter(a => a.status !== 'resolved').length;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={17} />
        </div>
        <span className="sidebar-brand">SessionSentinel</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">MONITOR</span>

        <NavItem
          to="/"
          icon={<LayoutDashboard size={16} />}
          label="Overview"
        />

        <NavItem
          to="/threats"
          icon={<Crosshair size={16} />}
          label="Threats"
          badge={patterns.length}
        />

        <NavItem
          to="/alerts"
          icon={<AlertTriangle size={16} />}
          label="Alerts"
          badge={openAlertsCount} 
        />

        <NavItem
          to="/agents"
          icon={<Users size={16} />}
          label="Agents"
        />

        <span className="sidebar-section-label">ANALYSIS</span>

        <NavItem
          to="/sessions"
          icon={<Database size={16} />}
          label="Sessions"
        />
        
        <NavItem
          to="/techniques"
          icon={<Activity size={16} />}
          label="Techniques"
        />
        
        <NavItem
          to="/guardrails"
          icon={<Shield size={16} />}
          label="Guardrails"
        />
        
        <NavItem
          to="/validation"
          icon={<CheckSquare size={16} />}
          label="Validation"
        />

        <span className="sidebar-section-label">TOOLS</span>

        <NavItem
          to="/chat"
          icon={<MessageSquare size={16} />}
          label="Chat Simulator"
        />
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Engine health */}
        <div className="engine-status-chip">
          <CheckCircle2 size={13} color="var(--status-low)" />
          <span>DBSCAN</span>
          <span style={{ color: 'var(--status-low)', fontWeight: 600 }}>HEALTHY</span>
        </div>

        {/* Status beacon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.72rem',
        }}>
          <span
            className="pulse-dot"
            style={hasThreat ? {} : undefined}
            data-danger={hasThreat ? 'true' : undefined}
          />
          <span style={{ color: hasThreat ? 'var(--status-critical)' : 'var(--status-low)', fontWeight: 600 }}>
            {hasThreat ? `${patterns.length} Active Threat${patterns.length > 1 ? 's' : ''}` : 'Normal Baseline'}
          </span>
        </div>

        <ThemeToggle />
      </div>
    </aside>
  );
};
