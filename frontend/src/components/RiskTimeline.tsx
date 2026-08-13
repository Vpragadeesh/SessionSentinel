import React, { useMemo } from 'react';
import type { Alert, SessionItem } from '../api/client';

interface RiskTimelineProps {
  alerts: Alert[];
  sessions: SessionItem[];
}

export const RiskTimeline: React.FC<RiskTimelineProps> = ({ alerts, sessions }) => {
  // We want to graph the progression over time. 
  // For each session, calculate the cumulative risk up to that session's end time.
  // We'll approximate this by mapping alerts that occurred during/after that session.
  
  const timelineData = useMemo(() => {
    // Sort sessions by start time
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    
    // Sort alerts by created_at
    const sortedAlerts = [...alerts].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let currentRisk = 0;
    const points = sortedSessions.map((session, index) => {
      const sessionTime = new Date(session.started_at).getTime();
      
      // Find all alerts up to this session's time that we haven't processed
      const relevantAlerts = sortedAlerts.filter(a => {
        const t = new Date(a.created_at).getTime();
        const prevTime = index > 0 ? new Date(sortedSessions[index - 1].started_at).getTime() : 0;
        return t <= sessionTime && t > prevTime;
      });
      
      // Add risk for these alerts
      for (const a of relevantAlerts) {
        currentRisk = Math.min(1.0, currentRisk + a.risk_score);
      }
      
      // Simple decay: 5% decay per session step
      if (index > 0 && relevantAlerts.length === 0) {
        currentRisk = Math.max(0, currentRisk * 0.95);
      }
      
      return {
        sessionIndex: index + 1,
        sessionId: session.id,
        risk: currentRisk,
        alerts: relevantAlerts
      };
    });
    
    return points;
  }, [alerts, sessions]);

  if (timelineData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Not enough telemetry to construct a timeline.
      </div>
    );
  }


  
  return (
    <div style={{ padding: '1rem', background: 'var(--bg-inner)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Risk Accumulation
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {timelineData.length} sessions tracked
        </div>
      </div>
      
      {/* Chart Area */}
      <div style={{ position: 'relative', height: '140px', paddingBottom: '20px', paddingLeft: '30px' }}>
        {/* Y-Axis Labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          <span>1.0</span>
          <span>0.5</span>
          <span>0.0</span>
        </div>
        
        {/* Y-Axis Grid Lines */}
        <div style={{ position: 'absolute', left: '30px', right: 0, top: 0, height: '1px', borderTop: '1px dashed var(--border)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: '30px', right: 0, top: '60px', height: '1px', borderTop: '1px dashed var(--border)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: '30px', right: 0, bottom: '20px', height: '1px', borderTop: '1px solid var(--border)' }} />
        
        {/* Data Points & Lines */}
        <div style={{ position: 'absolute', left: '30px', right: 0, top: 0, bottom: '20px' }}>
          {timelineData.map((point, i) => {
            const xPercent = timelineData.length > 1 ? (i / (timelineData.length - 1)) * 100 : 50;
            const yPercent = 100 - (point.risk / 1.0) * 100; // Assuming max risk is 1.0
            
            const nextPoint = timelineData[i + 1];
            let nextX = 0, nextY = 0;
            if (nextPoint) {
              nextX = (i + 1) / (timelineData.length - 1) * 100;
              nextY = 100 - (nextPoint.risk / 1.0) * 100;
            }

            const hasAlerts = point.alerts.length > 0;
            const isCritical = point.alerts.some(a => a.severity === 'CRITICAL');
            
            const dotColor = isCritical ? 'var(--status-critical)' : 
                             hasAlerts ? 'var(--status-high)' : 'var(--accent-blue)';
                             
            return (
              <React.Fragment key={point.sessionId}>
                {/* Connecting Line */}
                {nextPoint && (
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                    <line 
                      x1={`${xPercent}%`} y1={`${yPercent}%`} 
                      x2={`${nextX}%`} y2={`${nextY}%`} 
                      stroke="var(--accent-blue)" 
                      strokeWidth="2" 
                      opacity="0.4"
                    />
                  </svg>
                )}
                
                {/* Data Point */}
                <div style={{
                  position: 'absolute',
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: dotColor,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: hasAlerts ? `0 0 0 3px ${dotColor}30` : 'none',
                  zIndex: 2,
                  cursor: 'help'
                }} title={`Session ${point.sessionIndex}: Risk ${point.risk.toFixed(2)}\n${point.alerts.map(a => a.technique).join(', ')}`} />
                
                {/* Annotations */}
                {hasAlerts && (
                  <div style={{
                    position: 'absolute',
                    left: `${xPercent}%`,
                    top: `min(${yPercent - 20}%, 85%)`,
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-card)',
                    border: `1px solid ${dotColor}`,
                    padding: '0.15rem 0.35rem',
                    borderRadius: 3,
                    fontSize: '0.6rem',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                    zIndex: 3,
                    pointerEvents: 'none'
                  }}>
                    {point.alerts[0].technique}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* X-Axis Labels */}
        <div style={{ position: 'absolute', left: '30px', right: 0, bottom: 0, height: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          <span>S1</span>
          {timelineData.length > 2 && <span>S{Math.floor(timelineData.length / 2)}</span>}
          <span>S{timelineData.length}</span>
        </div>
      </div>
    </div>
  );
};
