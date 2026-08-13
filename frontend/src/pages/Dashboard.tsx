import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Alert, AgentRisk, GuardrailStats } from '../api/client';
import {
  Activity,
  AlertTriangle,
  Play,
  Bug,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Users,
  TerminalSquare
} from 'lucide-react';

const severityColor = (s: string) => {
  switch (s.toUpperCase()) {
    case 'CRITICAL': return 'var(--status-critical)';
    case 'HIGH':     return 'var(--status-high)';
    case 'MEDIUM':   return 'var(--status-medium)';
    default:         return 'var(--status-low)';
  }
};

export const Dashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [agents, setAgents] = useState<AgentRisk[]>([]);
  const [guardrails, setGuardrails] = useState<GuardrailStats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, ag, g] = await Promise.all([
        api.getAlerts(), 
        api.getAgents(),
        api.getGuardrailStats()
      ]);
      setAlerts(a);
      setAgents(ag);
      setGuardrails(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try { 
      await api.runAnalysis(); 
      await fetchData(); 
      window.dispatchEvent(new Event('dashboard-update'));
    }
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

  /* ── Metric calculations ─────────────────────────────────────── */
  const activeAlertsCount = alerts.filter(a => a.status !== 'resolved').length;
  const riskyAgentsCount = agents.filter(a => a.current_risk_score >= 0.5).length;
  const uniqueTechniques = Array.from(new Set(alerts.map(a => a.technique))).length;
  const blockRate = guardrails && guardrails.total_events > 0 
    ? (guardrails.block_count / guardrails.total_events) * 100 
    : 0;

  const hasCritical = alerts.some(a => a.severity === 'CRITICAL' && a.status !== 'resolved');
  const hasHigh = alerts.some(a => a.severity === 'HIGH' && a.status !== 'resolved');
  
  const postureLabel =
    hasCritical ? 'CRITICAL' :
    hasHigh ? 'HIGH' :
    activeAlertsCount > 0 ? 'ELEVATED' : 'NORMAL';

  const postureColor = severityColor(postureLabel);
  const busy = analyzing || injecting || resetting;

  // Top Techniques sorted by block count from Guardrails
  const topTechniques = guardrails ? 
    Object.entries(guardrails.block_distribution)
      .filter(([k]) => k !== 'Uncategorized')
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
    : [];

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Session Sentinel</h1>
          <p className="page-subtitle">Behavioral guardrails & threat detection</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={handleReset} disabled={busy}>
            {resetting ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Reset Env
          </button>
          <button className="btn" onClick={handleInject} disabled={busy}>
            {injecting ? <RefreshCw size={13} className="animate-spin" /> : <Bug size={13} />}
            Inject Attack
          </button>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={busy}>
            {analyzing ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
            Run Pipeline
          </button>
        </div>
      </div>

      {loading && !guardrails ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <div style={{ fontSize: '0.85rem' }}>Loading dashboard…</div>
        </div>
      ) : (
        <>
          {/* ── System Posture Banner ────────────────────────────────────── */}
          <div className="card" style={{ 
            background: `linear-gradient(to right, ${postureColor}15, transparent)`, 
            borderLeft: `4px solid ${postureColor}`,
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                System Threat Posture
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: postureColor }}>
                {postureLabel}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{activeAlertsCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Alerts</div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{riskyAgentsCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Risky Agents</div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{uniqueTechniques}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Techniques</div>
              </div>
            </div>
          </div>

          {/* ── Metric Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Active Alerts</span>
                <ShieldAlert size={16} color="var(--status-critical)" />
              </div>
              <div className="stat-value">{activeAlertsCount}</div>
              <div className="stat-sub">Requires triage</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Risky Agents</span>
                <Users size={16} color="var(--status-high)" />
              </div>
              <div className="stat-value">{riskyAgentsCount}</div>
              <div className="stat-sub">Score &ge; 0.50</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Techniques</span>
                <Activity size={16} color="var(--accent-blue)" />
              </div>
              <div className="stat-value">{uniqueTechniques}</div>
              <div className="stat-sub">Distinct behaviors</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Block Rate</span>
                <TerminalSquare size={16} color="var(--text-primary)" />
              </div>
              <div className="stat-value">{blockRate.toFixed(1)}%</div>
              <div className="stat-sub">Guardrail interventions</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            {/* ── Top Threat Techniques ────────────────────────────────────── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Top Threat Techniques</h2>
                <Link to="/techniques" className="btn btn-sm">
                  View All <ChevronRight size={12} />
                </Link>
              </div>

              {topTechniques.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  <ShieldCheck size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.85rem' }}>No active threats detected</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topTechniques.map(([tech, blocks]) => (
                    <div key={tech} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{tech}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Driving guardrail blocks</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--status-critical)' }}>{blocks}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Blocked Events</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Recent Critical Alerts ────────────────────────────────────── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Recent Alerts</h2>
                <Link to="/alerts" className="btn btn-sm">
                  Alert Center <ChevronRight size={12} />
                </Link>
              </div>

              {alerts.filter(a => a.status !== 'resolved').length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  <ShieldCheck size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.85rem' }}>Inbox zero</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {alerts.filter(a => a.status !== 'resolved').slice(0, 4).map(alert => (
                    <div key={alert.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${severityColor(alert.severity)}` }}>
                      <AlertTriangle size={16} color={severityColor(alert.severity)} style={{ marginTop: '0.1rem' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{alert.technique}</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {alert.agent_id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {alert.summary}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </>
      )}
    </div>
  );
};
