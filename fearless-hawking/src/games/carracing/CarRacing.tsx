import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'carracing',
  title: 'Traffic Racer',
  description: 'Dodge oncoming traffic in this top-down racer. Choose your car and hit the road!',
  instructions: [
    'Select your car class and color, then press Start.',
    'Use Left/Right arrow keys (or A/D) to steer.',
    'Dodge oncoming traffic cars, trucks, SUVs, vans, and ambulances.',
    'Dodge 25 vehicles to win. Speed increases over time!',
  ],
};

type GameStatus = 'setup' | 'playing' | 'won' | 'lost';
type CarClass = 'basic' | 'sports' | 'super';

interface Obstacle {
  x: number;
  y: number;
  speed: number;
  active: boolean;
  type: 'car' | 'truck' | 'suv' | 'van' | 'ambulance';
  color: string;
  height: number;
  width: number;
}

interface CarRacingProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 500;
const ROAD_LEFT = 40;
const ROAD_RIGHT = 280;
const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT; // 240
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT; // 80

const CAR_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#9b59b6', '#e67e22', '#00bcd4', '#f0f0f0',
];

const TRAFFIC_PALETTE = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#95a5a6',
];

const OBSTACLE_TYPES: Array<'car' | 'truck' | 'suv' | 'van' | 'ambulance'> = [
  'car', 'truck', 'suv', 'van', 'ambulance',
];

const OBSTACLE_DIMS: Record<string, { width: number; height: number }> = {
  car: { width: 26, height: 48 },
  truck: { width: 32, height: 68 },
  suv: { width: 30, height: 52 },
  van: { width: 32, height: 60 },
  ambulance: { width: 32, height: 60 },
};

// ── Drawing helpers ─────────────────────────────────────────────────────────

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawBasicCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // Body
  ctx.fillStyle = color;
  fillRoundedRect(ctx, x, y, 26, 48, 4);
  // Windshield
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 3, y + 6, 20, 12);
  // Rear window
  ctx.fillRect(x + 3, y + 30, 20, 8);
  // Wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 3, y + 4, 5, 10);
  ctx.fillRect(x + 24, y + 4, 5, 10);
  ctx.fillRect(x - 3, y + 34, 5, 10);
  ctx.fillRect(x + 24, y + 34, 5, 10);
  // Headlights
  ctx.fillStyle = '#ffffaa';
  ctx.fillRect(x + 2, y + 2, 8, 4);
  ctx.fillRect(x + 16, y + 2, 8, 4);
}

function drawSportsCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // Pointed trapezoidal body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 14, y);
  ctx.lineTo(x + 28, y + 15);
  ctx.lineTo(x + 28, y + 50);
  ctx.lineTo(x, y + 50);
  ctx.lineTo(x, y + 15);
  ctx.closePath();
  ctx.fill();
  // Large windshield
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 4, y + 14, 20, 14);
  // Rear window
  ctx.fillRect(x + 4, y + 33, 20, 8);
  // Spoiler bar
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 47);
  ctx.lineTo(x + 27, y + 47);
  ctx.stroke();
  // Wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 3, y + 14, 5, 10);
  ctx.fillRect(x + 26, y + 14, 5, 10);
  ctx.fillRect(x - 3, y + 34, 5, 10);
  ctx.fillRect(x + 26, y + 34, 5, 10);
  // Headlights — triangular bright areas at front corners
  ctx.fillStyle = '#ffffaa';
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 15);
  ctx.lineTo(x + 11, y + 15);
  ctx.lineTo(x + 5, y + 19);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 23, y + 15);
  ctx.lineTo(x + 17, y + 15);
  ctx.lineTo(x + 23, y + 19);
  ctx.closePath();
  ctx.fill();
}

function drawSuperCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // Wide trapezoid body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + 28, y);
  ctx.lineTo(x + 32, y + 18);
  ctx.lineTo(x + 32, y + 52);
  ctx.lineTo(x, y + 52);
  ctx.lineTo(x, y + 18);
  ctx.closePath();
  ctx.fill();
  // Huge windshield
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 5, y + 16, 22, 14);
  // Rear window
  ctx.fillRect(x + 5, y + 35, 22, 10);
  // Side intake scoops
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y + 24, 4, 8);
  ctx.fillRect(x + 28, y + 24, 4, 8);
  // Wide rear diffuser
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 2, y + 48, 28, 4);
  // Wide wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(x - 4, y + 6, 6, 12);
  ctx.fillRect(x + 30, y + 6, 6, 12);
  ctx.fillRect(x - 4, y + 34, 6, 12);
  ctx.fillRect(x + 30, y + 34, 6, 12);
  // Aggressive headlights
  ctx.fillStyle = '#ffffaa';
  ctx.fillRect(x + 4, y + 2, 10, 5);
  ctx.fillRect(x + 18, y + 2, 10, 5);
  // Center hood stripe
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 14, y + 2, 4, 46);
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
  const { x, y, type, color, width: w, height: h } = obs;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (type === 'car') {
    // Sedan outline
    ctx.strokeRect(x, y, w, h);
    // Windshield
    ctx.strokeRect(x + 3, y + 6, w - 6, 12);
    // Rear window
    ctx.strokeRect(x + 3, y + h - 18, w - 6, 8);
    // Wheels
    ctx.strokeRect(x - 3, y + 4, 5, 10);
    ctx.strokeRect(x + w - 2, y + 4, 5, 10);
    ctx.strokeRect(x - 3, y + h - 14, 5, 10);
    ctx.strokeRect(x + w - 2, y + h - 14, 5, 10);

  } else if (type === 'truck') {
    // Full outline
    ctx.strokeRect(x, y, w, h);
    // Cab top 20px
    ctx.strokeRect(x, y, w, 20);
    // Windshield in cab
    ctx.strokeRect(x + 3, y + 3, w - 6, 10);
    // Cargo box
    ctx.strokeRect(x, y + 20, w, h - 20);
    // Wheels
    ctx.strokeRect(x - 3, y + 4, 5, 10);
    ctx.strokeRect(x + w - 2, y + 4, 5, 10);
    ctx.strokeRect(x - 3, y + h - 14, 5, 10);
    ctx.strokeRect(x + w - 2, y + h - 14, 5, 10);

  } else if (type === 'suv') {
    // Boxy outline
    ctx.strokeRect(x, y, w, h);
    // Large windshield
    ctx.strokeRect(x + 3, y + 5, w - 6, 14);
    // Roof rack line
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2);
    ctx.lineTo(x + w - 4, y + 2);
    ctx.stroke();
    // Rear window
    ctx.strokeRect(x + 3, y + h - 16, w - 6, 8);
    // Wheels
    ctx.strokeRect(x - 3, y + 5, 5, 11);
    ctx.strokeRect(x + w - 2, y + 5, 5, 11);
    ctx.strokeRect(x - 3, y + h - 16, 5, 11);
    ctx.strokeRect(x + w - 2, y + h - 16, 5, 11);

  } else if (type === 'van' || type === 'ambulance') {
    // Tall box
    ctx.strokeRect(x, y, w, h);
    // Small windshield at top 15px
    ctx.strokeRect(x + 3, y + 3, w - 6, 12);
    // Sliding door line
    ctx.beginPath();
    ctx.moveTo(x + w - 10, y + 18);
    ctx.lineTo(x + w - 10, y + h - 5);
    ctx.stroke();
    // Wheels
    ctx.strokeRect(x - 3, y + 5, 5, 11);
    ctx.strokeRect(x + w - 2, y + 5, 5, 11);
    ctx.strokeRect(x - 3, y + h - 16, 5, 11);
    ctx.strokeRect(x + w - 2, y + h - 16, 5, 11);

    if (type === 'ambulance') {
      // Cross in cargo area
      const midY = y + 18 + (h - 18) / 2;
      const midX = x + w / 2;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(midX - 8, midY);
      ctx.lineTo(midX + 8, midY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(midX, midY - 8);
      ctx.lineTo(midX, midY + 8);
      ctx.stroke();
    }
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, roadOffset: number) {
  // Road surface
  ctx.fillStyle = '#444';
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, CANVAS_HEIGHT);

  // Shoulders
  ctx.fillStyle = '#888';
  ctx.fillRect(ROAD_LEFT - 10, 0, 10, CANVAS_HEIGHT);
  ctx.fillRect(ROAD_RIGHT, 0, 10, CANVAS_HEIGHT);

  // Lane dashes
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.setLineDash([30, 20]);
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const lx = ROAD_LEFT + lane * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(lx, -20 + (roadOffset % 50));
    ctx.lineTo(lx, CANVAS_HEIGHT + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// ── Component ─────────────────────────────────────────────────────────────

export const CarRacing: React.FC<CarRacingProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Setup state
  const [carClass, setCarClass] = useState<CarClass>('basic');
  const [playerColor, setPlayerColor] = useState<string>('#e74c3c');
  const [gameStatus, setGameStatus] = useState<GameStatus>('setup');
  const [score, setScore] = useState(0);

  // Game refs (mutable without re-render)
  const obstacles = useRef<Obstacle[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const playerX = useRef(ROAD_LEFT + ROAD_WIDTH / 2 - 13);
  const roadOffset = useRef(0);
  const lastSpawnTime = useRef(0);
  const scoreRef = useRef(0);
  const statusRef = useRef<GameStatus>('setup');
  const carClassRef = useRef<CarClass>('basic');
  const playerColorRef = useRef<string>('#e74c3c');
  const animFrameRef = useRef<number>(0);

  // Player car dimensions
  const carDims = useRef({ width: 26, height: 48 });

  // Keep refs in sync with state
  useEffect(() => { statusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { carClassRef.current = carClass; }, [carClass]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);

  // Key listeners
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) e.preventDefault();
      keysPressed.current[e.key] = true;
    };
    const up = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const getLaneCenterX = (lane: number, vehicleWidth: number) =>
    ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2 - vehicleWidth / 2;

  const spawnObstacle = useCallback(() => {
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
    const dims = OBSTACLE_DIMS[type];
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const color = TRAFFIC_PALETTE[Math.floor(Math.random() * TRAFFIC_PALETTE.length)];
    const speed = 2 + Math.floor(scoreRef.current / 5) * 0.5 + Math.random() * 0.5;
    obstacles.current.push({
      x: getLaneCenterX(lane, dims.width),
      y: -dims.height - 5,
      speed,
      active: true,
      type,
      color,
      width: dims.width,
      height: dims.height,
    });
  }, []);

  const startGame = useCallback(() => {
    audio.playClick();

    // Set car dimensions
    if (carClass === 'basic') carDims.current = { width: 26, height: 48 };
    else if (carClass === 'sports') carDims.current = { width: 28, height: 50 };
    else carDims.current = { width: 32, height: 52 };

    // Reset all game state
    playerX.current = ROAD_LEFT + ROAD_WIDTH / 2 - carDims.current.width / 2;
    obstacles.current = [];
    keysPressed.current = {};
    roadOffset.current = 0;
    lastSpawnTime.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setGameStatus('playing');
    statusRef.current = 'playing';
  }, [carClass]);

  const handleWin = useCallback(() => {
    statusRef.current = 'won';
    setGameStatus('won');
    audio.playWin();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    const newScore = scoreRef.current * 10;
    onUpdateRecord('carracing', {
      highScore: Math.max(record.highScore, newScore),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  }, [record, onUpdateRecord]);

  const handleLose = useCallback(() => {
    statusRef.current = 'lost';
    setGameStatus('lost');
    audio.playLose();
    const newScore = scoreRef.current * 10;
    onUpdateRecord('carracing', {
      highScore: Math.max(record.highScore, newScore),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  }, [record, onUpdateRecord]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (timestamp: number) => {
      const status = statusRef.current;

      if (status === 'playing') {
        const curScore = scoreRef.current;
        const baseSpeed = 2 + Math.floor(curScore / 5) * 0.5;
        roadOffset.current = (roadOffset.current + baseSpeed) % 50;

        // Player movement
        const cls = carClassRef.current;
        const speed = cls === 'super' ? 6 : cls === 'sports' ? 5 : 4;
        const cw = carDims.current.width;

        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) {
          playerX.current = Math.max(ROAD_LEFT + 2, playerX.current - speed);
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) {
          playerX.current = Math.min(ROAD_RIGHT - cw - 2, playerX.current + speed);
        }

        // Spawn obstacles
        const spawnInterval = Math.max(800, 1800 - curScore * 40);
        if (timestamp - lastSpawnTime.current > spawnInterval) {
          spawnObstacle();
          lastSpawnTime.current = timestamp;
        }

        // Update obstacles
        const ch = carDims.current.height;
        const playerY = CANVAS_HEIGHT - ch - 10;

        let gained = 0;
        let collided = false;

        obstacles.current.forEach(obs => {
          if (!obs.active) return;
          obs.y += obs.speed;

          // Passed bottom → score
          if (obs.y > CANVAS_HEIGHT) {
            obs.active = false;
            gained++;
            return;
          }

          // Collision: AABB
          const px = playerX.current, py = playerY;
          const margin = 2;
          if (
            px + margin < obs.x + obs.width &&
            px + cw - margin > obs.x &&
            py + margin < obs.y + obs.height &&
            py + ch - margin > obs.y
          ) {
            collided = true;
          }
        });

        obstacles.current = obstacles.current.filter(o => o.active);

        if (collided) {
          handleLose();
        } else if (gained > 0) {
          const newScore = scoreRef.current + gained;
          scoreRef.current = newScore;
          setScore(newScore);
          audio.playScore();
          if (newScore >= 25) {
            handleWin();
          }
        }
      }

      // ── Draw ──────────────────────────────────────────────────────────────

      // Sky / grass
      ctx.fillStyle = '#6ab04c';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawRoad(ctx, roadOffset.current);

      // Obstacles
      obstacles.current.forEach(obs => drawObstacle(ctx, obs));

      // Player car
      const playerY2 = CANVAS_HEIGHT - carDims.current.height - 10;
      const cl = carClassRef.current;
      const col = playerColorRef.current;
      if (cl === 'basic') drawBasicCar(ctx, playerX.current, playerY2, col);
      else if (cl === 'sports') drawSportsCar(ctx, playerX.current, playerY2, col);
      else drawSuperCar(ctx, playerX.current, playerY2, col);

      // Score overlay
      if (statusRef.current === 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(4, 4, 90, 26);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`DODGE: ${scoreRef.current}/25`, 10, 21);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, spawnObstacle, handleLose, handleWin]);

  // Mobile controls
  const holdLeft = useRef(false);
  const holdRight = useRef(false);

  const startLeft = () => { holdLeft.current = true; keysPressed.current['ArrowLeft'] = true; };
  const stopLeft = () => { holdLeft.current = false; keysPressed.current['ArrowLeft'] = false; };
  const startRight = () => { holdRight.current = true; keysPressed.current['ArrowRight'] = true; };
  const stopRight = () => { holdRight.current = false; keysPressed.current['ArrowRight'] = false; };

  const carClassOptions: { label: string; value: CarClass; desc: string }[] = [
    { label: 'Basic', value: 'basic', desc: 'Steady & reliable' },
    { label: 'Sports', value: 'sports', desc: 'Sleek & fast' },
    { label: 'Super', value: 'super', desc: 'Wide & aggressive' },
  ];

  return (
    <div data-testid="game-carracing" style={{ width: '100%' }}>
      <GameWrapper
        title="Traffic Racer"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={gameStatus !== 'setup' ? startGame : undefined}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>

          {/* ── SETUP SCREEN ─────────────────────────────────────────── */}
          {gameStatus === 'setup' && (
            <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Car Class */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Car Class
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {carClassOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setCarClass(opt.value); audio.playClick(); }}
                      style={{
                        flex: 1,
                        padding: '10px 6px',
                        border: `3px solid ${carClass === opt.value ? 'var(--fg)' : 'var(--border)'}`,
                        background: carClass === opt.value ? 'var(--fg)' : 'var(--bg)',
                        color: carClass === opt.value ? 'var(--bg)' : 'var(--fg)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        transition: 'all 0.1s',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', marginBottom: '3px' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.75, fontWeight: 'normal' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Car Color */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Car Color
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {CAR_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => { setPlayerColor(c); audio.playClick(); }}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: c,
                        border: playerColor === c ? '3px solid var(--fg)' : '3px solid transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: playerColor === c ? '0 0 0 2px var(--bg), 0 0 0 4px var(--fg)' : '2px 2px 0 var(--border)',
                        transition: 'box-shadow 0.1s',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview of selected car on road */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <canvas
                  width={120}
                  height={100}
                  style={{ border: '2px solid var(--border)', borderRadius: '4px', background: '#444' }}
                  ref={(el) => {
                    if (!el) return;
                    const ctx2 = el.getContext('2d');
                    if (!ctx2) return;
                    ctx2.clearRect(0, 0, 120, 100);
                    ctx2.fillStyle = '#444';
                    ctx2.fillRect(0, 0, 120, 100);
                    // Lane lines
                    ctx2.strokeStyle = '#fff';
                    ctx2.lineWidth = 1;
                    ctx2.setLineDash([8, 6]);
                    ctx2.beginPath(); ctx2.moveTo(40, 0); ctx2.lineTo(40, 100); ctx2.stroke();
                    ctx2.beginPath(); ctx2.moveTo(80, 0); ctx2.lineTo(80, 100); ctx2.stroke();
                    ctx2.setLineDash([]);
                    const pw = carClass === 'basic' ? 26 : carClass === 'sports' ? 28 : 32;
                    const ph = carClass === 'basic' ? 48 : carClass === 'sports' ? 50 : 52;
                    const px2 = 60 - pw / 2;
                    const py2 = 50 - ph / 2;
                    if (carClass === 'basic') drawBasicCar(ctx2, px2, py2, playerColor);
                    else if (carClass === 'sports') drawSportsCar(ctx2, px2, py2, playerColor);
                    else drawSuperCar(ctx2, px2, py2, playerColor);
                  }}
                />
              </div>

              {/* START button */}
              <button
                className="brutalist-button"
                onClick={startGame}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.1em' }}
              >
                START RACE
              </button>
            </div>
          )}

          {/* ── CANVAS (shown during gameplay + end) ─────────────────── */}
          {gameStatus !== 'setup' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: `${CANVAS_WIDTH}px`, fontSize: '0.8rem', fontWeight: 'bold' }}>
                <span>DODGE: {score}/25</span>
                <span>STATUS: {gameStatus.toUpperCase()}</span>
              </div>

              <canvas
                ref={canvasRef}
                data-testid="carracing-canvas"
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{
                  border: '4px solid var(--border)',
                  display: 'block',
                  maxWidth: '100%',
                }}
              />

              {/* Mobile controls */}
              {gameStatus === 'playing' && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    className="brutalist-button"
                    onPointerDown={startLeft}
                    onPointerUp={stopLeft}
                    onPointerLeave={stopLeft}
                    style={{ fontSize: '1.4rem', padding: '10px 22px', userSelect: 'none' }}
                    aria-label="Steer left"
                  >
                    ◄
                  </button>
                  <button
                    className="brutalist-button"
                    onPointerDown={startRight}
                    onPointerUp={stopRight}
                    onPointerLeave={stopRight}
                    style={{ fontSize: '1.4rem', padding: '10px 22px', userSelect: 'none' }}
                    aria-label="Steer right"
                  >
                    ►
                  </button>
                </div>
              )}

              {gameStatus === 'won' && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>🏆 YOU WIN! 25 DODGES!</p>
                  <p style={{ fontSize: '0.8rem', marginBottom: '12px' }}>Score: {score * 10}</p>
                  <button className="brutalist-button" onClick={startGame}>RACE AGAIN</button>
                </div>
              )}

              {gameStatus === 'lost' && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>💥 CRASHED! {score} dodge{score !== 1 ? 's' : ''}</p>
                  <p style={{ fontSize: '0.8rem', marginBottom: '12px' }}>Score: {score * 10}</p>
                  <button className="brutalist-button" onClick={startGame}>TRY AGAIN</button>
                </div>
              )}
            </>
          )}

        </div>
      </GameWrapper>
    </div>
  );
};

export default CarRacing;
