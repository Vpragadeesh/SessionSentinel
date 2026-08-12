import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AgentRisk } from '../api/client';
import { RefreshCw, Users, Clock, UserX } from 'lucide-react';
import { SystemHealthCard } from '../components/SystemHealthCard';

const riskColor = (score: number) =>
  score >= 1.5 ? 'var(--status-critical)' :
  score >= 0.8 ? 'var(--status-high)' :
  'var(--status-medium)';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentRisk[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try { setAgents(await api.getTopRiskyAgents()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Risky Agents</h1>
          <p className="page-subtitle">Identities with elevated cross-session behavioral risk scores</p>
        </div>
        <button className="btn btn-sm" onClick={fetchData}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading…</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Agents table */}
          <div>
            <div className="section-header">
              <div>
                <div className="section-title">Flagged Agent Identities</div>
                <div className="section-subtitle">
                  Risk auto-resets to baseline after 24 hours of inactivity
                </div>
              </div>
              {agents.length > 0 && (
                <span className="badge badge-high">
                  <Users size={11} /> {agents.length} flagged
                </span>
              )}
            </div>

            {agents.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-hover)',
                borderRadius: 'var(--radius-md)',
              }}>
                <UserX size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--text-muted)' }} />
                <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No Flagged Agents</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                  All active agent identities are within safe behavioral score thresholds.
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Agent ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Risk Score</th>
                      <th>Decay Window</th>
                      <th>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(a => {
                      const pct = Math.min(100, Math.round((a.current_risk_score / 3.0) * 100));
                      const isHigh = a.current_risk_score >= 1.5;
                      return (
                        <tr key={a.id} className="animate-fade-in">
                          <td>
                            <span style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 4,
                              background: isHigh ? 'rgba(239,68,68,0.12)' : 'var(--bg-inner)',
                              border: `1px solid ${isHigh ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                              color: isHigh ? 'var(--status-critical)' : 'var(--text-primary)',
                            }}>
                              {a.id}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{a.name}</td>
                          <td>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: 9999,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: 'var(--bg-inner)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border)',
                            }}>
                              {a.type}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 60, height: 5, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: riskColor(a.current_risk_score), borderRadius: 4 }} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: riskColor(a.current_risk_score) }}>
                                {a.current_risk_score.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>
                              <Clock size={11} /> 24h active
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {a.last_risk_update_at ? new Date(a.last_risk_update_at).toLocaleTimeString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Engine health */}
          <div>
            <div className="section-header">
              <div className="section-title">Engine Health</div>
            </div>
            <SystemHealthCard />
          </div>
        </div>
      )}
    </div>
  );
};
