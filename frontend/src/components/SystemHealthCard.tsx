import React from 'react';
import { Cpu, Zap, Clock, Server, CheckCircle2 } from 'lucide-react';

export const SystemHealthCard: React.FC = () => {
  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu size={16} color="var(--accent-blue)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Engine Diagnostics</h4>
          </div>
          <div className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'var(--status-low)', fontWeight: 600 }}>
            <CheckCircle2 size={13} /> HEALTHY
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Zap size={13} color="var(--accent-purple)" /> Clustering Engine:
            </span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
              DBSCAN (eps=0.35)
            </span>
          </div>

          <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Server size={13} color="var(--accent-cyan)" /> Embedding Vector:
            </span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
              all-MiniLM-L6-v2 (384d)
            </span>
          </div>

          <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={13} color="var(--accent-emerald)" /> Inactivity Reset:
            </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              24h Decay Window
            </span>
          </div>

          <div className="flex justify-between items-center" style={{ fontSize: '0.8rem' }}>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Cpu size={13} color="var(--status-high)" /> LLM Intelligence:
            </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              NVIDIA NIM (Llama 3.1)
            </span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '1rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <span>Cross-Session Correlator: ACTIVE</span>
        <span style={{ color: 'var(--status-low)', fontWeight: 600 }}>0 False Positives</span>
      </div>
    </div>
  );
};
