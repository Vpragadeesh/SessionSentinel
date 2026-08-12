import React from 'react';
import { Target, KeyRound, Layers, Database } from 'lucide-react';
import type { Pattern } from '../api/client';

interface ThreatVectorsGridProps {
  patterns: Pattern[];
}

export const ThreatVectorsGrid: React.FC<ThreatVectorsGridProps> = ({ patterns }) => {
  // Categorize patterns into core vectors
  const probingPatterns = patterns.filter(p => 
    p.name.toLowerCase().includes('probing') || p.name.toLowerCase().includes('boundary')
  );
  const escalationPatterns = patterns.filter(p => 
    p.name.toLowerCase().includes('escalat') || p.name.toLowerCase().includes('privilege') || p.name.toLowerCase().includes('admin')
  );
  const enumPatterns = patterns.filter(p => 
    p.name.toLowerCase().includes('enumerat') || p.name.toLowerCase().includes('tool') || p.name.toLowerCase().includes('scan')
  );
  const harvestPatterns = patterns.filter(p => 
    p.name.toLowerCase().includes('harvest') || p.name.toLowerCase().includes('credential') || p.name.toLowerCase().includes('data')
  );

  const vectors = [
    {
      id: 'probing',
      title: 'Boundary Probing',
      description: 'Repeated semantically variant prompts testing LLM guardrail policy thresholds.',
      icon: Target,
      color: 'var(--accent-blue)',
      patterns: probingPatterns,
      sessionsCount: probingPatterns.reduce((acc, p) => acc + p.affected_sessions, 0)
    },
    {
      id: 'harvesting',
      title: 'Credential Harvesting',
      description: 'Distributed extraction of sensitive user profiles, password resets, and PII tokens.',
      icon: KeyRound,
      color: 'var(--status-critical)',
      patterns: harvestPatterns,
      sessionsCount: harvestPatterns.reduce((acc, p) => acc + p.affected_sessions, 0)
    },
    {
      id: 'enumeration',
      title: 'Tool Enumeration',
      description: 'Systematic invocation of internal function tools across rotating agent sessions.',
      icon: Layers,
      color: 'var(--accent-purple)',
      patterns: enumPatterns,
      sessionsCount: enumPatterns.reduce((acc, p) => acc + p.affected_sessions, 0)
    },
    {
      id: 'escalation',
      title: 'Privilege Escalation',
      description: 'Multi-step behavioral advancement attempting higher capability tool executions.',
      icon: Database,
      color: 'var(--accent-cyan)',
      patterns: escalationPatterns,
      sessionsCount: escalationPatterns.reduce((acc, p) => acc + p.affected_sessions, 0)
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {vectors.map(vec => {
        const Icon = vec.icon;
        const hasThreat = vec.patterns.length > 0;
        const maxSeverity = vec.patterns.some(p => p.severity === 'CRITICAL')
          ? 'CRITICAL'
          : vec.patterns.some(p => p.severity === 'HIGH')
          ? 'HIGH'
          : vec.patterns.some(p => p.severity === 'MEDIUM')
          ? 'MEDIUM'
          : 'NORMAL';

        return (
          <div key={vec.id} className="vector-card">
            <div className="flex items-center justify-between">
              <div className="vector-icon-wrap" style={{ background: `${vec.color}1a`, color: vec.color }}>
                <Icon size={18} />
              </div>
              <span className={`badge ${
                maxSeverity === 'CRITICAL' ? 'badge-critical' :
                maxSeverity === 'HIGH' ? 'badge-high' :
                maxSeverity === 'MEDIUM' ? 'badge-medium' :
                'badge-low'
              }`}>
                {maxSeverity === 'NORMAL' ? 'CLEAR' : maxSeverity}
              </span>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.2rem' }}>{vec.title}</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {vec.description}
              </p>
            </div>

            <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Detected Clusters:</span>
              <strong style={{ color: hasThreat ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {vec.patterns.length} ({vec.sessionsCount} sessions)
              </strong>
            </div>
          </div>
        );
      })}
    </div>
  );
};
