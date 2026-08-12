import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Pattern } from '../api/client';
import { SessionGraph } from '../components/SessionGraph';
import { ArrowLeft, BrainCircuit, RefreshCw } from 'lucide-react';

export const PatternDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);

  const fetchPattern = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setPattern(await api.getPattern(id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPattern(); }, [id]);

  const handleExplain = async () => {
    if (!id || !pattern) return;
    setExplaining(true);
    try {
      const result = await api.explainPattern(id);
      setPattern({ ...pattern, llm_explanation: result.explanation });
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  };

  if (loading || !pattern) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ fontSize: '0.85rem' }}>Loading pattern…</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <Link
            to="/threats"
            className="flex items-center gap-1"
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'inline-flex' }}
          >
            <ArrowLeft size={13} /> Back to Threats
          </Link>
          <h1 className="page-title">
            {pattern.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h1>
          <p className="page-subtitle">
            Detected {new Date(pattern.detected_at).toLocaleString()} · Confidence {(pattern.confidence * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge badge-${pattern.severity.toLowerCase()}`}>
            {pattern.severity} RISK
          </span>
          {pattern.risk_score !== null && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Score: {pattern.risk_score.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Top row: LLM explanation + impact */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* LLM Explanation */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2" style={{ fontWeight: 600 }}>
              <BrainCircuit size={16} color="var(--accent-purple)" />
              AI Security Analysis
            </div>
            <button className="btn btn-sm" onClick={handleExplain} disabled={explaining}>
              <RefreshCw size={12} className={explaining ? 'animate-spin' : ''} />
              {explaining ? 'Analyzing…' : 'Regenerate'}
            </button>
          </div>
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-inner)',
            border: '1px solid var(--border)',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: 'var(--text-primary)',
          }}>
            {pattern.llm_explanation || 'No explanation generated yet. Click Regenerate to analyze with LLM.'}
          </div>
        </div>

        {/* Impact Summary */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Impact Summary</div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>
              Affected Sessions
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{pattern.affected_sessions}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>
              Affected Agents
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{pattern.affected_agents}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.45rem' }}>
              Common Tools
            </div>
            <div className="flex flex-wrap gap-1">
              {pattern.common_tools.map(tool => (
                <span key={tool} style={{
                  padding: '0.15rem 0.45rem',
                  borderRadius: 4,
                  background: 'var(--bg-inner)',
                  border: '1px solid var(--border)',
                  fontSize: '0.72rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-secondary)',
                }}>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Sequence */}
      <div className="card mb-6">
        <div style={{ fontWeight: 600, marginBottom: '0.85rem' }}>Identified Action Sequence</div>
        <div className="flex flex-wrap items-center gap-2">
          {pattern.common_actions.map((action, idx) => (
            <React.Fragment key={idx}>
              <span style={{
                padding: '0.3rem 0.75rem',
                borderRadius: 6,
                background: 'var(--bg-inner)',
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                color: 'var(--accent-purple)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {action}
              </span>
              {idx < pattern.common_actions.length - 1 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Cross-Session Graph */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Cross-Session Correlation Graph</div>
        <SessionGraph pattern={pattern} />
      </div>
    </div>
  );
};
