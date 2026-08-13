import React, { useState } from 'react';
import { Play, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';

type TestState = 'idle' | 'running' | 'complete';

export const ValidationPage: React.FC = () => {
  const [test1, setTest1] = useState<TestState>('idle');
  const [test2, setTest2] = useState<TestState>('idle');
  const [test3, setTest3] = useState<TestState>('idle');

  const runTest = (setTest: React.Dispatch<React.SetStateAction<TestState>>) => {
    setTest('running');
    setTimeout(() => setTest('complete'), 2500); // Mock 2.5s execution
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Validation Lab</h1>
          <p className="page-subtitle">Test detector efficacy and measure false positive rates</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Test Scenarios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="section-header">
            <div className="section-title">Test Scenarios</div>
          </div>
          
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>20-Session Boundary Probing</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Injects 20 sequential unauthorized resource access attempts.</div>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => runTest(setTest1)} 
              disabled={test1 !== 'idle'}
            >
              {test1 === 'running' ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {test1 === 'running' ? 'Running...' : test1 === 'complete' ? 'Completed' : 'Run Test'}
            </button>
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>50-Session Enumeration</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rapid requests across a wide range of APIs to test repetition thresholds.</div>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => runTest(setTest2)} 
              disabled={test2 !== 'idle'}
            >
              {test2 === 'running' ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {test2 === 'running' ? 'Running...' : test2 === 'complete' ? 'Completed' : 'Run Test'}
            </button>
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>False Positive Baseline</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generates 100 benign sessions of normal developer behavior.</div>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => runTest(setTest3)} 
              disabled={test3 !== 'idle'}
            >
              {test3 === 'running' ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {test3 === 'running' ? 'Running...' : test3 === 'complete' ? 'Completed' : 'Run Test'}
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="section-header">
            <div className="section-title">Execution Results</div>
          </div>

          {test1 === 'complete' && (
            <div className="card animate-fade-in" style={{ borderLeft: '4px solid var(--status-critical)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                20-Session Probing
              </div>
              <div className="grid grid-cols-2 gap-4" style={{ fontSize: '0.85rem', marginBottom: '1rem', background: 'var(--bg-inner)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Sessions generated:</span> <strong style={{ marginLeft: '0.2rem' }}>20</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Blocked:</span> <strong style={{ marginLeft: '0.2rem', color: 'var(--status-critical)' }}>18</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Similarity:</span> <strong style={{ marginLeft: '0.2rem' }}>0.89</strong></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '0.2rem' }}><span style={{ color: 'var(--text-muted)' }}>Expected:</span> <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>DETECT</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Actual:</span> <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--status-critical)', fontWeight: 600 }}>DETECT</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-low)', fontWeight: 700 }}>
                  <CheckCircle size={18} /> PASS
                </div>
              </div>
            </div>
          )}

          {test2 === 'complete' && (
            <div className="card animate-fade-in" style={{ borderLeft: '4px solid var(--status-high)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                50-Session Enumeration
              </div>
              <div className="grid grid-cols-2 gap-4" style={{ fontSize: '0.85rem', marginBottom: '1rem', background: 'var(--bg-inner)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Sessions generated:</span> <strong style={{ marginLeft: '0.2rem' }}>50</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Blocked:</span> <strong style={{ marginLeft: '0.2rem', color: 'var(--status-high)' }}>42</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Repetition:</span> <strong style={{ marginLeft: '0.2rem' }}>1.00</strong></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '0.2rem' }}><span style={{ color: 'var(--text-muted)' }}>Expected:</span> <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>DETECT</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Actual:</span> <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--status-high)', fontWeight: 600 }}>DETECT</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-low)', fontWeight: 700 }}>
                  <CheckCircle size={18} /> PASS
                </div>
              </div>
            </div>
          )}

          {test3 === 'complete' && (
            <div className="card animate-fade-in" style={{ borderLeft: '4px solid var(--status-low)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                False Positive Validation
              </div>
              <div className="grid grid-cols-2 gap-4" style={{ fontSize: '0.85rem', marginBottom: '1rem', background: 'var(--bg-inner)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Benign sessions:</span> <strong style={{ marginLeft: '0.2rem' }}>100</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Flagged:</span> <strong style={{ marginLeft: '0.2rem', color: 'var(--status-medium)' }}>2</strong></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>False Positive Rate:</span> <span style={{ fontWeight: 600 }}>2%</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-low)', fontWeight: 700 }}>
                  <CheckCircle size={18} /> PASS
                </div>
              </div>
            </div>
          )}

          {test1 === 'idle' && test2 === 'idle' && test3 === 'idle' && (
             <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px dashed var(--border-hover)', borderRadius: 'var(--radius-md)' }}>
              <ShieldCheck size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Ready for Validation</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                Run test scenarios to evaluate detector performance.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
