import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'slingshot',
  title: 'SlingShot',
  description: 'Aim, pull back, and launch projectiles to destroy targets in this retro physics-based game.',
  instructions: [
    'Drag back on the projectile to aim and set launch power.',
    'Release to launch the projectile at the targets.',
    'Clear all targets within the limit to win!',
  ],
};

interface SlingShotProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const GROUND_Y = 250;
const SLING_X = 80;
const SLING_Y = 200;
const PROJECTILE_RADIUS = 8;
const TARGET_RADIUS = 15;

export const SlingShot: React.FC<SlingShotProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('playing');
  const [shotsRemaining, setShotsRemaining] = useState(5);
  const [isDragging, setIsDragging] = useState(false);

  // Physics state refs
  const scoreRef = useRef(0);
  const shotsRemainingRef = useRef(5);
  const projX = useRef(SLING_X);
  const projY = useRef(SLING_Y);
  const projVx = useRef(0);
  const projVy = useRef(0);
  const isFlying = useRef(false);
  const isDraggingRef = useRef(false);
  const dragX = useRef(SLING_X);
  const dragY = useRef(SLING_Y);

  const updateDragging = (val: boolean) => {
    setIsDragging(val);
    isDraggingRef.current = val;
  };

  // Targets state (3 targets)
  const targets = useRef<{ x: number; y: number; active: boolean }[]>([
    { x: 300, y: 150, active: true },
    { x: 340, y: 200, active: true },
    { x: 310, y: 90, active: true },
  ]);

  const initGame = () => {
    scoreRef.current = 0;
    shotsRemainingRef.current = 5;
    setScore(0);
    setStatus('playing');
    setShotsRemaining(5);
    isFlying.current = false;
    updateDragging(false);
    projX.current = SLING_X;
    projY.current = SLING_Y;
    projVx.current = 0;
    projVy.current = 0;
    targets.current = [
      { x: 300, y: 150, active: true },
      { x: 340, y: 200, active: true },
      { x: 310, y: 90, active: true },
    ];
  };

  const handleSimulateWin = () => {
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    setStatus('won');
    scoreRef.current = 3;
    setScore(3);
    targets.current.forEach(t => (t.active = false));
    onUpdateRecord('slingshot', {
      highScore: Math.max(record.highScore, 300),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    audio.playLose();
    setStatus('lost');
    shotsRemainingRef.current = 0;
    setShotsRemaining(0);
    onUpdateRecord('slingshot', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const updatePhysics = () => {
      if (status !== 'playing') return;

      if (isFlying.current) {
        // Apply velocity & gravity
        projX.current += projVx.current;
        projY.current += projVy.current;
        projVy.current += 0.25; // gravity

        // Check target collisions
        let hitAny = false;
        targets.current.forEach(target => {
          if (!target.active) return;
          const dx = projX.current - target.x;
          const dy = projY.current - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < PROJECTILE_RADIUS + TARGET_RADIUS) {
            target.active = false;
            hitAny = true;
            audio.playScore();
            scoreRef.current += 1;
            setScore(scoreRef.current);
            const activeCount = targets.current.filter(t => t.active).length;
            if (activeCount === 0) {
              setStatus('won');
              audio.playWin();
              confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
              onUpdateRecord('slingshot', {
                highScore: Math.max(record.highScore, scoreRef.current * 100),
                gamesPlayed: record.gamesPlayed + 1,
                gamesWon: record.gamesWon + 1,
              });
            }
          }
        });

        // Check if out of bounds or ground collision
        const outOfBounds =
          projX.current > CANVAS_WIDTH + 20 ||
          projX.current < -20 ||
          projY.current > GROUND_Y + 10;

        if (hitAny || outOfBounds) {
          isFlying.current = false;
          projX.current = SLING_X;
          projY.current = SLING_Y;
          projVx.current = 0;
          projVy.current = 0;

          // Check Lose Condition if no targets hit and out of shots
          shotsRemainingRef.current -= 1;
          setShotsRemaining(shotsRemainingRef.current);
          const activeCount = targets.current.filter(t => t.active).length;
          if (shotsRemainingRef.current <= 0 && activeCount > 0 && status === 'playing') {
            setStatus('lost');
            audio.playLose();
            onUpdateRecord('slingshot', {
              highScore: record.highScore,
              gamesPlayed: record.gamesPlayed + 1,
              gamesWon: record.gamesWon,
            });
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw ground
      ctx.strokeStyle = 'var(--border)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Draw slingshot structure
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(SLING_X, GROUND_Y);
      ctx.lineTo(SLING_X, SLING_Y + 10);
      ctx.moveTo(SLING_X - 10, SLING_Y - 10);
      ctx.lineTo(SLING_X, SLING_Y + 10);
      ctx.lineTo(SLING_X + 10, SLING_Y - 10);
      ctx.stroke();

      // Draw targets
      targets.current.forEach(t => {
        if (!t.active) return;
        ctx.fillStyle = 'var(--fg)';
        ctx.strokeStyle = 'var(--border)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, TARGET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Target inner details (retro style bullseye)
        ctx.strokeStyle = 'var(--bg)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, TARGET_RADIUS - 6, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw aiming line if dragging
      if (isDraggingRef.current) {
        ctx.strokeStyle = 'var(--gray-dark)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(SLING_X, SLING_Y);
        // Draw reverse aiming path
        const dx = SLING_X - dragX.current;
        const dy = SLING_Y - dragY.current;
        ctx.lineTo(SLING_X + dx * 2, SLING_Y + dy * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw rubber band
        ctx.strokeStyle = 'var(--border)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SLING_X - 10, SLING_Y - 10);
        ctx.lineTo(dragX.current, dragY.current);
        ctx.lineTo(SLING_X + 10, SLING_Y - 10);
        ctx.stroke();
      }

      // Draw projectile
      ctx.fillStyle = 'var(--fg)';
      ctx.beginPath();
      const px = isDraggingRef.current ? dragX.current : projX.current;
      const py = isDraggingRef.current ? dragY.current : projY.current;
      ctx.arc(px, py, PROJECTILE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'var(--border)';
      ctx.stroke();
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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (status !== 'playing' || isFlying.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - SLING_X;
    const dy = y - SLING_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 25) {
      updateDragging(true);
      dragX.current = x;
      dragY.current = y;
      audio.playClick();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - SLING_X;
    const dy = y - SLING_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 60) {
      const angle = Math.atan2(dy, dx);
      dragX.current = SLING_X + Math.cos(angle) * 60;
      dragY.current = SLING_Y + Math.sin(angle) * 60;
    } else {
      dragX.current = x;
      dragY.current = y;
    }
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    updateDragging(false);

    // Launch
    const dx = SLING_X - dragX.current;
    const dy = SLING_Y - dragY.current;

    projX.current = dragX.current;
    projY.current = dragY.current;
    projVx.current = dx * 0.15;
    projVy.current = dy * 0.15;
    isFlying.current = true;
    audio.playClick();
  };

  return (
    <div data-testid="game-slingshot" style={{ width: '100%' }}>
      <GameWrapper
        title="SlingShot"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={initGame}
        highScore={record.highScore}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span>State: {score}</span>
            <span>SHOTS: {shotsRemaining}</span>
            <span>STATUS: {status.toUpperCase()}</span>
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              border: '4px solid var(--border)',
              display: 'block',
              backgroundColor: 'var(--bg)',
              cursor: isDragging ? 'grabbing' : 'grab',
              maxWidth: '100%',
            }}
          />

          {status === 'won' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>VICTORY! ALL TARGETS DESTROYED.</p>
              <button className="brutalist-button" onClick={initGame}>PLAY AGAIN</button>
            </div>
          )}

          {status === 'lost' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>GAME OVER! OUT OF AMMO.</p>
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

export default SlingShot;
