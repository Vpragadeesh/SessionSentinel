import React, { useEffect, useState } from 'react';
import { api, type Pattern } from '../api/client';
import { RefreshCw, Bug, Play, ShieldAlert, Activity, Users, Box, Wrench } from 'lucide-react';

const severityColor = (s: string) => {
  switch (s.toUpperCase()) {
    case 'CRITICAL': return 'var(--status-critical)';
    case 'HIGH':     return 'var(--status-high)';
    case 'MEDIUM':   return 'var(--status-medium)';
    default:         return 'var(--status-low)';
  }
};

export const ThreatsPage: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [injecting, setInjecting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setPatterns(await api.getPatterns()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try { await api.runAnalysis(); await fetchData(); window.dispatchEvent(new Event('dashboard-update')); }
    catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };

  const handleInject = async () => {
    setInjecting(true);
    try { await api.injectAttack(); await fetchData(); window.dispatchEvent(new Event('dashboard-update')); }
    catch (e) { console.error(e); }
    finally { setInjecting(false); }
  };

  const busy = analyzing || injecting;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Threat Detection</h1>
          <p className="page-subtitle">Actionable security signals and pattern visibility</p>
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
          {patterns.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px dashed var(--border-hover)', borderRadius: 'var(--radius-md)' }}>
              <ShieldAlert size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No Threats Detected</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                All active agent identities are operating within normal behavioral baseline thresholds.
              </div>
            </div>
          ) : (
            patterns.map(pattern => (
                <div key={pattern.id} className="card animate-fade-in" style={{ borderTop: `3px solid ${severityColor(pattern.severity)}`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {pattern.name}
                      </h3>
                      <span className={`badge badge-${pattern.severity.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                        {pattern.severity}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Confidence
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: severityColor(pattern.severity) }}>
                        {(pattern.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Activity size={14} /> Total Sessions
                      </span>
                      <span style={{ fontWeight: 600 }}>{pattern.affected_sessions}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Users size={14} /> Affected Agents
                      </span>
                      <span style={{ fontWeight: 600 }}>{pattern.affected_agents}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Box size={14} /> Common Actions
                      </span>
                      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                        {pattern.common_actions.length > 0 ? pattern.common_actions.slice(0, 2).join(', ') : 'None'}
                        {pattern.common_actions.length > 2 && '...'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                        <Wrench size={14} /> Common Tools
                      </span>
                      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                        {pattern.common_tools.length > 0 ? pattern.common_tools.slice(0, 2).join(', ') : 'None'}
                        {pattern.common_tools.length > 2 && '...'}
                      </span>
                    </div>
                  </div>
                  
                  {pattern.llm_explanation && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{pattern.llm_explanation}"
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};
