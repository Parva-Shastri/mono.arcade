import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'spaceshooter',
  title: 'Space Shooter',
  description: 'Control a starship, blast incoming asteroids, and survive.',
  instructions: [
    'Use Left/Right Arrow keys (or A/D) or move mouse to control your ship.',
    'Press Spacebar or Click on the canvas to shoot lasers.',
    'Destroy incoming obstacles. Reach 50 score to win!',
  ],
};

interface SpaceShooterProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const SHIP_Y = CANVAS_HEIGHT - 35;
const SHIP_WIDTH = 24;
const SHIP_HEIGHT = 20;

interface Laser {
  x: number;
  y: number;
}

interface Obstacle {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export const SpaceShooter: React.FC<SpaceShooterProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  // Game loop variables using refs to avoid re-renders
  const shipX = useRef(CANVAS_WIDTH / 2 - SHIP_WIDTH / 2);
  const lasers = useRef<Laser[]>([]);
  const obstacles = useRef<Obstacle[]>([]);
  const obstacleTimer = useRef(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const gameScore = useRef(0);

  const startRound = () => {
    audio.playClick();
    setStatus('playing');
    shipX.current = CANVAS_WIDTH / 2 - SHIP_WIDTH / 2;
    lasers.current = [];
    obstacles.current = [];
    obstacleTimer.current = 0;
    gameScore.current = 0;
    setScore(0);
  };

  const handleReset = () => {
    setStatus('idle');
    setScore(0);
    lasers.current = [];
    obstacles.current = [];
  };

  const fireLaser = () => {
    if (status !== 'playing') return;
    lasers.current.push({
      x: shipX.current + SHIP_WIDTH / 2,
      y: SHIP_Y,
    });
    audio.playClick();
  };

  const handleSimulateWin = () => {
    setStatus('won');
    setScore(50);
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    onUpdateRecord('spaceshooter', {
      highScore: Math.max(record.highScore, 50),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('spaceshooter', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Keyboard setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keysPressed.current[e.code] = true;
      if (e.code === 'Space') {
        if (status === 'idle') {
          startRound();
        } else {
          fireLaser();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status]);

  // Mouse / touch controls
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (status !== 'playing' || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      shipX.current = Math.max(0, Math.min(CANVAS_WIDTH - SHIP_WIDTH, x - SHIP_WIDTH / 2));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [status]);

  // Main game loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (status !== 'playing') return;

      // Handle keyboard movement
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) {
        shipX.current = Math.max(0, shipX.current - 4);
      }
      if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) {
        shipX.current = Math.min(CANVAS_WIDTH - SHIP_WIDTH, shipX.current + 4);
      }

      // Move lasers
      lasers.current.forEach((l) => {
        l.y -= 6;
      });
      lasers.current = lasers.current.filter((l) => l.y > 0);

      // Move obstacles (asteroids)
      obstacles.current.forEach((obs) => {
        obs.y += obs.speed;
      });

      // Spawn obstacles
      obstacleTimer.current += 1;
      const spawnRate = Math.max(20, 60 - Math.floor(gameScore.current / 2));
      if (obstacleTimer.current % spawnRate === 0) {
        obstacles.current.push({
          x: Math.random() * (CANVAS_WIDTH - 20),
          y: -20,
          size: 12 + Math.random() * 16,
          speed: 1.5 + Math.random() * 2,
        });
      }

      // Check collision: laser vs obstacle
      lasers.current.forEach((l, lIdx) => {
        obstacles.current.forEach((obs, oIdx) => {
          const dist = Math.hypot(l.x - (obs.x + obs.size / 2), l.y - (obs.y + obs.size / 2));
          if (dist < obs.size / 2 + 3) {
            // Destroyed
            lasers.current.splice(lIdx, 1);
            obstacles.current.splice(oIdx, 1);
            audio.playScore();

            gameScore.current += 1;
            setScore(gameScore.current);

            // Win check
            if (gameScore.current >= 50) {
              setStatus('won');
              audio.playWin();
              confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
              onUpdateRecord('spaceshooter', {
                highScore: Math.max(record.highScore, 50),
                gamesPlayed: record.gamesPlayed + 1,
                gamesWon: record.gamesWon + 1,
              });
            }
          }
        });
      });

      // Check collision: obstacle vs player ship
      obstacles.current.forEach((obs) => {
        const hitX = shipX.current + SHIP_WIDTH > obs.x && shipX.current < obs.x + obs.size;
        const hitY = SHIP_Y + SHIP_HEIGHT > obs.y && SHIP_Y < obs.y + obs.size;
        if (hitX && hitY) {
          setStatus('lost');
          audio.playLose();
          onUpdateRecord('spaceshooter', {
            highScore: Math.max(record.highScore, gameScore.current),
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon,
          });
        }
      });

      // Filter off-screen obstacles
      obstacles.current = obstacles.current.filter((obs) => obs.y < CANVAS_HEIGHT);
    };

    const render = () => {
      if (!canvas) return;
      const computed = window.getComputedStyle(canvas);
      const bg = computed.getPropertyValue('--bg').trim() || '#000000';
      const fg = computed.getPropertyValue('--fg').trim() || '#ffffff';
      const border = computed.getPropertyValue('--border').trim() || '#ffffff';
      const grayLight = computed.getPropertyValue('--gray-light').trim() || '#333333';

      // Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Starfield decoration (random monochrome pixels)
      ctx.fillStyle = grayLight;
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(i * 12345) * 0.5 + 0.5) * CANVAS_WIDTH;
        const y = ((Math.cos(i * 54321) * 0.5 + 0.5) * CANVAS_HEIGHT + obstacleTimer.current * 0.5) % CANVAS_HEIGHT;
        ctx.fillRect(x, y, 2, 2);
      }

      // Draw Player Ship (Triangle/polygon starship shape)
      ctx.fillStyle = fg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shipX.current + SHIP_WIDTH / 2, SHIP_Y);
      ctx.lineTo(shipX.current + SHIP_WIDTH, SHIP_Y + SHIP_HEIGHT);
      ctx.lineTo(shipX.current + SHIP_WIDTH * 0.7, SHIP_Y + SHIP_HEIGHT * 0.7);
      ctx.lineTo(shipX.current + SHIP_WIDTH * 0.3, SHIP_Y + SHIP_HEIGHT * 0.7);
      ctx.lineTo(shipX.current, SHIP_Y + SHIP_HEIGHT);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Lasers
      ctx.fillStyle = fg;
      lasers.current.forEach((l) => {
        ctx.fillRect(l.x - 1.5, l.y - 8, 3, 8);
      });

