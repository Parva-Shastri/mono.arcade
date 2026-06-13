import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'mario',
  title: 'Mario (Mini)',
  description: 'Side-scrolling platformer. Jump over incoming obstacles.',
  instructions: [
    'Press Spacebar or Click on the canvas to jump.',
    'Avoid the incoming pipes/blocks.',
    'Survive as long as possible. Reach 100 score to win!',
  ],
};

interface MarioProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 200;
const GROUND_Y = 160;
const PLAYER_X = 50;
const PLAYER_SIZE = 20;

interface Obstacle {
  x: number;
  width: number;
  height: number;
  passed: boolean;
}

export const Mario: React.FC<MarioProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  // Game loop variables using refs to avoid re-renders
  const playerY = useRef(GROUND_Y - PLAYER_SIZE);
  const playerVelocityY = useRef(0);
  const isJumping = useRef(false);
  const obstacles = useRef<Obstacle[]>([]);
  const obstacleTimer = useRef(0);
  const gameScore = useRef(0);
  const speed = useRef(3);

  const startRound = () => {
    audio.playClick();
    setStatus('playing');
    playerY.current = GROUND_Y - PLAYER_SIZE;
    playerVelocityY.current = 0;
    isJumping.current = false;
    obstacles.current = [];
    obstacleTimer.current = 0;
    gameScore.current = 0;
    speed.current = 3.5;
    setScore(0);
  };

  const handleReset = () => {
    setStatus('idle');
    setScore(0);
    playerY.current = GROUND_Y - PLAYER_SIZE;
    obstacles.current = [];
  };

  const jump = () => {
    if (status !== 'playing') return;
    if (!isJumping.current) {
      playerVelocityY.current = -8;
      isJumping.current = true;
      audio.playClick();
    }
  };

  const handleSimulateWin = () => {
    setStatus('won');
    setScore(100);
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    onUpdateRecord('mario', {
      highScore: Math.max(record.highScore, 100),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('mario', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Click & keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'idle') {
          startRound();
        } else {
          jump();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

      // Gravity and jump physics
      playerY.current += playerVelocityY.current;
      playerVelocityY.current += 0.4; // gravity

      if (playerY.current >= GROUND_Y - PLAYER_SIZE) {
        playerY.current = GROUND_Y - PLAYER_SIZE;
        playerVelocityY.current = 0;
        isJumping.current = false;
      }

      // Increment score slowly for survival
      obstacleTimer.current += 1;
      if (obstacleTimer.current % 15 === 0) {
        gameScore.current += 1;
        setScore(gameScore.current);

        // Win check
        if (gameScore.current >= 100) {
          setStatus('won');
          audio.playWin();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
          onUpdateRecord('mario', {
            highScore: Math.max(record.highScore, 100),
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon + 1,
          });
          return;
        }

        // Increase speed slightly
        if (gameScore.current % 20 === 0) {
          speed.current += 0.5;
        }
      }

      // Spawn obstacles
      if (obstacleTimer.current % 80 === 0) {
        const height = 20 + Math.random() * 35;
        obstacles.current.push({
          x: CANVAS_WIDTH,
          width: 15,
          height,
          passed: false,
        });
      }

      // Move and check collision
      obstacles.current.forEach((obs) => {
        obs.x -= speed.current;

        // Collision check (Bounding Box)
        const hitX = PLAYER_X + PLAYER_SIZE > obs.x && PLAYER_X < obs.x + obs.width;
        const hitY = playerY.current + PLAYER_SIZE > GROUND_Y - obs.height;
        if (hitX && hitY) {
          setStatus('lost');
          audio.playLose();
          onUpdateRecord('mario', {
            highScore: Math.max(record.highScore, gameScore.current),
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon,
          });
        }

        // Pass obstacle score sound
        if (!obs.passed && obs.x + obs.width < PLAYER_X) {
          obs.passed = true;
          audio.playScore();
        }
      });

      // Filter out off-screen obstacles
      obstacles.current = obstacles.current.filter((obs) => obs.x > -obs.width);
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

      // Draw Ground
      ctx.strokeStyle = border;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Ground decoration (monochrome dashes/dirt)
      ctx.strokeStyle = grayLight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < CANVAS_WIDTH; i += 20) {
        ctx.moveTo(i, GROUND_Y + 5);
        ctx.lineTo(i + 10, GROUND_Y + 15);
      }
      ctx.stroke();

      // Draw Mario (Square character with eyes/retro look)
      ctx.fillStyle = fg;
      ctx.fillRect(PLAYER_X, playerY.current, PLAYER_SIZE, PLAYER_SIZE);
      ctx.strokeStyle = border;
      ctx.strokeRect(PLAYER_X, playerY.current, PLAYER_SIZE, PLAYER_SIZE);
      
      // Eyes/cap detail
      ctx.fillStyle = bg;
      ctx.fillRect(PLAYER_X + 12, playerY.current + 4, 4, 4);

      // Draw Obstacles (Pipes)
      obstacles.current.forEach((obs) => {
        ctx.fillStyle = fg;
        ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);
        ctx.strokeStyle = border;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);

        // Pipe rim
        ctx.fillStyle = fg;
        ctx.fillRect(obs.x - 2, GROUND_Y - obs.height, obs.width + 4, 6);
        ctx.strokeRect(obs.x - 2, GROUND_Y - obs.height, obs.width + 4, 6);
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
    <div data-testid="game-mario" style={{ width: '100%' }}>
      <GameWrapper
        title="Mario (Mini)"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="SURVIVAL SCORE"
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
              <span data-testid="mario-score">{score}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span>{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Canvas viewport */}
          <div
            style={{
              border: '4px solid var(--border)',
              backgroundColor: 'var(--bg)',
              position: 'relative',
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              margin: '0 auto 12px auto',
              cursor: 'pointer',
            }}
            onClick={jump}
          >
            <canvas
              ref={canvasRef}
              data-testid="mario-canvas"
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
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>MINI PLATFORMER</h3>
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
                      START JUMPING
                    </button>
                  </>
                )}
                {status === 'won' && (
                  <>
                    <h3 style={{ fontSize: '1.4rem', color: '#66ff66', marginBottom: '8px' }}>WINNER!</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>YOU SURVIVED THE OBSTACLE CABIN.</p>
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
                    <h3 style={{ fontSize: '1.4rem', color: '#ff3333', marginBottom: '8px' }}>CRASH!</h3>
                    <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>SCORE REACHED: {score}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); startRound(); }}
                      className="brutalist-button"
                      style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      PLAY AGAIN
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

export default Mario;
