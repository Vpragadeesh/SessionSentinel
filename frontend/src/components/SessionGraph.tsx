import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import type { Pattern } from '../api/client';

interface Props {
  pattern: Pattern;
}

export const SessionGraph: React.FC<Props> = ({ pattern }) => {
  const { nodes, edges } = useMemo(() => {
    const nds: Node[] = [];
    const eds: Edge[] = [];
    
    // Pattern Center Node
    nds.push({
      id: 'pattern-center',
      type: 'default',
      position: { x: 400, y: 250 },
      data: { 
        label: (
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <strong style={{ display: 'block', marginBottom: '5px', color: 'var(--text-primary)' }}>{pattern.name.replace(/_/g, ' ')}</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{pattern.affected_sessions} Sessions</span>
          </div>
        )
      },
      style: {
        background: 'var(--bg-card-hover)',
        border: '2px solid var(--accent-blue)',
        borderRadius: '12px',
        color: 'var(--text-primary)',
        width: 200,
        boxShadow: 'var(--glass-shadow)'
      }
    });

    // Create session nodes spreading around the center
    // If there are too many sessions, just show a sample of up to 10
    const sampleSize = Math.min(pattern.affected_sessions, 10);
    const radius = 250;
    
    for (let i = 0; i < sampleSize; i++) {
      const angle = (i / sampleSize) * 2 * Math.PI;
      const x = 400 + radius * Math.cos(angle);
      const y = 250 + radius * Math.sin(angle);
      
      const sessionId = `session-${i}`;
      
      nds.push({
        id: sessionId,
        position: { x, y },
        data: { label: `Session ${i + 1}` },
        style: {
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
          borderRadius: '8px',
          padding: '8px',
          width: 120,
        }
      });
      
      eds.push({
        id: `e-${sessionId}-pattern`,
        source: sessionId,
        target: 'pattern-center',
        animated: true,
        style: { stroke: 'var(--accent-blue)', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--accent-blue)',
        },
      });
    }
    
    // If there are more sessions not shown, add an indicator node
    if (pattern.affected_sessions > sampleSize) {
      nds.push({
        id: 'more-sessions',
        position: { x: 400, y: 550 },
        data: { label: `+ ${pattern.affected_sessions - sampleSize} more sessions...` },
        style: {
          background: 'var(--bg-subtle)',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-secondary)',
          borderRadius: '8px',
          width: 200,
        }
      });
      
      eds.push({
        id: `e-more-pattern`,
        source: 'more-sessions',
        target: 'pattern-center',
        style: { stroke: 'var(--border-hover)', strokeDasharray: '5,5' },
      });
    }

    return { nodes: nds, edges: eds };
  }, [pattern]);

  return (
    <div style={{ height: '600px', width: '100%', borderRadius: '12px', overflow: 'hidden' }} className="glass-panel">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-color)" gap={16} />
        <Controls style={{ background: 'var(--bg-card)', fill: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
      </ReactFlow>
    </div>
  );
};
