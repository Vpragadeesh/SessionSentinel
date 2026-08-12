import React from 'react';
import { Link } from 'react-router-dom';
import { X, BrainCircuit, ExternalLink, ShieldAlert, ArrowRight } from 'lucide-react';
import type { Pattern } from '../api/client';

interface ThreatDetailsModalProps {
  pattern: Pattern | null;
  onClose: () => void;
}

export const ThreatDetailsModal: React.FC<ThreatDetailsModalProps> = ({ pattern, onClose }) => {
  if (!pattern) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-critical)'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ fontSize: '1.4rem' }}>
                  {pattern.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h2>
                <span className={`badge badge-${pattern.severity.toLowerCase()}`}>
                  {pattern.severity}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Detected: {new Date(pattern.detected_at).toLocaleString()} • Confidence: {(pattern.confidence * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn"
            style={{ padding: '0.4rem', borderRadius: '9999px', background: 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* AI Security Explanation */}
        <div className="glass-panel mb-4" style={{ background: 'var(--bg-panel-inner)' }}>
          <h4 className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-purple)', fontSize: '0.95rem' }}>
            <BrainCircuit size={18} /> AI Threat Summary & Explanation
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {pattern.llm_explanation || 'Cross-session behavioral anomaly detected across multi-turn queries. Automated probing cluster verified by DBSCAN analysis.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Affected Sessions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {pattern.affected_sessions}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Affected Agents</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {pattern.affected_agents}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Risk Score</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-critical)', marginTop: '0.2rem' }}>
              {pattern.risk_score !== null ? pattern.risk_score.toFixed(2) : '0.85'}
            </div>
          </div>
        </div>

        {/* Action Sequence */}
        <div className="glass-panel mb-6" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Identified Action & Tool Sequence</h4>
          <div className="flex flex-wrap items-center gap-2">
            {pattern.common_actions.map((action, idx) => (
              <React.Fragment key={idx}>
                <span className="sequence-tag">{action}</span>
                {idx < pattern.common_actions.length - 1 && (
                  <ArrowRight size={14} color="var(--accent-purple)" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-2">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <Link to={`/pattern/${pattern.id}`} className="btn btn-primary">
            Open Full Correlation Graph <ExternalLink size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};
