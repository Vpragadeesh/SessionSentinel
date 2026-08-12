import React, { useState, useEffect } from 'react';
import { api, type SessionItem } from '../api/client';
import { Search, CheckCircle2, ChevronRight, X, RefreshCw } from 'lucide-react';

export const SessionExplorer: React.FC = () => {
  const [sessions, setSessions]           = useState<SessionItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setSessions(await api.getSessions(0, 100));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleSelect = async (session: SessionItem) => {
    try {
      setDetailLoading(true);
      setSelectedSession(await api.getSession(session.id));
    } catch {
      setSelectedSession(session);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = sessions.filter(s =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.agent_id.toLowerCase().includes(search.toLowerCase()) ||
    (s.fingerprint && s.fingerprint.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Session Store</h1>
          <p className="page-subtitle">Inspect raw sessions, canonical fingerprint hashes, and tool call logs</p>
        </div>
        <button className="btn btn-sm" onClick={fetchSessions}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.25rem',
      }}>
        <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by Session ID, Agent ID, or fingerprint…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} / {sessions.length}
        </span>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 340px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.82rem' }}>Loading sessions…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No sessions match your filter.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Agent ID</th>
                  <th>Events</th>
                  <th>Started</th>
                  <th>Fingerprint</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(session => {
                  const isSelected = selectedSession?.id === session.id;
                  return (
                    <tr
                      key={session.id}
                      onClick={() => handleSelect(session)}
                      style={{ cursor: 'pointer', background: isSelected ? 'var(--bg-subtle)' : undefined }}
                    >
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
                        {session.id}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: 'var(--bg-inner)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          {session.agent_id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{session.event_count}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(session.started_at).toLocaleTimeString()}
                      </td>
                      <td>
                        <span className="flex items-center gap-1" style={{ fontSize: '0.75rem', color: session.fingerprint ? 'var(--status-low)' : 'var(--text-muted)' }}>
                          <CheckCircle2 size={11} />
                          {session.fingerprint ? 'Hash Ready' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm"
                          onClick={e => { e.stopPropagation(); handleSelect(session); }}
                        >
                          Inspect <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Inspector panel */}
        {selectedSession && (
          <div className="card" style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div className="flex justify-between items-start">
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Session Inspector
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>
                  {selectedSession.id}
                </div>
              </div>
              <button className="btn btn-sm" style={{ padding: '0.3rem' }} onClick={() => setSelectedSession(null)}>
                <X size={14} />
              </button>
            </div>

            {/* Metadata row */}
            <div className="grid grid-cols-2">
              <div style={{ padding: '0.65rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Agent</div>
                <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                  {selectedSession.agent_id}
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Events</div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginTop: '0.2rem' }}>{selectedSession.event_count}</div>
              </div>
            </div>

            {/* Fingerprint */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Canonical Fingerprint
              </div>
              <div style={{
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-terminal)',
                border: '1px solid var(--border)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.72rem',
                color: 'var(--accent-cyan)',
                wordBreak: 'break-all',
                lineHeight: 1.45,
              }}>
                {selectedSession.fingerprint || 'No canonical hash generated yet.'}
              </div>
            </div>

            {/* Events */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Event Log ({selectedSession.events?.length ?? 0})
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {detailLoading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '1rem' }}>Loading…</div>
                ) : !selectedSession.events?.length ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '1rem' }}>
                    No tool events recorded.
                  </div>
                ) : (
                  selectedSession.events.map(evt => (
                    <div key={evt.id} style={{
                      padding: '0.55rem 0.7rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-inner)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                    }}>
                      <div className="flex justify-between items-center mb-1">
                        <span style={{ fontWeight: 600, color: 'var(--accent-purple)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {evt.tool ?? evt.type}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {evt.resource && (
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', fontSize: '0.68rem', wordBreak: 'break-all' }}>
                          {evt.resource}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
