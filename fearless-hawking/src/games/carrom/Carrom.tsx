import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'carrom',
  title: 'Carrom',
  description: 'Flick the striker to pocket all pieces in the corners.',
  instructions: [
    'Drag back on the striker (large disc) to aim, then release to flick it.',
    'Pocket all target pieces in any of the four corner pockets.',
    'Avoid pocketing the striker (foul). You have 10 shots to pocket all pieces!',
  ],
};

interface CarromProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const BOARD_SIZE = 300;
const FRICTION = 0.985;
const POCKET_RADIUS = 16;
const STRIKER_RADIUS = 12;
const PIECE_RADIUS = 8;

interface Disc {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isStriker: boolean;
  active: boolean;
}

export const Carrom: React.FC<CarromProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shotsLeft, setShotsLeft] = useState(10);
  const [piecesLeft, setPiecesLeft] = useState(3);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  // Game state in refs
  const discs = useRef<Disc[]>([]);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragCurrent = useRef({ x: 0, y: 0 });

  const pockets = [
    { x: POCKET_RADIUS, y: POCKET_RADIUS },
    { x: BOARD_SIZE - POCKET_RADIUS, y: POCKET_RADIUS },
    { x: POCKET_RADIUS, y: BOARD_SIZE - POCKET_RADIUS },
    { x: BOARD_SIZE - POCKET_RADIUS, y: BOARD_SIZE - POCKET_RADIUS },
  ];

  const initGame = () => {
    audio.playClick();
    setStatus('playing');
    setShotsLeft(10);
    setPiecesLeft(3);

    // Initial pieces placement
    const newDiscs: Disc[] = [
      // Striker
      { x: BOARD_SIZE / 2, y: BOARD_SIZE - 50, vx: 0, vy: 0, radius: STRIKER_RADIUS, isStriker: true, active: true },
      // Target pieces in center
      { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 - 15, vx: 0, vy: 0, radius: PIECE_RADIUS, isStriker: false, active: true },
      { x: BOARD_SIZE / 2 - 15, y: BOARD_SIZE / 2 + 10, vx: 0, vy: 0, radius: PIECE_RADIUS, isStriker: false, active: true },
      { x: BOARD_SIZE / 2 + 15, y: BOARD_SIZE / 2 + 10, vx: 0, vy: 0, radius: PIECE_RADIUS, isStriker: false, active: true },
    ];
    discs.current = newDiscs;
  };

  const handleReset = () => {
    setStatus('idle');
    setShotsLeft(10);
    setPiecesLeft(3);
    discs.current = [];
  };

  const handleSimulateWin = () => {
    setStatus('won');
    setPiecesLeft(0);
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    onUpdateRecord('carrom', {
      highScore: Math.max(record.highScore, 10),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('carrom', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Mouse / Touch handlers for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (status !== 'playing' || isDragging.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked near striker
    const striker = discs.current.find(d => d.isStriker);
    if (striker && striker.active) {
      const dist = Math.hypot(x - striker.x, y - striker.y);
      if (dist < striker.radius + 15) {
        // Can only drag if striker is fully stationary
        if (Math.hypot(striker.vx, striker.vy) < 0.15) {
          isDragging.current = true;
          dragStart.current = { x: striker.x, y: striker.y };
          dragCurrent.current = { x, y };
          audio.playClick();
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragCurrent.current = { x, y };
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const striker = discs.current.find(d => d.isStriker);
    if (striker) {
      // Calculate velocity vector based on drag length (aiming line)
      const dx = dragStart.current.x - dragCurrent.current.x;
      const dy = dragStart.current.y - dragCurrent.current.y;
      
      // Flick force limit
      const power = Math.min(Math.hypot(dx, dy) * 0.12, 10);
      const angle = Math.atan2(dy, dx);

      striker.vx = power * Math.cos(angle);
      striker.vy = power * Math.sin(angle);

      audio.playClick();
      setShotsLeft(prev => {
        const next = prev - 1;
        if (next === 0 && piecesLeft > 0) {
          // Will trigger loss check at end of motion if no pieces pocketed
        }
        return next;
      });
    }
  };

  // Game physics update loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (status !== 'playing') return;

      const activeDiscs = discs.current.filter(d => d.active);

      // Move discs & apply friction
      activeDiscs.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= FRICTION;
        d.vy *= FRICTION;

        // Stop fully if very slow
        if (Math.hypot(d.vx, d.vy) < 0.05) {
          d.vx = 0;
          d.vy = 0;
        }

        // Boundary bounce
        const limitMin = d.radius;
        const limitMax = BOARD_SIZE - d.radius;
        
        if (d.x < limitMin) {
          d.x = limitMin;
          d.vx = -d.vx * 0.8;
          audio.playMerge();
        } else if (d.x > limitMax) {
          d.x = limitMax;
          d.vx = -d.vx * 0.8;
          audio.playMerge();
        }

        if (d.y < limitMin) {
          d.y = limitMin;
          d.vy = -d.vy * 0.8;
          audio.playMerge();
        } else if (d.y > limitMax) {
          d.y = limitMax;
          d.vy = -d.vy * 0.8;
          audio.playMerge();
        }

        // Pocket check
        pockets.forEach((p) => {
          const dist = Math.hypot(d.x - p.x, d.y - p.y);
          if (dist < POCKET_RADIUS) {
            d.active = false;
            d.vx = 0;
            d.vy = 0;
            if (d.isStriker) {
              audio.playLose(); // striker pocketed (foul)
              // Reset striker back to baseline
              setTimeout(() => {
                d.x = BOARD_SIZE / 2;
                d.y = BOARD_SIZE - 50;
                d.active = true;
              }, 1000);
            } else {
              audio.playScore();
              setPiecesLeft(prev => {
                const next = prev - 1;
                if (next === 0) {
                  setStatus('won');
                  audio.playWin();
                  confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
                  onUpdateRecord('carrom', {
                    highScore: Math.max(record.highScore, shotsLeft + 1),
                    gamesPlayed: record.gamesPlayed + 1,
                    gamesWon: record.gamesWon + 1,
                  });
                }
                return next;
              });
            }
          }
        });
      });

      // Disc-to-disc collisions
      for (let i = 0; i < activeDiscs.length; i++) {
        for (let j = i + 1; j < activeDiscs.length; j++) {
          const d1 = activeDiscs[i];
          const d2 = activeDiscs[j];

          const dist = Math.hypot(d2.x - d1.x, d2.y - d1.y);
          const minDist = d1.radius + d2.radius;

          if (dist < minDist) {
            // Push them apart to prevent overlap
            const overlap = minDist - dist;
            const nx = (d2.x - d1.x) / dist;
            const ny = (d2.y - d1.y) / dist;

            d1.x -= nx * overlap * 0.5;
            d1.y -= ny * overlap * 0.5;
            d2.x += nx * overlap * 0.5;
            d2.y += ny * overlap * 0.5;

            // Simple elastic collision response
            const kx = d1.vx - d2.vx;
            const ky = d1.vy - d2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2; // equal mass

            d1.vx -= p * nx;
            d1.vy -= p * ny;
            d2.vx += p * nx;
            d2.vy += p * ny;

            audio.playMerge();
          }
        }
      }

      // Check if motion has completely stopped
      const isMotionRunning = activeDiscs.some(d => Math.hypot(d.vx, d.vy) > 0.01);
      if (!isMotionRunning && shotsLeft === 0 && piecesLeft > 0 && status === 'playing') {
        setStatus('lost');
        audio.playLose();
        onUpdateRecord('carrom', {
          highScore: record.highScore,
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      }
    };

    const render = () => {
      if (!canvas) return;
      const computed = window.getComputedStyle(canvas);
      const bg = computed.getPropertyValue('--bg').trim() || '#000000';
      const fg = computed.getPropertyValue('--fg').trim() || '#ffffff';
      const border = computed.getPropertyValue('--border').trim() || '#ffffff';
      const grayLight = computed.getPropertyValue('--gray-light').trim() || '#333333';
      const grayDark = computed.getPropertyValue('--gray-dark').trim() || '#777777';

      // Clear board
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Draw center circle
      ctx.strokeStyle = grayLight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 40, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 8, 0, Math.PI * 2);
      ctx.fillStyle = border;
      ctx.fill();

      // Draw baseline lines
      ctx.strokeStyle = grayLight;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(35, 35, BOARD_SIZE - 70, BOARD_SIZE - 70);

      // Draw corner pockets
      pockets.forEach((p) => {
        ctx.fillStyle = grayDark;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = border;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // Draw discs
      discs.current.forEach((d) => {
        if (!d.active) return;
        ctx.fillStyle = d.isStriker ? fg : bg;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = border;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner circle pattern
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = d.isStriker ? bg : fg;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw aiming drag line
      if (isDragging.current) {
        ctx.strokeStyle = border;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(dragStart.current.x, dragStart.current.y);
        // Draw line in direction of shot (opposite to drag direction)
        const dx = dragStart.current.x - dragCurrent.current.x;
        const dy = dragStart.current.y - dragCurrent.current.y;
        ctx.lineTo(dragStart.current.x + dx * 1.5, dragStart.current.y + dy * 1.5);
        ctx.stroke();
        ctx.setLineDash([]); // reset
      }
    };

    const loop = () => {
      update();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [status, shotsLeft, piecesLeft]);

  return (
    <div data-testid="game-carrom" style={{ width: '100%' }}>
      <GameWrapper
        title="Carrom"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="SHOTS RECORD"
      >
        <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto', fontFamily: 'var(--font-mono)' }}>
          
          {/* Header Panel */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '2px solid var(--border)',
              padding: '8px 16px',
              backgroundColor: 'var(--gray-light)',
              marginBottom: '12px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
            }}
          >
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>SHOTS LEFT</span>
              <span data-testid="carrom-shots">{shotsLeft}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>PIECES LEFT</span>
              <span data-testid="carrom-pieces">{piecesLeft}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span>{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            style={{
              border: '4px solid var(--border)',
              backgroundColor: 'var(--bg)',
              position: 'relative',
              width: `${BOARD_SIZE}px`,
              height: `${BOARD_SIZE}px`,
              margin: '0 auto 12px auto',
            }}
          >
            <canvas
              ref={canvasRef}
              data-testid="carrom-canvas"
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              style={{ display: 'block', cursor: isDragging.current ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            {status !== 'playing' && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '20px',
                  boxSizing: 'border-box',
                }}
              >
                {status === 'idle' && (
                  <>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>CARROM BOARD</h3>
                    <button
                      onClick={initGame}
                      className="brutalist-button"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        border: '2px solid #ffffff',
                        boxShadow: 'none',
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                      }}
                    >
                      START FLICKING
                    </button>
                  </>
                )}
                {status === 'won' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#66ff66', marginBottom: '8px' }}>VICTORY!</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>YOU POCKETED ALL TARGET PIECES.</p>
                    <button onClick={initGame} className="brutalist-button" style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                      PLAY AGAIN
                    </button>
                  </>
                )}
                {status === 'lost' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#ff3333', marginBottom: '8px' }}>OUT OF SHOTS</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>THE TARGET PIECES REMAIN ON BOARD.</p>
                    <button onClick={initGame} className="brutalist-button" style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                      TRY AGAIN
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Hidden simulation triggers for E2E tests */}
          <div style={{ display: 'none' }}>
            <button onClick={handleSimulateWin} className="brutalist-button">Simulate Win</button>
            <button onClick={handleSimulateLoss} className="brutalist-button">Simulate Loss</button>
          </div>

        </div>
      </GameWrapper>
    </div>
  );
};

export default Carrom;
