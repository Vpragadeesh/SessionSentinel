import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Pattern } from '../api/client';
import { ThreatVectorsGrid } from '../components/ThreatVectorsGrid';
import { ThreatDetailsModal } from '../components/ThreatDetailsModal';
import { LiveTelemetryFeed } from '../components/LiveTelemetryFeed';
import {
  ChevronRight,
  Eye,
  AlertCircle,
  RefreshCw,
  Bug,
  Play,
  ShieldCheck,
} from 'lucide-react';

const severityColor = (s: string) => {
  switch (s) {
    case 'CRITICAL': return 'var(--status-critical)';
    case 'HIGH':     return 'var(--status-high)';
    case 'MEDIUM':   return 'var(--status-medium)';
    default:         return 'var(--status-low)';
  }
};

const getBadgeClass = (s: string) => {
  switch (s.toUpperCase()) {
    case 'CRITICAL': return 'badge badge-critical';
    case 'HIGH':     return 'badge badge-high';
    case 'MEDIUM':   return 'badge badge-medium';
    default:         return 'badge badge-low';
  }
};

export const ThreatsPage: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading]   = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [selected, setSelected] = useState<Pattern | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try { setPatterns(await api.getPatterns()); }
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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Threats</h1>
          <p className="page-subtitle">Adversarial cluster analysis &amp; vector breakdown</p>
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
          <div style={{ fontSize: '0.85rem' }}>Loading…</div>
        </div>
      ) : (
        <>
          {/* Attack Vector Matrix */}
          <div className="section-header">
            <div>
              <div className="section-title">Attack Vector Matrix</div>
              <div className="section-subtitle">
                Four adversarial techniques tracked across all active sessions
              </div>
            </div>
          </div>
          <div className="mb-8">
            <ThreatVectorsGrid patterns={patterns} />
          </div>

          {/* Two-column layout: table + telemetry */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
            {/* Full Pattern Table */}
            <div>
              <div className="section-header">
                <div>
                  <div className="section-title">Detected Clusters</div>
                  <div className="section-subtitle">{patterns.length} pattern{patterns.length !== 1 ? 's' : ''} identified by DBSCAN</div>
                </div>
              </div>

              {patterns.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border-hover)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <ShieldCheck size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--status-low)' }} />
                  <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No Clusters Detected</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto 1.5rem' }}>
                    Inject an attack to trigger DBSCAN clustering, then run the analysis pipeline.
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={handleInject} disabled={busy}>
                    <Bug size={13} /> Inject Coordinated Attack
                  </button>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pattern</th>
                        <th>Severity</th>
                        <th>Sessions</th>
                        <th>Agents</th>
                        <th>Confidence</th>
                        <th>Common Tools</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patterns.map(p => (
                        <tr key={p.id} className="animate-fade-in">
                          <td>
                            <div className="flex items-center gap-2">
                              <AlertCircle size={13} color={severityColor(p.severity)} style={{ flexShrink: 0 }} />
                              <span style={{ fontWeight: 500 }}>
                                {p.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          </td>
                          <td><span className={getBadgeClass(p.severity)}>{p.severity}</span></td>
                          <td style={{ fontWeight: 600 }}>{p.affected_sessions}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{p.affected_agents}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 48, height: 4, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${p.confidence * 100}%`, height: '100%', background: severityColor(p.severity), borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {(p.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {p.common_tools.slice(0, 2).map(t => (
                                <span key={t} style={{
                                  fontSize: '0.68rem',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: 4,
                                  background: 'var(--bg-inner)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-muted)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}>
                                  {t}
                                </span>
                              ))}
                              {p.common_tools.length > 2 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  +{p.common_tools.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2 justify-end">
                              <button className="btn btn-sm" onClick={() => setSelected(p)}>
                                <Eye size={12} />
                              </button>
                              <Link to={`/pattern/${p.id}`} className="btn btn-sm btn-primary">
                                Graph <ChevronRight size={12} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live Telemetry sidebar */}
            <div>
              <div className="section-header">
                <div className="section-title">Live Telemetry</div>
              </div>
              <LiveTelemetryFeed patterns={patterns} />
            </div>
          </div>
        </>
      )}

      <ThreatDetailsModal pattern={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
