import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'carrom',
  title: 'Carrom',
  description: 'Flick the striker to pocket the center disk in the corner pockets.',
  instructions: [
    'Position the striker on the baseline (drag left/right).',
    'Drag back from the striker to aim and set power, then release to shoot.',
    'Pocket the center queen disk in any of the 4 corner pockets.',
    'Flick and score points. Get 50 points to win the match.',
  ],
};

interface CarromProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_SIZE = 300;
const FRICTION = 0.985;
const POCKET_RADIUS = 18;
const DISK_RADIUS = 10;

interface Disk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isStriker: boolean;
}

export const Carrom: React.FC<CarromProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'aiming' | 'sliding' | 'won' | 'lost'>('idle');

  // Disk positions and velocities
  const striker = useRef<Disk>({ x: CANVAS_SIZE / 2, y: 240, vx: 0, vy: 0, radius: DISK_RADIUS + 2, isStriker: true });
  const queen = useRef<Disk>({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, vx: 0, vy: 0, radius: DISK_RADIUS, isStriker: false });

  // Aiming vector state
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragCurrent = useRef<{ x: number; y: number } | null>(null);
  const isDraggingStriker = useRef(false);

  const pockets = [
    { x: POCKET_RADIUS, y: POCKET_RADIUS },
    { x: CANVAS_SIZE - POCKET_RADIUS, y: POCKET_RADIUS },
    { x: POCKET_RADIUS, y: CANVAS_SIZE - POCKET_RADIUS },
    { x: CANVAS_SIZE - POCKET_RADIUS, y: CANVAS_SIZE - POCKET_RADIUS },
  ];

  const startNewGame = () => {
    audio.playClick();
    setScore(0);
    setStatus('aiming');
    resetPositions();
  };

  const resetPositions = () => {
    striker.current = { x: CANVAS_SIZE / 2, y: 240, vx: 0, vy: 0, radius: DISK_RADIUS + 2, isStriker: true };
    queen.current = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2, vx: 0, vy: 0, radius: DISK_RADIUS, isStriker: false };
    dragStart.current = null;
    dragCurrent.current = null;
    isDraggingStriker.current = false;
  };

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (status !== 'aiming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check click on striker
    const dist = Math.hypot(mx - striker.current.x, my - striker.current.y);
    if (dist <= striker.current.radius + 10) {
      isDraggingStriker.current = true;
      dragStart.current = { x: striker.current.x, y: striker.current.y };
      dragCurrent.current = { x: mx, y: my };
      audio.playClick();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingStriker.current || !dragStart.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    dragCurrent.current = { x: mx, y: my };
  };

  const handleMouseUp = () => {
    if (!isDraggingStriker.current || !dragStart.current || !dragCurrent.current) return;
    isDraggingStriker.current = false;

    // Apply flick velocity based on drag vector
    const dx = dragStart.current.x - dragCurrent.current.x;
    const dy = dragStart.current.y - dragCurrent.current.y;
    striker.current.vx = dx * 0.15;
    striker.current.vy = dy * 0.15;

    audio.playClick();
    setStatus('sliding');
  };

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

    const updatePhysics = () => {
      if (status !== 'sliding') return;

      const disks = [striker.current, queen.current];

      // Move disks & friction
      disks.forEach(disk => {
        disk.x += disk.vx;
        disk.y += disk.vy;
        disk.vx *= FRICTION;
        disk.vy *= FRICTION;

        // Wall collisions
        const minX = disk.radius;
        const maxX = CANVAS_SIZE - disk.radius;
        const minY = disk.radius;
        const maxY = CANVAS_SIZE - disk.radius;

        if (disk.x < minX) { disk.x = minX; disk.vx = -disk.vx; audio.playClick(); }
        if (disk.x > maxX) { disk.x = maxX; disk.vx = -disk.vx; audio.playClick(); }
        if (disk.y < minY) { disk.y = minY; disk.vy = -disk.vy; audio.playClick(); }
        if (disk.y > maxY) { disk.y = maxY; disk.vy = -disk.vy; audio.playClick(); }
      });

      // Disk to disk collision
      const dist = Math.hypot(striker.current.x - queen.current.x, striker.current.y - queen.current.y);
      const minDist = striker.current.radius + queen.current.radius;
      if (dist < minDist) {
        audio.playMerge();
        // Simple elastic collision response
        const nx = (queen.current.x - striker.current.x) / dist;
        const ny = (queen.current.y - striker.current.y) / dist;
        const kx = striker.current.vx - queen.current.vx;
        const ky = striker.current.vy - queen.current.vy;
        const p = nx * kx + ny * ky;

        striker.current.vx -= p * nx;
        striker.current.vy -= p * ny;
        queen.current.vx += p * nx;
        queen.current.vy += p * ny;
      }

      // Check pockets
      pockets.forEach(pocket => {
        const distToQueen = Math.hypot(queen.current.x - pocket.x, queen.current.y - pocket.y);
        if (distToQueen < POCKET_RADIUS + 5) {
          audio.playScore();
          // Pocketed!
          setScore(s => {
            const next = s + 10;
            if (next >= 50) {
              setStatus('won');
              audio.playWin();
              confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
              onUpdateRecord('carrom', {
                highScore: Math.max(record.highScore, next),
                gamesPlayed: record.gamesPlayed + 1,
                gamesWon: record.gamesWon + 1,
              });
            } else {
              setStatus('aiming');
              resetPositions();
            }
            return next;
          });
        }

        const distToStriker = Math.hypot(striker.current.x - pocket.x, striker.current.y - pocket.y);
        if (distToStriker < POCKET_RADIUS + 5) {
          audio.playLose();
          setStatus('lost');
          onUpdateRecord('carrom', {
            highScore: record.highScore,
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon,
          });
        }
      });

      // Check rest
      const strikerSpeed = Math.hypot(striker.current.vx, striker.current.vy);
      const queenSpeed = Math.hypot(queen.current.vx, queen.current.vy);
      if (strikerSpeed < 0.05 && queenSpeed < 0.05) {
        striker.current.vx = 0; striker.current.vy = 0;
        queen.current.vx = 0; queen.current.vy = 0;
        setStatus('aiming');
        resetPositions();
      }
    };

    const draw = () => {
      const styles = resolveThemeStyles();

      // Clear board
      ctx.fillStyle = styles.bg;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw Center circles
      ctx.strokeStyle = styles.grayLight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 40, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Pockets
      ctx.fillStyle = styles.grayDark;
      pockets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = styles.border;
        ctx.stroke();
      });

      // Draw Baseline
      ctx.strokeStyle = styles.grayLight;
      ctx.beginPath();
      ctx.moveTo(30, 240);
      ctx.lineTo(CANVAS_SIZE - 30, 240);
      ctx.stroke();

      // Draw Queen
      ctx.fillStyle = styles.fg;
      ctx.beginPath();
      ctx.arc(queen.current.x, queen.current.y, queen.current.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = styles.border;
      ctx.stroke();

      // Draw Striker
      ctx.fillStyle = styles.bg;
      ctx.beginPath();
      ctx.arc(striker.current.x, striker.current.y, striker.current.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = styles.border;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw Aim Vector
      if (isDraggingStriker.current && dragStart.current && dragCurrent.current) {
        ctx.strokeStyle = styles.border;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(striker.current.x, striker.current.y);
        // Draw line opposite to drag direction
        const dx = dragStart.current.x - dragCurrent.current.x;
        const dy = dragStart.current.y - dragCurrent.current.y;
        ctx.lineTo(striker.current.x + dx, striker.current.y + dy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const loop = () => {
      updatePhysics();
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
    onUpdateRecord('carrom', {
      highScore: Math.max(record.highScore, 50),
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

  return (
    <div data-testid="game-carrom" style={{ width: '100%' }}>
      <GameWrapper
        title="Carrom"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={startNewGame}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            <span>SCORE: {score}</span>
            <span>STATUS: {status.toUpperCase()}</span>
          </div>

          <canvas
            ref={canvasRef}
            data-testid="carrom-canvas"
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              border: '4px solid var(--border)',
              display: 'block',
              backgroundColor: 'var(--bg)',
              maxWidth: '100%',
            }}
          />

          {status === 'won' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', marginBottom: '8px' }}>MATCH WON!</p>
              <button className="brutalist-button" onClick={startNewGame}>PLAY AGAIN</button>
            </div>
          )}

          {status === 'lost' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', marginBottom: '8px' }}>STRIKER POCKETED! MATCH LOST.</p>
              <button className="brutalist-button" onClick={startNewGame}>PLAY AGAIN</button>
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

export default Carrom;
