import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'breakout',
  title: 'Breakout',
  description: 'Destroy all the bricks on the screen using a paddle and a bouncing ball.',
  instructions: [
    'Move the paddle left and right.',
    'Keep the ball from falling off the bottom of the screen.',
    'Destroy all the colored bricks to win.',
  ],
};

interface BreakoutProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 280;
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 8;
const BRICK_ROWS = 4;
const BRICK_COLS = 8;
const BRICK_HEIGHT = 15;
const BRICK_WIDTH = (CANVAS_WIDTH - (BRICK_COLS + 1) * 4) / BRICK_COLS;

interface Brick {
  x: number;
  y: number;
  active: boolean;
  rowType: number;
}

export const Breakout: React.FC<BreakoutProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  // Gameplay coordinates
  const paddleX = useRef((CANVAS_WIDTH - PADDLE_WIDTH) / 2);
  const ballPos = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 35 });
  const ballVel = useRef({ x: 3, y: -3 });
  const bricks = useRef<Brick[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const initBricks = () => {
    const list: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        list.push({
          x: c * (BRICK_WIDTH + 4) + 4,
          y: r * (BRICK_HEIGHT + 4) + 20,
          active: true,
          rowType: r,
        });
      }
    }
    bricks.current = list;
  };

  const startRound = () => {
    audio.playClick();
    setStatus('playing');
    if (bricks.current.length === 0 || bricks.current.every(b => !b.active)) {
      initBricks();
    }
    ballPos.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 35 };
    ballVel.current = { x: (Math.random() - 0.5) * 4, y: -3.5 };
    paddleX.current = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
  };

  const handleReset = () => {
    setScore(0);
    setLives(3);
    setStatus('idle');
    initBricks();
    ballPos.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 35 };
    paddleX.current = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
  };

  const handleSimulateWin = () => {
    setScore(score + 100);
    setStatus('won');
    audio.playWin();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.75 },
    });
    onUpdateRecord('breakout', {
      highScore: Math.max(record.highScore, score + 100),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setLives(0);
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('breakout', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Keyboard control handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse control handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || status !== 'playing') return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      paddleX.current = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, relativeX - PADDLE_WIDTH / 2));
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

      // 1. Move Paddle via Keyboard
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) {
        paddleX.current = Math.max(0, paddleX.current - 5);
      }
      if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) {
        paddleX.current = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddleX.current + 5);
      }

      // 2. Move Ball
      ballPos.current.x += ballVel.current.x;
      ballPos.current.y += ballVel.current.y;

      // 3. Collision with Side Walls
      if (ballPos.current.x <= 0) {
        ballPos.current.x = 0;
        ballVel.current.x = -ballVel.current.x;
        audio.playClick();
      } else if (ballPos.current.x >= CANVAS_WIDTH - BALL_SIZE) {
        ballPos.current.x = CANVAS_WIDTH - BALL_SIZE;
        ballVel.current.x = -ballVel.current.x;
        audio.playClick();
      }

      // 4. Collision with Top Wall
      if (ballPos.current.y <= 0) {
        ballPos.current.y = 0;
        ballVel.current.y = -ballVel.current.y;
        audio.playClick();
      }

      // 5. Fall off Bottom
      if (ballPos.current.y >= CANVAS_HEIGHT) {
        audio.playLose();
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setStatus('lost');
            onUpdateRecord('breakout', {
              highScore: record.highScore,
              gamesPlayed: record.gamesPlayed + 1,
              gamesWon: record.gamesWon,
            });
          } else {
            setStatus('idle');
          }
          return next;
        });
      }

      // 6. Collision with Paddle
      if (
        ballVel.current.y > 0 &&
        ballPos.current.y + BALL_SIZE >= CANVAS_HEIGHT - 25 &&
        ballPos.current.y <= CANVAS_HEIGHT - 25 + PADDLE_HEIGHT &&
        ballPos.current.x + BALL_SIZE >= paddleX.current &&
        ballPos.current.x <= paddleX.current + PADDLE_WIDTH
      ) {
        // Bounce angle based on hit position
        const relativeX = (paddleX.current + PADDLE_WIDTH / 2) - (ballPos.current.x + BALL_SIZE / 2);
        const normalizedX = relativeX / (PADDLE_WIDTH / 2);
        const bounceAngle = normalizedX * (Math.PI / 3);

        const speed = 4.5;
        ballVel.current.x = -speed * Math.sin(bounceAngle);
        ballVel.current.y = -speed * Math.cos(bounceAngle);
        audio.playClick();
      }

      // 7. Collision with Bricks
      for (const brick of bricks.current) {
        if (!brick.active) continue;

        if (
          ballPos.current.x + BALL_SIZE >= brick.x &&
          ballPos.current.x <= brick.x + BRICK_WIDTH &&
          ballPos.current.y + BALL_SIZE >= brick.y &&
          ballPos.current.y <= brick.y + BRICK_HEIGHT
        ) {
          brick.active = false;
          ballVel.current.y = -ballVel.current.y;
          audio.playScore();

          // Calculate score
          setScore(prev => {
            const next = prev + 10;
            if (bricks.current.every(b => !b.active)) {
              setStatus('won');
              audio.playWin();
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.75 },
              });
              onUpdateRecord('breakout', {
                highScore: Math.max(record.highScore, next),
                gamesPlayed: record.gamesPlayed + 1,
                gamesWon: record.gamesWon + 1,
              });
            }
            return next;
          });
          break; // Hit one brick per frame
        }
      }
    };

    const render = () => {
      // Draw background
      ctx.fillStyle = 'var(--bg)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Bricks
      for (const brick of bricks.current) {
        if (!brick.active) continue;

        // Monochrome patterns per row
        ctx.fillStyle = brick.rowType === 0
          ? 'var(--fg)'
          : brick.rowType === 1
            ? 'var(--gray-dark)'
            : brick.rowType === 2
              ? 'var(--gray-mid)'
              : 'var(--gray-light)';

        ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        ctx.strokeStyle = 'var(--border)';
        ctx.strokeRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
      }

      // Draw Paddle
      ctx.fillStyle = 'var(--fg)';
      ctx.fillRect(paddleX.current, CANVAS_HEIGHT - 25, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.strokeStyle = 'var(--border)';
      ctx.strokeRect(paddleX.current, CANVAS_HEIGHT - 25, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw Ball
      if (status === 'playing') {
        ctx.fillStyle = 'var(--fg)';
        ctx.fillRect(ballPos.current.x, ballPos.current.y, BALL_SIZE, BALL_SIZE);
        ctx.strokeStyle = 'var(--border)';
        ctx.strokeRect(ballPos.current.x, ballPos.current.y, BALL_SIZE, BALL_SIZE);
      }
    };

    const loop = () => {
      update();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [status, score]);

  return (
    <div data-testid="game-breakout" style={{ width: '100%' }}>
      <GameWrapper
        title="Breakout"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="HIGH SCORE"
      >
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          {/* Stats Bar */}
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
              <span data-testid="breakout-score">{score}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>LIVES</span>
              <span data-testid="breakout-lives">{lives}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span data-testid="breakout-status-text">{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div
            style={{
              border: '4px solid var(--border)',
              backgroundColor: 'var(--bg)',
              position: 'relative',
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              margin: '0 auto 12px auto',
            }}
          >
            <canvas
              ref={canvasRef}
              data-testid="breakout-canvas"
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
                }}
              >
                {status === 'idle' && (
                  <>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>BREAKOUT</h3>
                    <button
                      data-testid="breakout-start-btn"
                      onClick={startRound}
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
                      LAUNCH BALL
                    </button>
                  </>
                )}
                {status === 'won' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#66ff66', marginBottom: '8px' }}>VICTORY!</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>YOU DESTROYED ALL BRICKS.</p>
                    <button onClick={handleReset} className="brutalist-button" style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                      PLAY AGAIN
                    </button>
                  </>
                )}
                {status === 'lost' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#ff3333', marginBottom: '8px' }}>GAME OVER</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>NO MORE LIVES LEFT.</p>
                    <button onClick={handleReset} className="brutalist-button" style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                      PLAY AGAIN
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Hidden simulation triggers for E2E tests */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={handleSimulateWin} className="brutalist-button" style={{ display: 'none' }}>
              Simulate Win
            </button>
            <button onClick={handleSimulateLoss} className="brutalist-button" style={{ display: 'none' }}>
              Simulate Loss
            </button>
          </div>
        </div>
      </GameWrapper>
    </div>
  );
};

export default Breakout;
