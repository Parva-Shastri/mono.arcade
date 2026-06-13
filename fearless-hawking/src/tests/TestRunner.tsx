import React, { useState, useEffect, useRef } from 'react';
import App from '../App';
import { testRegistry, runTests } from './runner';
import type { TestCase, TestResult, TestTier } from './runner';

// Eagerly import all test modules after runner has finished evaluating
// to avoid circular dependency TDZ (Temporal Dead Zone) ReferenceError
try {
  import.meta.glob('./**/*.test.ts', { eager: true });
} catch (e) {
  console.warn('Failed to auto-discover and load test modules:', e);
}

export const TestRunner: React.FC = () => {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState<TestTier | 'all'>('all');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [testFilter, setTestFilter] = useState<string>('');
  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    (window as any).remountApp = () => {
      setAppKey(k => k + 1);
    };
    return () => {
      delete (window as any).remountApp;
    };
  }, []);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Initialize results mapping on mount
  useEffect(() => {
    const initialResults: Record<string, TestResult> = {};
    testRegistry.forEach(t => {
      initialResults[t.id] = {
        id: t.id,
        status: 'pending',
        logs: []
      };
    });
    setResults(initialResults);
  }, []);

  // Scroll console to bottom on log updates
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs]);

  // Handle URL query parameter ?run=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('run') === 'true') {
      // Small timeout to allow everything to render before commencing tests
      const timer = setTimeout(() => {
        handleRunAll();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter test cases based on selection
  const filteredTests = testRegistry.filter(test => {
    if (selectedTier !== 'all' && test.tier !== selectedTier) return false;
    if (selectedGame !== 'all' && test.game !== selectedGame) return false;
    if (testFilter.trim() !== '') {
      const query = testFilter.toLowerCase();
      return test.name.toLowerCase().includes(query) || test.id.toLowerCase().includes(query);
    }
    return true;
  });

  const getUniqueGames = (): string[] => {
    const games = testRegistry.map(t => t.game);
    return Array.from(new Set(games));
  };

  const handleRunAll = async () => {
    if (running) return;
    setRunning(true);
    setLiveLogs(['[SYSTEM] Commencing execution of all registered E2E tests...']);

    // Set all registered tests to pending
    setResults(prev => {
      const next = { ...prev };
      testRegistry.forEach(t => {
        next[t.id] = { id: t.id, status: 'pending', logs: [] };
      });
      return next;
    });

    const finalResults = await runTests(testRegistry, (current, all) => {
      // Live updates
      setResults(prev => {
        const next = { ...prev };
        all.forEach(res => {
          if (res) {
            next[res.id] = res;
          }
        });
        return next;
      });
      setActiveTestId(current.id);
      setLiveLogs(current.logs);
    });

    setRunning(false);
    window.testResults = finalResults;
    setLiveLogs(prev => [...prev, `[SYSTEM] Run complete. ${finalResults.filter(r => r.status === 'passed').length}/${finalResults.length} passed.`]);
  };

  const handleRunTier = async (tier: TestTier) => {
    if (running) return;
    setRunning(true);
    setLiveLogs([`[SYSTEM] Commencing execution of Tier ${tier} E2E tests...`]);

    const tierTests = testRegistry.filter(t => t.tier === tier);
    
    // Set matching tests to pending
    setResults(prev => {
      const next = { ...prev };
      tierTests.forEach(t => {
        next[t.id] = { id: t.id, status: 'pending', logs: [] };
      });
      return next;
    });

    const finalResults = await runTests(tierTests, (current, all) => {
      setResults(prev => {
        const next = { ...prev };
        all.forEach(res => {
          if (res) {
            next[res.id] = res;
          }
        });
        return next;
      });
      setActiveTestId(current.id);
      setLiveLogs(current.logs);
    });

    setRunning(false);
    setLiveLogs(prev => [...prev, `[SYSTEM] Tier ${tier} run complete. ${finalResults.filter(r => r.status === 'passed').length}/${finalResults.length} passed.`]);
  };

  const handleRunSingle = async (test: TestCase) => {
    if (running) return;
    setRunning(true);
    setActiveTestId(test.id);
    setLiveLogs([`[SYSTEM] Commencing execution of test case: ${test.name}`]);

    setResults(prev => ({
      ...prev,
      [test.id]: { id: test.id, status: 'pending', logs: [] }
    }));

    const finalResults = await runTests([test], (current) => {
      setResults(prev => ({
        ...prev,
        [current.id]: current
      }));
      setLiveLogs(current.logs);
    });

    setRunning(false);
    setLiveLogs(prev => [...prev, `[SYSTEM] Test case run complete: ${finalResults[0].status.toUpperCase()}`]);
  };

  // Stats calculation
  const totalCount = testRegistry.length;
  const passedCount = Object.values(results).filter(r => r.status === 'passed').length;
  const failedCount = Object.values(results).filter(r => r.status === 'failed').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#0a0a0a', color: '#33ff33', fontFamily: 'var(--font-mono)' }}>
      {/* CRT Scanline Filter specifically over the Test Runner UI */}
      <div className="test-runner-scanlines" style={{ opacity: 0.15, pointerEvents: 'none' }} />
      
      {/* Test Runner Dashboard Console (Left Panel) */}
      <div style={{
        width: '45%',
        borderRight: '4px solid #33ff33',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#051105',
        boxSizing: 'border-box'
      }}>
        {/* Header Block */}
        <div style={{ padding: '16px', borderBottom: '2px solid #33ff33', textShadow: '0 0 5px #33ff33' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.05em' }}>MONO.ARCADE // TEST_RUNNER</h1>
          <p style={{ fontSize: '0.75rem', color: '#88ff88', margin: '4px 0 0 0' }}>AUTOMATED E2E VERIFICATION SUITE</p>
        </div>

        {/* Status Panels & Cabinet Statistics */}
        <div style={{ padding: '12px 16px', borderBottom: '2px solid #33ff33', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', backgroundColor: '#071807' }}>
          <div style={{ border: '1px solid #33ff33', padding: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.6rem', display: 'block', color: '#88ff88' }}>TOTAL</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{totalCount}</span>
          </div>
          <div style={{ border: '1px solid #33ff33', padding: '6px', textAlign: 'center', borderColor: '#33ff33' }}>
            <span style={{ fontSize: '0.6rem', display: 'block', color: '#88ff88' }}>PASSED</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#66ff66' }}>{passedCount}</span>
          </div>
          <div style={{ border: '1px solid #33ff33', padding: '6px', textAlign: 'center', borderColor: failedCount > 0 ? '#ff3333' : '#33ff33' }}>
            <span style={{ fontSize: '0.6rem', display: 'block', color: failedCount > 0 ? '#ff8888' : '#88ff88' }}>FAILED</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: failedCount > 0 ? '#ff3333' : '#33ff33' }}>{failedCount}</span>
          </div>
          <div style={{ border: '1px solid #33ff33', padding: '6px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.6rem', display: 'block', color: '#88ff88' }}>STATUS</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: running ? '#ffff33' : '#88ff88', lineHeight: '1.8' }}>
              {running ? 'RUNNING' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ padding: '12px 16px', borderBottom: '2px solid #33ff33', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRunAll}
              disabled={running}
              style={{
                flex: 1,
                backgroundColor: '#33ff33',
                color: '#051105',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontWeight: 'bold',
                padding: '8px',
                cursor: running ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 0 5px #33ff33',
              }}
            >
              RUN ALL TESTS
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {([1, 2, 3, 4] as const).map(tier => (
              <button
                key={tier}
                onClick={() => handleRunTier(tier)}
                disabled={running}
                style={{
                  backgroundColor: '#051105',
                  color: '#33ff33',
                  border: '1px solid #33ff33',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  padding: '6px',
                  cursor: running ? 'not-allowed' : 'pointer',
                }}
              >
                RUN TIER {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: '8px 16px', borderBottom: '2px solid #33ff33', display: 'flex', gap: '8px', flexWrap: 'wrap', backgroundColor: '#071807' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.6rem', color: '#88ff88', marginBottom: '2px' }}>TIER FILTER</label>
            <select
              value={selectedTier}
              onChange={e => setSelectedTier(e.target.value === 'all' ? 'all' : Number(e.target.value) as TestTier)}
              style={{ backgroundColor: '#051105', color: '#33ff33', border: '1px solid #33ff33', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '4px' }}
            >
              <option value="all">ALL TIERS</option>
              <option value="1">TIER 1 (FEATURES)</option>
              <option value="2">TIER 2 (BOUNDARIES)</option>
              <option value="3">TIER 3 (SYSTEM)</option>
              <option value="4">TIER 4 (INTEGRATION)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.6rem', color: '#88ff88', marginBottom: '2px' }}>GAME FILTER</label>
            <select
              value={selectedGame}
              onChange={e => setSelectedGame(e.target.value)}
              style={{ backgroundColor: '#051105', color: '#33ff33', border: '1px solid #33ff33', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '4px' }}
            >
              <option value="all">ALL GAMES</option>
              {getUniqueGames().map(g => (
                <option key={g} value={g}>{g.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <label style={{ fontSize: '0.6rem', color: '#88ff88', marginBottom: '2px' }}>TEXT SEARCH</label>
            <input
              type="text"
              placeholder="Search tests..."
              value={testFilter}
              onChange={e => setTestFilter(e.target.value)}
              style={{ backgroundColor: '#051105', color: '#33ff33', border: '1px solid #33ff33', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '4px 8px' }}
            />
          </div>
        </div>

        {/* Test List Panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#88ff88', fontSize: '0.8rem' }}>
              NO REGISTERED TESTS MATCHING FILTER
            </div>
          ) : (
            filteredTests.map(test => {
              const testResult = results[test.id];
              const status = testResult?.status || 'pending';
              
              let badgeColor = '#88ff88';
              if (status === 'running') badgeColor = '#ffff33';
              if (status === 'passed') badgeColor = '#66ff66';
              if (status === 'failed') badgeColor = '#ff3333';

              const isActive = activeTestId === test.id;

              return (
                <div
                  key={test.id}
                  onClick={() => {
                    setActiveTestId(test.id);
                    if (testResult) {
                      setLiveLogs(testResult.logs);
                    } else {
                      setLiveLogs([`No logs recorded for ${test.id}`]);
                    }
                  }}
                  style={{
                    border: '1px solid #33ff33',
                    padding: '8px 12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#0e2b0e' : '#051105',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderColor: isActive ? '#33ff33' : '#22aa22',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{test.id}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      border: '1px solid',
                      borderColor: badgeColor,
                      color: badgeColor,
                      padding: '1px 6px',
                      fontWeight: 'bold'
                    }}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#88ff88' }}>
                    {test.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.6rem', color: '#88ff88' }}>
                      TIER {test.tier} // GAME: {test.game.toUpperCase()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunSingle(test);
                      }}
                      disabled={running}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#33ff33',
                        border: '1px solid #33ff33',
                        fontSize: '0.6rem',
                        padding: '2px 8px',
                        cursor: running ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      RUN
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Scrollable Console Panel */}
        <div style={{
          height: '220px',
          borderTop: '2px solid #33ff33',
          backgroundColor: '#020702',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <div style={{ padding: '4px 12px', borderBottom: '1px solid #22aa22', fontSize: '0.65rem', color: '#88ff88', display: 'flex', justifyContent: 'space-between', backgroundColor: '#051105' }}>
            <span>LIVE LOGGER CONSOLE</span>
            {activeTestId && <span>ACTIVE: {activeTestId}</span>}
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap',
            color: '#33ff33'
          }}>
            {liveLogs.length === 0 ? (
              <div style={{ color: '#22aa22', fontStyle: 'italic' }}>Console idle. Select a test or press Run to view stdout.</div>
            ) : (
              liveLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {log}
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>

      {/* Live Application Viewport (Right Panel) */}
      <div style={{
        flex: 1,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#121212',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#1d1d1d',
          borderBottom: '4px solid var(--border)',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          letterSpacing: '0.05em'
        }}>
          <span>APPLICATION UNDER TEST VIEWPORT</span>
          <span style={{ fontSize: '0.65rem', border: '1px solid #888', padding: '1px 6px', color: '#bbb' }}>LIVE_STAGE</span>
        </div>
        <div id="test-app-root" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <App key={appKey} />
        </div>
      </div>
    </div>
  );
};

export default TestRunner;
