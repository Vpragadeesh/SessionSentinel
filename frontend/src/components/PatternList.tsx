import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import type { Pattern } from '../api/client';
import { ThreatDetailsModal } from './ThreatDetailsModal';

interface Props {
  patterns: Pattern[];
  onInjectAttack?: () => void;
}

const getBadgeClass = (severity: string) => {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 'badge badge-critical';
    case 'HIGH': return 'badge badge-high';
    case 'MEDIUM': return 'badge badge-medium';
    case 'LOW': return 'badge badge-low';
    default: return 'badge badge-low';
  }
};

export const PatternList: React.FC<Props> = ({ patterns, onInjectAttack }) => {
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);

  if (patterns.length === 0) {
    return (
      <div className="glass-panel text-center py-10" style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(59, 130, 246, 0.04))',
        border: '1px dashed var(--border-hover)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.12)',
          color: 'var(--status-low)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <ShieldCheck size={28} />
        </div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>All Clear • Normal Baseline Active</h3>
        <p style={{ maxWidth: '520px', margin: '0 auto 1.25rem auto', fontSize: '0.88rem' }}>
          DBSCAN clustering has analyzed all active sessions and found zero adversarial probing clusters. Normal user sessions are safely dispersed as benign variance.
        </p>
        {onInjectAttack && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={onInjectAttack}
            style={{ margin: '0 auto', fontSize: '0.85rem' }}
          >
            <Sparkles size={14} /> Inject Coordinated Attack (50 Sessions) to Test Detection
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel overflow-hidden" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Adversarial Pattern Name</th>
              <th>Severity</th>
              <th>Sessions</th>
              <th>Behavioral Similarity</th>
              <th>Common Tools</th>
              <th>Last Detected</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((pattern, index) => (
              <tr key={pattern.id} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} color={
                      pattern.severity === 'CRITICAL' ? 'var(--status-critical)' :
                      pattern.severity === 'HIGH' ? 'var(--status-high)' : 'var(--status-medium)'
                    } />
                    {pattern.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </td>
                <td>
                  <span className={getBadgeClass(pattern.severity)}>
                    {pattern.severity}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pattern.affected_sessions}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> sessions</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: '75px',
                      height: '6px',
                      background: 'var(--border-color)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${pattern.confidence * 100}%`,
                        height: '100%',
                        background: pattern.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--accent-blue)',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{(pattern.confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {pattern.common_tools.slice(0, 2).map(t => (
                      <span key={t} style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'monospace'
                      }}>
                        {t}
                      </span>
                    ))}
                    {pattern.common_tools.length > 2 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        +{pattern.common_tools.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {new Date(pattern.detected_at).toLocaleTimeString()}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <Eye size={13} /> Inspect
                    </button>
                    <Link 
                      to={`/pattern/${pattern.id}`} 
                      className="btn btn-primary" 
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    >
                      Graph <ChevronRight size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ThreatDetailsModal
        pattern={selectedPattern}
        onClose={() => setSelectedPattern(null)}
      />
    </>
  );
};
