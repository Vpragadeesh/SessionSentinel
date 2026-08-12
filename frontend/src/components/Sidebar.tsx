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
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import type { Pattern } from '../api/client';

interface SidebarProps {
  patterns: Pattern[];
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

export const Sidebar: React.FC<SidebarProps> = ({ patterns }) => {
  const hasThreat = patterns.length > 0;

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
        <span className="sidebar-section-label">Monitor</span>

        <NavItem
          to="/"
          icon={<LayoutDashboard size={16} />}
          label="Overview"
        />

        <NavItem
          to="/threats"
          icon={<AlertTriangle size={16} />}
          label="Threats"
          badge={patterns.length}
        />

        <NavItem
          to="/agents"
          icon={<Users size={16} />}
          label="Risky Agents"
        />

        <span className="sidebar-section-label">Tools</span>

        <NavItem
          to="/sessions"
          icon={<Database size={16} />}
          label="Session Store"
        />

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
