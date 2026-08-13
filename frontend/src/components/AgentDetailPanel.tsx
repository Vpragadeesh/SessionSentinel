import React, { useEffect, useState } from 'react';
import { api, type AgentRisk, type Alert, type SessionItem } from '../api/client';
import { X, Activity, AlertTriangle, Database } from 'lucide-react';
import { RiskTimeline } from './RiskTimeline';

interface AgentDetailPanelProps {
  agent: AgentRisk;
  onClose: () => void;
}

export const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({ agent, onClose }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [al, sess] = await Promise.all([
          api.getAgentAlerts(agent.id),
          api.getAgentSessions(agent.id)
        ]);
        if (active) {
          setAlerts(al);
          setSessions(sess);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDetails();
    return () => { active = false; };
  }, [agent.id]);

  // Extract unique techniques from alerts
  const techniques = Array.from(new Set(alerts.map(a => a.technique)));

  return (
    <div className="side-drawer">
      <div className="side-drawer-header">
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {agent.name}
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {agent.id}
          </div>
        </div>
        <button className="btn btn-sm" onClick={onClose} style={{ padding: '0.4rem' }}>
          <X size={16} />
        </button>
      </div>

      <div className="side-drawer-content">
        {/* Risk Visualization */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Risk Score</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: agent.current_risk_score >= 0.8 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
              {agent.current_risk_score.toFixed(2)} / 1.00
            </span>
          </div>
          <div style={{ 
            fontFamily: 'JetBrains Mono, monospace', 
            fontSize: '1rem', 
            letterSpacing: '1px',
            color: agent.current_risk_score >= 0.8 ? 'var(--status-critical)' : 'var(--status-high)'
          }}>
            {'█'.repeat(Math.round(agent.current_risk_score * 20))}{'░'.repeat(20 - Math.round(agent.current_risk_score * 20))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading telemetry...</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Database size={12} /> Sessions
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{sessions.length}</div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertTriangle size={12} /> Alerts
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{alerts.length}</div>
              </div>
            </div>

            {/* Techniques */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                Detected Techniques
              </h3>
              {techniques.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No behavioral patterns detected.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {techniques.map(tech => {
                    const techAlerts = alerts.filter(a => a.technique === tech);
                    const maxScore = Math.max(...techAlerts.map(a => a.risk_score));
                    return (
                      <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Activity size={12} style={{ color: 'var(--text-muted)' }} /> {tech}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--status-high)' }}>{maxScore.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                Recent Alerts
              </h3>
              {alerts.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No alerts generated yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {alerts.slice(0, 5).map(a => (
                    <div key={a.id} style={{ 
                      padding: '0.75rem', 
                      background: 'var(--bg-inner)', 
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${a.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-high)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.technique}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!loading && alerts.length > 0 && sessions.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <RiskTimeline alerts={alerts} sessions={sessions} />
          </div>
        )}
      </div>
    </div>
  );
};
