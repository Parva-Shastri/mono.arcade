import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'pong',
  title: 'Pong',
  description: 'Control your paddle and bounce the ball past the opponent.',
  instructions: [
    'Use up/down arrow keys or mouse to move your paddle.',
    'Bounce the ball off your paddle to keep it in play.',
    'Score a point when the ball goes past the opponent.',
  ],
};

interface PongProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 280;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 60;
const BALL_SIZE = 8;
const PLAYER_X = 20;
const AI_X = CANVAS_WIDTH - 20 - PADDLE_WIDTH;

export const Pong: React.FC<PongProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game states
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  // Game loop variables using refs to avoid re-renders during loop
  const ballPos = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const ballVel = useRef({ x: 3, y: 1.5 });
  const playerY = useRef((CANVAS_HEIGHT - PADDLE_HEIGHT) / 2);
  const aiY = useRef((CANVAS_HEIGHT - PADDLE_HEIGHT) / 2);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const startRound = () => {
    audio.playClick();
    setStatus('playing');
    ballPos.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    ballVel.current = { x: Math.random() > 0.5 ? 3.5 : -3.5, y: (Math.random() - 0.5) * 4 };
  };

  const handleReset = () => {
    setPlayerScore(0);
    setAiScore(0);
    setStatus('idle');
    playerY.current = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    aiY.current = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
  };

  const handleSimulateWin = () => {
    setPlayerScore(10);
    setAiScore(0);
    setStatus('won');
    audio.playWin();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.75 },
    });
    onUpdateRecord('pong', {
      highScore: Math.max(record.highScore, 10),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setPlayerScore(0);
    setAiScore(10);
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('pong', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Keyboard control handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
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
      const relativeY = e.clientY - rect.top;
      playerY.current = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, relativeY - PADDLE_HEIGHT / 2));
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

      // 1. Update Player Paddle Y (using Keyboard input)
      if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['W']) {
        playerY.current = Math.max(0, playerY.current - 4);
      }
      if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['S']) {
        playerY.current = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, playerY.current + 4);
      }

      // 2. Update AI Paddle Y (simple follow)
      const aiSpeed = 2.5;
      const targetY = ballPos.current.y - PADDLE_HEIGHT / 2;
      const diff = targetY - aiY.current;
      if (Math.abs(diff) > 4) {
        aiY.current += Math.sign(diff) * Math.min(aiSpeed, Math.abs(diff));
      }
      aiY.current = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, aiY.current));

      // 3. Update Ball Position
      ballPos.current.x += ballVel.current.x;
      ballPos.current.y += ballVel.current.y;

      // 4. Collision with Walls (top/bottom)
      if (ballPos.current.y <= 0) {
        ballPos.current.y = 0;
        ballVel.current.y = -ballVel.current.y;
        audio.playClick();
      } else if (ballPos.current.y >= CANVAS_HEIGHT - BALL_SIZE) {
        ballPos.current.y = CANVAS_HEIGHT - BALL_SIZE;
        ballVel.current.y = -ballVel.current.y;
        audio.playClick();
      }

      // 5. Collision with Player Paddle
      if (
        ballVel.current.x < 0 &&
        ballPos.current.x <= PLAYER_X + PADDLE_WIDTH &&
        ballPos.current.x >= PLAYER_X &&
        ballPos.current.y + BALL_SIZE >= playerY.current &&
        ballPos.current.y <= playerY.current + PADDLE_HEIGHT
      ) {
        // Calculate bounce angle based on where ball hits paddle
        const relativeIntersectionY = (playerY.current + PADDLE_HEIGHT / 2) - (ballPos.current.y + BALL_SIZE / 2);
        const normalizedIntersectionY = relativeIntersectionY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedIntersectionY * (Math.PI / 4);

        const speed = Math.min(7, Math.abs(ballVel.current.x) + 0.3);
        ballVel.current.x = speed * Math.cos(bounceAngle);
        ballVel.current.y = speed * -Math.sin(bounceAngle);
        audio.playMerge();
      }

      // 6. Collision with AI Paddle
      if (
        ballVel.current.x > 0 &&
        ballPos.current.x + BALL_SIZE >= AI_X &&
        ballPos.current.x + BALL_SIZE <= AI_X + PADDLE_WIDTH &&
        ballPos.current.y + BALL_SIZE >= aiY.current &&
        ballPos.current.y <= aiY.current + PADDLE_HEIGHT
      ) {
        const relativeIntersectionY = (aiY.current + PADDLE_HEIGHT / 2) - (ballPos.current.y + BALL_SIZE / 2);
        const normalizedIntersectionY = relativeIntersectionY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedIntersectionY * (Math.PI / 4);

        const speed = Math.min(7, Math.abs(ballVel.current.x) + 0.3);
        ballVel.current.x = -speed * Math.cos(bounceAngle);
        ballVel.current.y = speed * -Math.sin(bounceAngle);
        audio.playMerge();
      }

      // 7. Goal Scoring
      if (ballPos.current.x < 0) {
        // Point for AI
        audio.playLose();
        setAiScore(prev => {
          const next = prev + 1;
          if (next >= 10) {
            setStatus('lost');
            onUpdateRecord('pong', {
              highScore: record.highScore,
              gamesPlayed: record.gamesPlayed + 1,
              gamesWon: record.gamesWon,
            });
          } else {
            // Reset ball
            ballPos.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
            ballVel.current = { x: 3.5, y: (Math.random() - 0.5) * 4 };
          }
          return next;
        });
      } else if (ballPos.current.x > CANVAS_WIDTH) {
        // Point for Player
        audio.playScore();
        setPlayerScore(prev => {
          const next = prev + 1;
          if (next >= 10) {
            setStatus('won');
            audio.playWin();
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.75 },
            });
            onUpdateRecord('pong', {
              highScore: Math.max(record.highScore, 10),
              gamesPlayed: record.gamesPlayed + 1,
              gamesWon: record.gamesWon + 1,
            });
          } else {
            // Reset ball
            ballPos.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
            ballVel.current = { x: -3.5, y: (Math.random() - 0.5) * 4 };
          }
          return next;
        });
      }
    };

    const render = () => {
      if (!canvas) return;
      const computed = window.getComputedStyle(canvas);
      const bg = computed.getPropertyValue('--bg').trim() || '#000000';
      const fg = computed.getPropertyValue('--fg').trim() || '#ffffff';
      const border = computed.getPropertyValue('--border').trim() || '#ffffff';

      // Draw background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw dashed center line
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Draw Player Paddle
      ctx.fillStyle = fg;
      ctx.fillRect(PLAYER_X, playerY.current, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.strokeStyle = border;
      ctx.strokeRect(PLAYER_X, playerY.current, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw AI Paddle
      ctx.fillRect(AI_X, aiY.current, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.strokeRect(AI_X, aiY.current, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw Ball
      if (status === 'playing') {
        ctx.fillRect(ballPos.current.x, ballPos.current.y, BALL_SIZE, BALL_SIZE);
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
  }, [status]);

  return (
    <div data-testid="game-pong" style={{ width: '100%' }}>
      <GameWrapper
        title="Pong"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="HIGH SCORE"
      >
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          {/* Scores Panel */}
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
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>PLAYER</span>
              <span data-testid="pong-player-score">{playerScore}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>AI</span>
              <span data-testid="pong-ai-score">{aiScore}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span data-testid="pong-status-text">{status.toUpperCase()}</span>
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
            }}
          >
            <canvas
              ref={canvasRef}
              data-testid="pong-canvas"
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
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>PONG DUEL</h3>
                    <button
                      data-testid="pong-start-btn"
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
                      START POINT
                    </button>
                  </>
                )}
                {status === 'won' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#66ff66', marginBottom: '8px' }}>VICTORY!</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>YOU DEFEATED THE AI CABINET.</p>
                    <button onClick={handleReset} className="brutalist-button" style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                      PLAY AGAIN
                    </button>
                  </>
                )}
                {status === 'lost' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#ff3333', marginBottom: '8px' }}>DEFEAT</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>THE AI CABINET OUTPLAYED YOU.</p>
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

export default Pong;
