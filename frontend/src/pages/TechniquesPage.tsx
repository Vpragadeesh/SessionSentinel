import React, { useEffect, useState } from 'react';
import { api, type Alert } from '../api/client';
import { ShieldAlert, RefreshCw, ChevronRight } from 'lucide-react';

const severityColor = (s: string) => {
  switch (s.toUpperCase()) {
    case 'CRITICAL': return 'var(--status-critical)';
    case 'HIGH':     return 'var(--status-high)';
    case 'MEDIUM':   return 'var(--status-medium)';
    default:         return 'var(--status-low)';
  }
};

export const TechniquesPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try { setAlerts(await api.getAlerts()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Aggregate alerts by technique
  const techniques = Array.from(new Set(alerts.map(a => a.technique)));
  
  const getTechStats = (tech: string) => {
    const techAlerts = alerts.filter(a => a.technique === tech);
    const maxScore = Math.max(...techAlerts.map(a => a.risk_score));
    const avgScore = techAlerts.reduce((sum, a) => sum + a.risk_score, 0) / techAlerts.length;
    const hasCritical = techAlerts.some(a => a.severity === 'CRITICAL');
    const hasHigh = techAlerts.some(a => a.severity === 'HIGH');
    const severity = hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'MEDIUM';
    const totalSessions = techAlerts.reduce((sum, a) => sum + (a.evidence?.sessions_analyzed || 1), 0);
    const blockedCount = techAlerts.reduce((sum, a) => sum + (a.evidence?.blocked_events || 0), 0);
    const similarity = techAlerts[0]?.evidence?.avg_similarity || 0;
    const repetition = techAlerts[0]?.evidence?.repetition_score || 0;
    const affectedAgents = Array.from(new Set(techAlerts.map(a => a.agent_id)));
    
    return {
      alerts: techAlerts,
      maxScore,
      avgScore,
      severity,
      totalSessions,
      blockedCount,
      similarity,
      repetition,
      affectedAgents
    };
  };

  const selectedStats = selectedTech ? getTechStats(selectedTech) : null;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Technique Analytics</h1>
          <p className="page-subtitle">Deep dive into detected behavioral techniques</p>
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
      ) : techniques.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px dashed var(--border-hover)', borderRadius: 'var(--radius-md)' }}>
          <ShieldAlert size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--text-muted)' }} />
          <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No Techniques Detected</div>
          <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            There are no active security alerts matching known adversarial behaviors.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Column: Technique List */}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Technique</th>
                  <th>Detections</th>
                  <th>Avg Score</th>
                  <th>Max Severity</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {techniques.map(tech => {
                  const stats = getTechStats(tech);
                  const isSelected = selectedTech === tech;
                  
                  return (
                    <tr 
                      key={tech} 
                      onClick={() => setSelectedTech(tech)}
                      style={{ cursor: 'pointer', background: isSelected ? 'var(--bg-subtle)' : undefined }}
                    >
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tech}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{stats.alerts.length}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                          {stats.avgScore.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${stats.severity.toLowerCase()}`}>
                          {stats.severity}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedTech(tech); }}>
                          Inspect <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right Column: Technique Details */}
          {selectedStats && selectedTech && (
            <div className="card animate-fade-in" style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Technique Analytics
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTech.toUpperCase()}
                </h2>
              </div>

              {/* Score Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Max Detection Score</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: severityColor(selectedStats.severity) }}>
                    {selectedStats.maxScore.toFixed(2)} / 1.00
                  </span>
                </div>
                <div style={{ 
                  fontFamily: 'JetBrains Mono, monospace', 
                  fontSize: '1rem', 
                  letterSpacing: '2px',
                  color: severityColor(selectedStats.severity)
                }}>
                  {'█'.repeat(Math.round(selectedStats.maxScore * 20))}{'░'.repeat(20 - Math.round(selectedStats.maxScore * 20))}
                </div>
              </div>

              {/* Evidence */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                  Aggregated Evidence
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div style={{ padding: '0.75rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sessions</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedStats.totalSessions}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Blocked</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--status-high)' }}>{selectedStats.blockedCount}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Avg Similarity</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedStats.similarity.toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Repetition</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedStats.repetition.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Affected Agents */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                  Affected Agents ({selectedStats.affectedAgents.length})
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedStats.affectedAgents.map(agent => (
                    <span key={agent} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-inner)', border: '1px solid var(--border)', borderRadius: 4 }}>
                      {agent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                  Timeline
                </h3>
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                  {selectedStats.alerts.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.5rem', background: 'var(--bg-inner)', borderRadius: 4, borderLeft: `2px solid ${severityColor(a.severity)}` }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{a.agent_id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
