import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Alert } from '../api/client';
import { RefreshCw, CheckCircle, Clock, ChevronRight, Filter } from 'lucide-react';

const severityColor = (sev: string) => {
  if (sev === 'CRITICAL') return 'var(--status-critical)';
  if (sev === 'HIGH') return 'var(--status-high)';
  if (sev === 'MEDIUM') return 'var(--status-medium)';
  return 'var(--status-low)';
};

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');

  const fetchData = async () => {
    setLoading(true);
    try { setAlerts(await api.getAlerts()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleResolve = async (id: string) => {
    // Optimistic local update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
    try {
      await api.updateAlert(id, 'resolved');
    } catch (e) {
      console.error('Failed to resolve alert', e);
      // Revert on failure
      fetchData();
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const sevMatch = filterSeverity === 'ALL' || a.severity === filterSeverity;
    const statMatch = filterStatus === 'ALL' || (filterStatus === 'OPEN' ? a.status !== 'resolved' : a.status === 'resolved');
    return sevMatch && statMatch;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alert Center</h1>
          <p className="page-subtitle">Triage and resolve behavioral security detections</p>
        </div>
        <button className="btn btn-sm" onClick={fetchData}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '2rem', padding: '1rem', background: 'var(--bg-card)', 
        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Filter size={15} />
        </div>
        
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity:</span>
          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(sev => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                style={{
                  fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 4,
                  background: filterSeverity === sev ? 'var(--bg-subtle)' : 'transparent',
                  color: filterSeverity === sev ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: `1px solid ${filterSeverity === sev ? 'var(--border)' : 'transparent'}`,
                  fontWeight: filterSeverity === sev ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status:</span>
          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
            {['ALL', 'OPEN', 'RESOLVED'].map(stat => (
              <button
                key={stat}
                onClick={() => setFilterStatus(stat)}
                style={{
                  fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 4,
                  background: filterStatus === stat ? 'var(--bg-subtle)' : 'transparent',
                  color: filterStatus === stat ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: `1px solid ${filterStatus === stat ? 'var(--border)' : 'transparent'}`,
                  fontWeight: filterStatus === stat ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading alerts…</div>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px dashed var(--border-hover)', borderRadius: 'var(--radius-md)' }}>
          <CheckCircle size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--status-low)' }} />
          <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No Alerts Match Criteria</div>
          <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Try adjusting your filters to see more results.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.25rem' }}>
          {filteredAlerts.map(alert => {
            const isResolved = alert.status === 'resolved';
            const evidence = alert.evidence || {};
            
            return (
              <div key={alert.id} className="card animate-fade-in" style={{ 
                borderLeft: `4px solid ${isResolved ? 'var(--border)' : severityColor(alert.severity)}`,
                opacity: isResolved ? 0.6 : 1,
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <span className={`badge badge-${alert.severity.toLowerCase()}`} style={{ fontSize: '0.65rem', marginBottom: '0.5rem', display: 'inline-block' }}>
                      {alert.severity}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {alert.technique}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Risk Score</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: isResolved ? 'var(--text-muted)' : severityColor(alert.severity) }}>
                      {alert.risk_score.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  {alert.summary}
                </div>
                
                {/* Agent & Evidence Block */}
                <div style={{ background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '0.75rem', marginBottom: '1rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agent ID</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {alert.agent_id}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Telemetry Evidence
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Sessions:</span>
                      <span style={{ fontWeight: 600 }}>{evidence.sessions_analyzed || 1}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Blocked:</span>
                      <span style={{ fontWeight: 600 }}>{evidence.blocked_events || 0}</span>
                    </div>
                    {evidence.avg_similarity && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Similarity:</span>
                        <span style={{ fontWeight: 600 }}>{evidence.avg_similarity.toFixed(2)}</span>
                      </div>
                    )}
                    {evidence.repetition_score && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Repetition:</span>
                        <span style={{ fontWeight: 600 }}>{evidence.repetition_score.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} /> {new Date(alert.created_at).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isResolved && (
                      <button className="btn btn-sm" onClick={() => handleResolve(alert.id)}>
                        <CheckCircle size={12} /> Resolve
                      </button>
                    )}
                    <button className="btn btn-sm btn-primary">
                      View Agent <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
