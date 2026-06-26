import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'carracing',
  title: 'Car Racing',
  description: 'Dodge traffic and speed through checkpoints to reach the finish line.',
  instructions: [
    'Use the Left and Right arrow keys (or A and D) to steer your car.',
    'Avoid colliding with other cars on the road.',
    'Pass checkpoints to extend your time and finish the race!',
  ],
};

interface CarRacingProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 350;
const CAR_WIDTH = 26;
const CAR_HEIGHT = 45;
const WINNING_SCORE = 10;

interface Obstacle {
  x: number;
  y: number;
  speed: number;
  active: boolean;
}

export const CarRacing: React.FC<CarRacingProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('playing');

  const scoreRef = useRef(0);
  const playerX = useRef((CANVAS_WIDTH - CAR_WIDTH) / 2);
  const obstacles = useRef<Obstacle[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastSpawnTime = useRef(0);

  const initGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setStatus('playing');
    playerX.current = (CANVAS_WIDTH - CAR_WIDTH) / 2;
    obstacles.current = [];
    keysPressed.current = {};
    lastSpawnTime.current = Date.now();
  };

  const handleSimulateWin = () => {
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    setStatus('won');
    scoreRef.current = WINNING_SCORE;
    setScore(WINNING_SCORE);
    onUpdateRecord('carracing', {
      highScore: Math.max(record.highScore, WINNING_SCORE * 10),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    audio.playLose();
    setStatus('lost');
    onUpdateRecord('carracing', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const spawnObstacle = () => {
      const now = Date.now();
      if (now - lastSpawnTime.current > 1800) {
        // Spawn lanes: 30 to 240
        const laneWidth = (CANVAS_WIDTH - 60) / 3;
        const lane = Math.floor(Math.random() * 3);
        const x = 30 + lane * laneWidth + (laneWidth - CAR_WIDTH) / 2;

        obstacles.current.push({
          x,
          y: -CAR_HEIGHT,
          speed: 2 + Math.random() * 2,
          active: true,
        });
        lastSpawnTime.current = now;
      }
    };

    const updatePhysics = () => {
      if (status !== 'playing') return;

      // Update Player position
      const moveSpeed = 4;
      if (keysPressed.current['arrowleft'] || keysPressed.current['a']) {
        playerX.current = Math.max(30, playerX.current - moveSpeed);
      }
      if (keysPressed.current['arrowright'] || keysPressed.current['d']) {
        playerX.current = Math.min(CANVAS_WIDTH - 30 - CAR_WIDTH, playerX.current + moveSpeed);
      }

      spawnObstacle();

      // Update obstacles
      obstacles.current.forEach(obs => {
        if (!obs.active) return;
        obs.y += obs.speed;

        // Check Collision
        const py = CANVAS_HEIGHT - CAR_HEIGHT - 20;
        const intersect =
          playerX.current < obs.x + CAR_WIDTH &&
          playerX.current + CAR_WIDTH > obs.x &&
          py < obs.y + CAR_HEIGHT &&
          py + CAR_HEIGHT > obs.y;

        if (intersect) {
          setStatus('lost');
          audio.playLose();
          onUpdateRecord('carracing', {
            highScore: record.highScore,
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon,
          });
        }

        // Check if dodged
        if (obs.y > CANVAS_HEIGHT) {
          obs.active = false;
          audio.playScore();
          scoreRef.current += 1;
          setScore(scoreRef.current);
          if (scoreRef.current >= WINNING_SCORE) {
            setStatus('won');
            audio.playWin();
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
            onUpdateRecord('carracing', {
              highScore: Math.max(record.highScore, scoreRef.current * 10),
              gamesPlayed: record.gamesPlayed + 1,
              gamesWon: record.gamesWon + 1,
            });
          }
        }
      });

      // Filter inactive obstacles
      obstacles.current = obstacles.current.filter(obs => obs.active);
    };

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw road background
      ctx.fillStyle = 'var(--gray-light)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw road borders
      ctx.strokeStyle = 'var(--border)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(30, CANVAS_HEIGHT);
      ctx.moveTo(CANVAS_WIDTH - 30, 0);
      ctx.lineTo(CANVAS_WIDTH - 30, CANVAS_HEIGHT);
      ctx.stroke();

      // Draw dashed lane markings (scrolling)
      ctx.strokeStyle = 'var(--border)';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 15]);
      const offset = (Date.now() / 20) % 30;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 3 + 10, -30 + offset);
      ctx.lineTo(CANVAS_WIDTH / 3 + 10, CANVAS_HEIGHT + 30);
      ctx.moveTo((CANVAS_WIDTH / 3) * 2 - 10, -30 + offset);
      ctx.lineTo((CANVAS_WIDTH / 3) * 2 - 10, CANVAS_HEIGHT + 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw player car
      const py = CANVAS_HEIGHT - CAR_HEIGHT - 20;
      ctx.fillStyle = 'var(--fg)';
      ctx.strokeStyle = 'var(--border)';
      ctx.lineWidth = 2;
      ctx.fillRect(playerX.current, py, CAR_WIDTH, CAR_HEIGHT);
      ctx.strokeRect(playerX.current, py, CAR_WIDTH, CAR_HEIGHT);

      // Add retro car design detail
      ctx.fillStyle = 'var(--bg)';
      ctx.fillRect(playerX.current + 4, py + 8, CAR_WIDTH - 8, 12); // Windshield
      ctx.fillRect(playerX.current + 2, py + CAR_HEIGHT - 8, 4, 6); // Left rear wheel
      ctx.fillRect(playerX.current + CAR_WIDTH - 6, py + CAR_HEIGHT - 8, 4, 6); // Right rear wheel

      // Draw obstacles
      obstacles.current.forEach(obs => {
        if (!obs.active) return;
        ctx.fillStyle = 'var(--border)';
        ctx.fillRect(obs.x, obs.y, CAR_WIDTH, CAR_HEIGHT);
        ctx.fillStyle = 'var(--fg)';
        ctx.fillRect(obs.x + 3, obs.y + 3, CAR_WIDTH - 6, CAR_HEIGHT - 6);
        ctx.fillStyle = 'var(--bg)';
        ctx.fillRect(obs.x + 5, obs.y + 12, CAR_WIDTH - 10, 8); // Windshield
      });
    };

    const loop = () => {
      updatePhysics();
      draw();
      animFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animFrameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, record]);

  return (
    <div data-testid="game-carracing" style={{ width: '100%' }}>
      <GameWrapper
        title="Car Racing"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={initGame}
        highScore={record.highScore}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span>State: {score}</span>
            <span>TARGET: {WINNING_SCORE}</span>
            <span>STATUS: {status.toUpperCase()}</span>
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              border: '4px solid var(--border)',
              display: 'block',
              backgroundColor: 'var(--bg)',
              maxWidth: '100%',
            }}
          />

          {status === 'won' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>VICTORY! YOU REACHED THE FINISH LINE.</p>
              <button className="brutalist-button" onClick={initGame}>PLAY AGAIN</button>
            </div>
          )}

          {status === 'lost' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>CRASHED! RACE OVER.</p>
              <button className="brutalist-button" onClick={initGame}>TRY AGAIN</button>
            </div>
          )}

          <div style={{ display: 'none' }}>
            <button onClick={handleSimulateWin}>Simulate Win</button>
            <button onClick={handleSimulateLoss}>Simulate Loss</button>
          </div>
        </div>
      </GameWrapper>
    </div>
  );
};

export default CarRacing;
