import React, { useEffect, useState } from 'react';
import { api, type GuardrailStats } from '../api/client';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, BarChart2 } from 'lucide-react';

export const GuardrailsPage: React.FC = () => {
  const [stats, setStats] = useState<GuardrailStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try { setStats(await api.getGuardrailStats()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Guardrail Analytics</h1>
          <p className="page-subtitle">Platform-wide telemetry linking low-level guardrails to behavioral detection</p>
        </div>
        <button className="btn btn-sm" onClick={fetchData}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading && !stats ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading analytics…</div>
        </div>
      ) : stats ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Total Events</span>
                <BarChart2 size={16} color="var(--accent-blue)" />
              </div>
              <div className="stat-value">{stats.total_events}</div>
              <div className="stat-sub">Across all monitored sessions</div>
            </div>
            
            <div className="stat-card" style={{ borderTop: '3px solid var(--status-low)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">ALLOW</span>
                <CheckCircle size={16} color="var(--status-low)" />
              </div>
              <div className="stat-value">{stats.allow_count}</div>
              <div className="stat-sub">Passed without intervention</div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid var(--status-medium)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">WARN</span>
                <AlertTriangle size={16} color="var(--status-medium)" />
              </div>
              <div className="stat-value">{stats.warn_count}</div>
              <div className="stat-sub">Flagged but allowed</div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid var(--status-critical)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">BLOCK</span>
                <XCircle size={16} color="var(--status-critical)" />
              </div>
              <div className="stat-value">{stats.block_count}</div>
              <div className="stat-sub">Blocked by security policy</div>
            </div>
          </div>

          {/* Block Distribution */}
          <div className="section-header">
            <div>
              <div className="section-title">BLOCK Distribution by Technique</div>
              <div className="section-subtitle">Understanding which behavioral patterns are driving guardrail interventions</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Behavioral Technique</th>
                  <th style={{ textAlign: 'right' }}>Blocked Events</th>
                  <th style={{ width: '40%' }}>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.block_distribution).length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No blocked events have been attributed to detected techniques yet.
                    </td>
                  </tr>
                ) : (
                  Object.entries(stats.block_distribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tech, count]) => {
                      const percentage = stats.block_count > 0 ? (count / stats.block_count) * 100 : 0;
                      return (
                        <tr key={tech}>
                          <td style={{ fontWeight: 600 }}>{tech}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--status-critical)' }}>{count}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--status-critical)', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '35px', textAlign: 'right' }}>
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
};
