import React, { useEffect, useState } from 'react';
import { Terminal, Radio, RefreshCw } from 'lucide-react';
import type { Pattern } from '../api/client';

interface LiveTelemetryFeedProps {
  patterns: Pattern[];
}

interface TelemetryEntry {
  id: string;
  time: string;
  type: 'TOOL_CALL' | 'GUARDRAIL' | 'CLUSTER' | 'DECAY' | 'SYSTEM';
  tagColor: string;
  text: string;
}

export const LiveTelemetryFeed: React.FC<LiveTelemetryFeedProps> = ({ patterns }) => {
  const [entries, setEntries] = useState<TelemetryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const generateInitialTelemetry = () => {
    const now = new Date();
    const mockLogs: TelemetryEntry[] = [];

    if (patterns.length > 0) {
      patterns.forEach((p, idx) => {
        mockLogs.push({
          id: `cluster-${p.id}-${idx}`,
          time: new Date(now.getTime() - idx * 12000).toLocaleTimeString(),
          type: 'CLUSTER',
          tagColor: p.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-high)',
          text: `[DBSCAN Alert] Pattern identified: "${p.name}" across ${p.affected_sessions} sessions (${(p.confidence * 100).toFixed(0)}% similarity)`
        });
      });
    }

    mockLogs.push(
      {
        id: 'tel-1',
        time: new Date(now.getTime() - 25000).toLocaleTimeString(),
        type: 'GUARDRAIL',
        tagColor: 'var(--accent-purple)',
        text: 'Session event evaluated: tool_call -> "get_password_reset_link" [VERDICT: LOGGED_TELEMETRY]'
      },
      {
        id: 'tel-2',
        time: new Date(now.getTime() - 48000).toLocaleTimeString(),
        type: 'TOOL_CALL',
        tagColor: 'var(--accent-blue)',
        text: 'Fingerprint canonical hash generated: all-MiniLM-L6-v2 vector dimension [384]'
      },
      {
        id: 'tel-3',
        time: new Date(now.getTime() - 95000).toLocaleTimeString(),
        type: 'DECAY',
        tagColor: 'var(--status-low)',
        text: 'Inactivity Window Monitor: 0 stale agent risk scores decayed (window: 24.0h)'
      },
      {
        id: 'tel-4',
        time: new Date(now.getTime() - 140000).toLocaleTimeString(),
        type: 'SYSTEM',
        tagColor: 'var(--accent-cyan)',
        text: 'SentenceTransformer background listener ready • Streaming SSE channels active'
      }
    );

    setEntries(mockLogs);
  };

  useEffect(() => {
    generateInitialTelemetry();
  }, [patterns]);

  const handleRefresh = () => {
    setLoading(true);
    generateInitialTelemetry();
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <div className="telemetry-terminal glass-panel" style={{ padding: 0 }}>
      <div className="telemetry-header">
        <div className="flex items-center gap-2">
          <Terminal size={14} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Live Audit Telemetry</span>
          <span className="flex items-center gap-1" style={{ color: 'var(--status-low)', fontSize: '0.7rem' }}>
            <Radio size={11} className="animate-pulse" /> LIVE STREAM
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="btn"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: '24px', background: 'transparent' }}
          title="Refresh Telemetry"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="telemetry-body">
        {entries.map((entry) => (
          <div key={entry.id} className="telemetry-row">
            <span className="telemetry-time">[{entry.time}]</span>
            <span 
              className="telemetry-tag" 
              style={{ 
                background: `${entry.tagColor}26`, 
                color: entry.tagColor,
                border: `1px solid ${entry.tagColor}40`
              }}
            >
              {entry.type}
            </span>
            <span className="telemetry-text">{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
