import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { DashboardStats, Pattern, Alert } from '../api/client';
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  Play,
  Bug,
  RefreshCw,
  ChevronRight,
  Eye,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { ThreatDetailsModal } from '../components/ThreatDetailsModal';

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

export const Dashboard: React.FC = () => {
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading]   = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selected, setSelected] = useState<Pattern | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [s, p, a] = await Promise.all([api.getStats(), api.getPatterns(), api.getAlerts()]);
      setStats(s);
      setPatterns(p);
      setAlerts(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  const handleReset = async () => {
    if (!window.confirm('Wipe all data and load 25 baseline sessions?')) return;
    setResetting(true);
    try { await api.resetDemo(); await fetchData(); }
    catch (e) { console.error(e); }
    finally { setResetting(false); }
  };

  /* ── Posture calculation ─────────────────────────────────────── */
  const critCount = patterns.filter(p => p.severity === 'CRITICAL').length;
  const highCount = patterns.filter(p => p.severity === 'HIGH').length;
  const postureLabel =
    critCount > 0 ? 'CRITICAL' :
    highCount > 0 ? 'HIGH' :
    patterns.length > 0 ? 'ELEVATED' : 'NORMAL';

  const postureClass =
    postureLabel === 'CRITICAL' ? 'critical' :
    postureLabel === 'HIGH'     ? 'high' :
    postureLabel === 'ELEVATED' ? 'elevated' : 'normal';

  const busy = analyzing || injecting || resetting;

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Cross-session behavioral security summary</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-sm" onClick={handleReset} disabled={busy}>
            <RefreshCw size={13} className={resetting ? 'animate-spin' : ''} />
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
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

      {loading && !stats ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading…</div>
        </div>
      ) : (
        <>
          {/* ── 3 Stat Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-3 mb-6">
            {/* Sessions */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <span className="stat-label">Total Sessions</span>
                <Activity size={16} color="var(--accent-blue)" />
              </div>
              <div className="stat-value">{stats?.total_sessions ?? 0}</div>
              <div className="stat-sub">Monitored &amp; vectorized</div>
            </div>

            {/* Clusters */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <span className="stat-label">Detected Clusters</span>
                <ShieldAlert size={16} color="var(--status-medium)" />
              </div>
              <div className="stat-value">{stats?.total_patterns ?? 0}</div>
              <div className="stat-sub">
                {patterns.length > 0 ? 'Anomaly clusters found' : 'Clean baseline'}
              </div>
            </div>

            {/* High / Critical */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-4">
                <span className="stat-label">High &amp; Critical</span>
                <AlertTriangle size={16} color="var(--status-critical)" />
              </div>
              <div
                className="stat-value"
                style={{ color: alerts.length > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}
              >
                {alerts.length}
              </div>
              <div className="stat-sub">
                {alerts.length > 0 ? 'Requires immediate attention' : 'No active alerts'}
              </div>
            </div>
          </div>

          {/* ── System Posture Hero ──────────────────────────────────── */}
          <div className="posture-hero mb-6">
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                System Threat Posture
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {postureLabel === 'NORMAL'
                  ? 'All sessions within normal behavioral variance.'
                  : `${patterns.length} adversarial clusters and ${alerts.length} alerts detected.`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`posture-status ${postureClass}`}>
                <span className={`pulse-dot ${postureLabel !== 'NORMAL' ? 'danger' : ''}`} />
                {postureLabel}
              </span>
              {(patterns.length > 0 || alerts.length > 0) && (
                <Link to="/alerts" className="btn btn-sm">
                  View Alerts <ChevronRight size={13} />
                </Link>
              )}
            </div>
          </div>

          {/* ── Detected Threats Table ──────────────────────────────── */}
          <div className="section-header">
            <div>
              <div className="section-title">Detected Behavioral Clusters</div>
              <div className="section-subtitle">Adversarial probing patterns extracted by SentenceTransformers &amp; DBSCAN</div>
            </div>
            {patterns.length > 0 && (
              <Link to="/threats" className="btn btn-sm">
                View all <ChevronRight size={13} />
              </Link>
            )}
          </div>

          {patterns.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 2rem',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-hover)',
              borderRadius: 'var(--radius-md)',
            }}>
              <ShieldCheck size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--status-low)' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>All Clear — Normal Baseline Active</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 1.5rem' }}>
                DBSCAN found zero adversarial clusters. Normal sessions are dispersed as benign variance.
              </div>
              <button className="btn btn-sm btn-danger" onClick={handleInject} disabled={busy}>
                <Bug size={13} /> Inject Coordinated Attack to Test Detection
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pattern Name</th>
                    <th>Severity</th>
                    <th>Sessions</th>
                    <th>Confidence</th>
                    <th>Detected</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patterns.slice(0, 8).map(p => (
                    <tr key={p.id} className="animate-fade-in">
                      <td>
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} color={severityColor(p.severity)} style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>
                            {p.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={getBadgeClass(p.severity)}>{p.severity}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.affected_sessions}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: 60, height: 5,
                            background: 'var(--border)',
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${p.confidence * 100}%`,
                              height: '100%',
                              background: severityColor(p.severity),
                              borderRadius: 4,
                            }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {(p.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(p.detected_at).toLocaleTimeString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button className="btn btn-sm" onClick={() => setSelected(p)}>
                            <Eye size={12} /> Inspect
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
        </>
      )}

      <ThreatDetailsModal pattern={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
