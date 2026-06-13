import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'mario',
  title: 'Mario (Mini)',
  description: 'Side-scrolling obstacle jump game. Jump over pipes and survive to score.',
  instructions: [
    'Press Spacebar, Up Arrow, or click the canvas to jump.',
    'Avoid incoming pipe obstacles.',
    'Score increments the longer you survive.',
    'Reach 100 points to win the level.',
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
const MARIO_X = 50;
const MARIO_SIZE = 20;

export const Mario: React.FC<MarioProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');

  // Gameplay physics state
  const marioY = useRef(GROUND_Y - MARIO_SIZE);
  const marioVelocityY = useRef(0);
  const isJumping = useRef(false);
  const obstacleX = useRef(CANVAS_WIDTH);
  const obstacleWidth = useRef(20);
  const obstacleHeight = useRef(40);
  const obstacleSpeed = useRef(4);

  const startNewGame = () => {
    audio.playClick();
    setScore(0);
    setStatus('playing');
    marioY.current = GROUND_Y - MARIO_SIZE;
    marioVelocityY.current = 0;
    isJumping.current = false;
    obstacleX.current = CANVAS_WIDTH;
    obstacleSpeed.current = 4;
  };

  const jump = () => {
    if (status !== 'playing' || isJumping.current) return;
    audio.playClick();
    marioVelocityY.current = -8;
    isJumping.current = true;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolveThemeStyles = () => {
      const computed = window.getComputedStyle(canvas);
      return {
        bg: computed.getPropertyValue('--bg').trim() || '#000000',
        fg: computed.getPropertyValue('--fg').trim() || '#ffffff',
        border: computed.getPropertyValue('--border').trim() || '#ffffff',
        grayLight: computed.getPropertyValue('--gray-light').trim() || '#cccccc',
        grayMid: computed.getPropertyValue('--gray-mid').trim() || '#666666',
        grayDark: computed.getPropertyValue('--gray-dark').trim() || '#333333',
      };
    };

    const update = () => {
      if (status !== 'playing') return;

      // Mario gravity physics
      marioY.current += marioVelocityY.current;
      marioVelocityY.current += 0.45; // gravity force

      if (marioY.current >= GROUND_Y - MARIO_SIZE) {
        marioY.current = GROUND_Y - MARIO_SIZE;
        marioVelocityY.current = 0;
        isJumping.current = false;
      }

      // Obstacle move
      obstacleX.current -= obstacleSpeed.current;
      if (obstacleX.current + obstacleWidth.current < 0) {
        obstacleX.current = CANVAS_WIDTH;
        obstacleHeight.current = 30 + Math.random() * 30;
        audio.playScore();
        setScore(s => {
          const next = s + 10;
          if (next >= 100) {
            setStatus('won');
            audio.playWin();
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
            onUpdateRecord('mario', {
              highScore: Math.max(record.highScore, next),
              gamesPlayed: record.gamesPlayed + 1,
              gamesWon: record.gamesWon + 1,
            });
          }
          return next;
        });
        obstacleSpeed.current = Math.min(8, obstacleSpeed.current + 0.3);
      }

      // Collision checks
      const collisionX = MARIO_X + MARIO_SIZE > obstacleX.current && MARIO_X < obstacleX.current + obstacleWidth.current;
      const collisionY = marioY.current + MARIO_SIZE > GROUND_Y - obstacleHeight.current;
      if (collisionX && collisionY) {
        setStatus('lost');
        audio.playLose();
        onUpdateRecord('mario', {
          highScore: Math.max(record.highScore, score),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      }
    };

    const draw = () => {
      const styles = resolveThemeStyles();

      // Clear
      ctx.fillStyle = styles.bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Ground
      ctx.strokeStyle = styles.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Draw Ground patterns (monochrome hatch)
      ctx.fillStyle = styles.grayLight;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Draw Mario (Player block)
      ctx.fillStyle = styles.fg;
      ctx.fillRect(MARIO_X, marioY.current, MARIO_SIZE, MARIO_SIZE);
      ctx.strokeStyle = styles.border;
      ctx.strokeRect(MARIO_X, marioY.current, MARIO_SIZE, MARIO_SIZE);

      // Draw Obstacle (Pipe block)
      ctx.fillStyle = styles.grayDark;
      ctx.fillRect(obstacleX.current, GROUND_Y - obstacleHeight.current, obstacleWidth.current, obstacleHeight.current);
      ctx.strokeStyle = styles.border;
      ctx.strokeRect(obstacleX.current, GROUND_Y - obstacleHeight.current, obstacleWidth.current, obstacleHeight.current);
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, score]);

  const handleSimulateWin = () => {
    setStatus('won');
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

  return (
    <div data-testid="game-mario" style={{ width: '100%' }}>
      <GameWrapper
        title="Mario (Mini)"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={startNewGame}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          {/* Header Score Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span>SCORE: {score}</span>
            <span>STATUS: {status.toUpperCase()}</span>
          </div>

          {/* Canvas Viewport */}
          <canvas
            ref={canvasRef}
            data-testid="mario-canvas"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={jump}
            style={{
              border: '4px solid var(--border)',
              display: 'block',
              cursor: 'pointer',
              maxWidth: '100%',
              backgroundColor: 'var(--bg)',
            }}
          />

          {/* Start overlays */}
          {status === 'idle' && (
            <button className="brutalist-button" onClick={startNewGame}>START DASH</button>
          )}

          {status === 'lost' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', marginBottom: '8px' }}>CRASHED! TRY AGAIN.</p>
              <button className="brutalist-button" onClick={startNewGame}>REPLAY</button>
            </div>
          )}

          {status === 'won' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}>LEVEL CLEARED!</p>
              <button className="brutalist-button" onClick={startNewGame}>REPLAY</button>
            </div>
          )}

          {/* Hidden simulation triggers for E2E tests */}
          <div style={{ display: 'none' }}>
            <button onClick={handleSimulateWin}>Simulate Win</button>
            <button onClick={handleSimulateLoss}>Simulate Loss</button>
          </div>
        </div>
      </GameWrapper>
    </div>
  );
};

export default Mario;
