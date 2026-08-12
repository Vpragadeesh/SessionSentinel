import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';
import type { Pattern } from '../api/client';

interface ThreatGaugeProps {
  patterns: Pattern[];
  totalSessions: number;
}

export const ThreatGauge: React.FC<ThreatGaugeProps> = ({ patterns, totalSessions }) => {
  // Calculate dynamic Threat Level Index (0 - 100)
  const criticalCount = patterns.filter(p => p.severity === 'CRITICAL').length;
  const highCount = patterns.filter(p => p.severity === 'HIGH').length;
  const mediumCount = patterns.filter(p => p.severity === 'MEDIUM').length;

  let score = 0;
  if (patterns.length > 0) {
    score = Math.min(
      100,
      Math.round(criticalCount * 35 + highCount * 25 + mediumCount * 12 + Math.min(patterns.length * 5, 20))
    );
  }

  let statusText = 'NORMAL BASELINE';
  let statusColor = 'var(--status-low)';
  let StatusIcon = ShieldCheck;
  let statusDescription = 'No active adversarial probes detected. Normal telemetry variance.';

  if (score >= 75) {
    statusText = 'CRITICAL THREAT';
    statusColor = 'var(--status-critical)';
    StatusIcon = Flame;
    statusDescription = 'Multiple coordinated attack clusters actively probing guardrail limits.';
  } else if (score >= 45) {
    statusText = 'HIGH RISK';
    statusColor = 'var(--status-high)';
    StatusIcon = AlertTriangle;
    statusDescription = 'Elevated pattern similarity detected across disparate user identities.';
  } else if (score > 0) {
    statusText = 'ELEVATED SUSPICION';
    statusColor = 'var(--status-medium)';
    StatusIcon = ShieldAlert;
    statusDescription = 'Low-frequency probing clusters identified. Continuous monitoring engaged.';
  }

  // Circular gauge circumference
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            System Threat Index
          </span>
          <h3 style={{ fontSize: '1.25rem', marginTop: '0.2rem' }}>Live Posture</h3>
        </div>
        <div style={{
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          background: `${statusColor}1a`,
          border: `1px solid ${statusColor}4d`,
          color: statusColor,
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <StatusIcon size={14} />
          {statusText}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', margin: '1rem 0' }}>
        {/* SVG Circular Dial */}
        <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke="var(--border-color)"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              cx="55"
              cy="55"
              r={radius}
              stroke={statusColor}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>
              {score}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              / 100
            </span>
          </div>
        </div>

        {/* Posture Summary stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <div className="flex justify-between items-center" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Critical Clusters:</span>
            <strong style={{ color: criticalCount > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}>{criticalCount}</strong>
          </div>
          <div className="flex justify-between items-center" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>High Risk Clusters:</span>
            <strong style={{ color: highCount > 0 ? 'var(--status-high)' : 'var(--text-primary)' }}>{highCount}</strong>
          </div>
          <div className="flex justify-between items-center" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Evaluated:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{totalSessions.toLocaleString()} sessions</span>
          </div>
        </div>
      </div>

      <div style={{
        padding: '0.65rem 0.85rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-panel-inner)',
        border: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)'
      }}>
        {statusDescription}
      </div>
    </div>
  );
};
