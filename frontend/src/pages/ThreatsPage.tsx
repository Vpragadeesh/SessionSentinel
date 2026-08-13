import React, { useEffect, useState } from 'react';
import { api, type Alert } from '../api/client';
import { RefreshCw, Bug, Play, ShieldAlert, Activity, Users, FileWarning } from 'lucide-react';

const severityColor = (s: string) => {
  switch (s.toUpperCase()) {
    case 'CRITICAL': return 'var(--status-critical)';
    case 'HIGH':     return 'var(--status-high)';
    case 'MEDIUM':   return 'var(--status-medium)';
    default:         return 'var(--status-low)';
  }
};

export const ThreatsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [injecting, setInjecting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setAlerts(await api.getAlerts()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try { await api.runAnalysis(); await fetchData(); }
    catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  const handleInject = async () => {
    setInjecting(true);
    try { await api.injectAttack(); await fetchData(); }
    catch (e) { console.error(e); }
    finally { setInjecting(false); }
  };

  const busy = analyzing || injecting;

  // Aggregate alerts by technique
  const techniques = Array.from(new Set(alerts.map(a => a.technique)));

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Threat Detection</h1>
          <p className="page-subtitle">Actionable security signals and technique visibility</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-sm btn-danger" onClick={handleInject} disabled={busy}>
            <Bug size={13} />
            {injecting ? 'Injecting…' : 'Inject Attack'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleAnalyze} disabled={busy}>
            <Play size={13} />
            {analyzing ? 'Running…' : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading detectors…</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {techniques.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px dashed var(--border-hover)', borderRadius: 'var(--radius-md)' }}>
              <ShieldAlert size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No Threats Detected</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                All active agent identities are operating within normal behavioral baseline thresholds.
              </div>
            </div>
          ) : (
            techniques.map(tech => {
              const techAlerts = alerts.filter(a => a.technique === tech);
              const maxScore = Math.max(...techAlerts.map(a => a.risk_score));
              // Determine highest severity
              const hasCritical = techAlerts.some(a => a.severity === 'CRITICAL');
              const hasHigh = techAlerts.some(a => a.severity === 'HIGH');
              const severity = hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'MEDIUM';
              
              // Aggregate evidence
              const totalSessions = techAlerts.reduce((sum, a) => sum + (a.evidence?.sessions_analyzed || 1), 0);
              const blockedCount = techAlerts.reduce((sum, a) => sum + (a.evidence?.blocked_events || 0), 0);
              const similarity = techAlerts[0]?.evidence?.avg_similarity || 0;
              const affectedAgents = Array.from(new Set(techAlerts.map(a => a.agent_id)));

              return (
                <div key={tech} className="card animate-fade-in" style={{ borderTop: `3px solid ${severityColor(severity)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {tech}
                      </h3>
                      <span className={`badge badge-${severity.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                        {severity}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Score
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: severityColor(severity) }}>
                        {maxScore.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Activity size={14} /> Total Sessions
                      </span>
                      <span style={{ fontWeight: 600 }}>{totalSessions}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <FileWarning size={14} /> Blocked Events
                      </span>
                      <span style={{ fontWeight: 600 }}>{blockedCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Activity size={14} /> Avg Similarity
                      </span>
                      <span style={{ fontWeight: 600 }}>{similarity.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Users size={14} /> Affected Agents
                      </span>
                      <span style={{ fontWeight: 600 }}>{affectedAgents.length}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