      // Draw Obstacles (Asteroids)
      ctx.strokeStyle = border;
      ctx.fillStyle = bg;
      obstacles.current.forEach((obs) => {
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);
        ctx.strokeRect(obs.x, obs.y, obs.size, obs.size);

        // Cracks detail inside rock
        ctx.strokeStyle = grayLight;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.size * 0.2, obs.y + obs.size * 0.2);
        ctx.lineTo(obs.x + obs.size * 0.5, obs.y + obs.size * 0.8);
        ctx.stroke();
      });
    };

    const loop = () => {
      update();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [status]);

  return (
    <div data-testid="game-spaceshooter" style={{ width: '100%' }}>
      <GameWrapper
        title="Space Shooter"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="DESTROY SCORE"
      >
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', fontFamily: 'var(--font-mono)' }}>
          
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
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>SCORE</span>
              <span data-testid="spaceshooter-score">{score}</span>
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
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              margin: '0 auto 12px auto',
              cursor: 'crosshair',
            }}
            onClick={fireLaser}
          >
            <canvas
              ref={canvasRef}
              data-testid="spaceshooter-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{ display: 'block' }}
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
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>SPACE CONSOLE</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); startRound(); }}
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
                      ENGAGE ENEMY
                    </button>
                  </>
                )}
                {status === 'won' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#66ff66', marginBottom: '8px' }}>MISSION CLEAR</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>YOU DEFENDED THE SECTOR SUCCESSFULLY.</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); startRound(); }}
                      className="brutalist-button"
                      style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      PLAY AGAIN
                    </button>
                  </>
                )}
                {status === 'lost' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#ff3333', marginBottom: '8px' }}>SHIP DESTROYED</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>SECTOR LOST. SCORE: {score}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); startRound(); }}
                      className="brutalist-button"
                      style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}
                    >
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

export default SpaceShooter;
