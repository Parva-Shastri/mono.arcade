import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Pause } from 'lucide-react';

export const metadata: GameMetadata = {
  id: 'snake',
  title: 'Snake',
  description: 'Navigate the grid, devour blocks, and avoid your own trail. Styled with sleek geometric outlines.',
  instructions: [
    'Use WASD, Arrow Keys, or the on-screen D-pad to change the snake\'s direction.',
    'Eat the flashing food blocks to grow and increase your score.',
    'Avoid colliding with your own tail and the walls (unless Wrap is ON).',
    'Set speed (Slow, Normal, Fast) to customize the challenge level.',
  ],
};

interface Coordinate {
  x: number;
  y: number;
}

interface SnakeProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: 'snake', record: ScoreRecord) => void;
}

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

export const Snake: React.FC<SnakeProps> = ({ onBack, record, onUpdateRecord }) => {
  const [snake, setSnake] = useState<Coordinate[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [food, setFood] = useState<Coordinate>({ x: 5, y: 5 });
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [allowWrap, setAllowWrap] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [newHighScore, setNewHighScore] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextDirection = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const foodPulse = useRef<number>(0);

  // Map speed level to milliseconds
  const speedIntervals = {
    slow: 150,
    normal: 100,
    fast: 60,
  };

  // Generate random food coordinate, ensuring it doesn't land on the snake
  const generateFood = (currentSnake: Coordinate[]): Coordinate => {
    let newFood: Coordinate;
    let isOnSnake: boolean;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      isOnSnake = currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
    } while (isOnSnake);
    return newFood;
  };

  // Reset function
  const handleReset = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initialSnake);
    setDirection('UP');
    nextDirection.current = 'UP';
    setFood(generateFood(initialSnake));
    setIsGameOver(false);
    setIsPaused(true);
    setScore(0);
    setNewHighScore(false);
  };

  // Handle keypresses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault(); // Prevent scrolling
      }

      if (isGameOver) return;

      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        audio.playClick();
        setIsPaused((p) => !p);
        return;
      }

      if (isPaused) return;

      let nextDir = nextDirection.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (direction !== 'DOWN') nextDir = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (direction !== 'UP') nextDir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (direction !== 'RIGHT') nextDir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (direction !== 'LEFT') nextDir = 'RIGHT';
          break;
        default:
          return;
      }

      if (nextDir !== direction) {
        audio.playClick();
        nextDirection.current = nextDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isPaused, isGameOver]);

  // Handle D-Pad Click
  const handleDirectionChange = (newDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (isGameOver || isPaused) return;
    
    let opposite: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    switch (newDir) {
      case 'UP': opposite = 'DOWN'; break;
      case 'DOWN': opposite = 'UP'; break;
      case 'LEFT': opposite = 'RIGHT'; break;
      case 'RIGHT': opposite = 'LEFT'; break;
    }

    if (direction !== opposite) {
      audio.playClick();
      nextDirection.current = newDir;
    }
  };

  // Game Loop
  useEffect(() => {
    if (isPaused || isGameOver) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const curDirection = nextDirection.current;
        setDirection(curDirection);

        const newHead = { ...head };
        switch (curDirection) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        // Boundary collision check
        if (
          newHead.x < 0 ||
          newHead.y < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y >= GRID_SIZE
        ) {
          if (allowWrap) {
            newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
            newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;
          } else {
            handleGameOver();
            return prevSnake;
          }
        }

        // Self collision check
        if (prevSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const nextSnake = [newHead, ...prevSnake];

        // Food eat check
        if (newHead.x === food.x && newHead.y === food.y) {
          audio.playScore();
          const nextScore = score + 10;
          setScore(nextScore);
          setFood(generateFood(nextSnake));

          // Realtime High Score celebration trigger
          if (nextScore > record.highScore) {
            setNewHighScore(true);
            if (!newHighScore && record.highScore > 0) {
              confetti({
                particleCount: 40,
                spread: 40,
                origin: { y: 0.8 },
                colors: ['#000000', '#ffffff', '#aaaaaa'],
              });
            }
          }
        } else {
          nextSnake.pop(); // Remove tail
        }

        return nextSnake;
      });
    };

    const handleGameOver = () => {
      setIsGameOver(true);
      audio.playLose();

      const newHS = Math.max(score, record.highScore);
      onUpdateRecord('snake', {
        highScore: newHS,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + (score > 0 ? 1 : 0),
      });
    };

    const gameInterval = setInterval(moveSnake, speedIntervals[speed]);
    return () => clearInterval(gameInterval);
  }, [isPaused, isGameOver, food, score, speed, allowWrap, record, newHighScore]);

  // Pulse animation loop for food rendering
  useEffect(() => {
    let animFrame: number;
    const animate = () => {
      foodPulse.current = (foodPulse.current + 0.1) % (Math.PI * 2);
      renderCanvas();
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [snake, food, isGameOver, isPaused]);

  // Draw board onto the Canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine current text/bg variables from root stylesheets
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const colorBg = isDarkTheme ? '#000000' : '#ffffff';
    const colorFg = isDarkTheme ? '#ffffff' : '#000000';
    const colorGrayLight = isDarkTheme ? '#1e1e1e' : '#f0f0f0';

    // 1. Clear Canvas
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 2. Draw retro dot-grid intersection lines
    ctx.fillStyle = colorGrayLight;
    for (let x = 1; x < GRID_SIZE; x++) {
      for (let y = 1; y < GRID_SIZE; y++) {
        ctx.fillRect(x * CELL_SIZE - 1, y * CELL_SIZE - 1, 2, 2);
      }
    }

    // 3. Draw Food
    const pulseFactor = Math.abs(Math.sin(foodPulse.current)); // pulsing outline
    ctx.fillStyle = colorFg;
    ctx.strokeStyle = colorFg;
    ctx.lineWidth = 2;

    const foodX = food.x * CELL_SIZE + 2;
    const foodY = food.y * CELL_SIZE + 2;
    const foodW = CELL_SIZE - 4;

    ctx.fillRect(foodX, foodY, foodW, foodW);
    // Draw white interior detail for food block
    ctx.fillStyle = colorBg;
    ctx.fillRect(foodX + 4, foodY + 4, foodW - 8, foodW - 8);
    // Blinking target cross hair
    ctx.fillStyle = colorFg;
    if (pulseFactor > 0.4) {
      ctx.fillRect(foodX + 6, foodY + 6, foodW - 12, foodW - 12);
    }

    // 4. Draw Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;

      if (isHead) {
        // Snake Head: Solid fill with thin border
        ctx.fillStyle = colorFg;
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        // Draw animated retro eyes based on movement direction
        ctx.fillStyle = colorBg;
        const eyeSize = 3;
        if (direction === 'UP' || direction === 'DOWN') {
          ctx.fillRect(x + 4, y + (direction === 'UP' ? 4 : CELL_SIZE - 7), eyeSize, eyeSize);
          ctx.fillRect(x + CELL_SIZE - 7, y + (direction === 'UP' ? 4 : CELL_SIZE - 7), eyeSize, eyeSize);
        } else {
          ctx.fillRect(x + (direction === 'LEFT' ? 4 : CELL_SIZE - 7), y + 4, eyeSize, eyeSize);
          ctx.fillRect(x + (direction === 'LEFT' ? 4 : CELL_SIZE - 7), y + CELL_SIZE - 7, eyeSize, eyeSize);
        }
      } else {
        // Snake Body: Outline or custom alternating dither fill
        ctx.strokeStyle = colorFg;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        
        // Inner detail: checker pattern if even segment
        if (index % 2 === 0) {
          ctx.fillStyle = colorFg;
          ctx.fillRect(x + 6, y + 6, CELL_SIZE - 12, CELL_SIZE - 12);
        }
      }
    });

    // 5. Draw Game Over Overlay
    if (isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 130, CANVAS_SIZE - 80, 140);
      ctx.fillRect(44, 134, CANVAS_SIZE - 88, 132);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px var(--font-sans)';
      ctx.textAlign = 'center';
      ctx.fillText('CRASH DETECTED!', CANVAS_SIZE / 2, 180);
      ctx.font = '14px var(--font-mono)';
      ctx.fillText(`FINAL SCORE: ${score}`, CANVAS_SIZE / 2, 215);
      ctx.fillText('PRESS "RESET BOARD" TO PLAY', CANVAS_SIZE / 2, 240);
    }
  };

  return (
    <GameWrapper
      title="Snake"
      instructions={metadata.instructions}
      onBack={onBack}
      onReset={handleReset}
      highScore={record.highScore}
      highScoreLabel="HIGH SCORE"
    >
      {/* Settings Row */}
      <div style={{ width: '100%', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', display: 'block', color: 'var(--gray-dark)', marginBottom: '4px' }}>SPEED</span>
            <div style={{ display: 'flex', border: '2px solid var(--border)' }}>
              {(['slow', 'normal', 'fast'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => { audio.playClick(); setSpeed(level); handleReset(); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    border: 'none',
                    backgroundColor: speed === level ? 'var(--fg)' : 'var(--bg)',
                    color: speed === level ? 'var(--bg)' : 'var(--fg)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', display: 'block', color: 'var(--gray-dark)', marginBottom: '4px' }}>WALL WRAP</span>
            <button
              onClick={() => { audio.playClick(); setAllowWrap((w) => !w); handleReset(); }}
              style={{
                padding: '4px 8px',
                fontSize: '0.7rem',
                border: '2px solid var(--border)',
                backgroundColor: allowWrap ? 'var(--fg)' : 'var(--bg)',
                color: allowWrap ? 'var(--bg)' : 'var(--fg)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
              }}
            >
              {allowWrap ? 'WRAP ON' : 'WRAP OFF'}
            </button>
          </div>
        </div>

        {/* State and Score Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => { audio.playClick(); setIsPaused((p) => !p); }}
            disabled={isGameOver}
            className="brutalist-button"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} />}
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
          
          <div
            style={{
              flexGrow: 1,
              textAlign: 'center',
              border: '2px solid var(--border)',
              padding: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              backgroundColor: 'var(--gray-light)',
            }}
          >
            {isGameOver ? (
              <span style={{ color: 'red' }}>GAME OVER</span>
            ) : newHighScore ? (
              <span>NEW BEST: {score} 🔥</span>
            ) : (
              <span>SCORE: {score}</span>
            )}
          </div>
        </div>
      </div>

      {/* Canvas viewport */}
      <div
        style={{
          border: '4px solid var(--border)',
          width: '100%',
          maxWidth: '360px',
          aspectRatio: '1',
          position: 'relative',
          backgroundColor: 'var(--bg)',
          margin: '0 auto',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {isPaused && !isGameOver && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#ffffff',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', letterSpacing: '0.1em' }}>PAUSED</h3>
            <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', opacity: 0.8 }}>
              PRESS SPACE OR RESUME TO PLAY
            </p>
          </div>
        )}
      </div>

      {/* D-Pad Buttons for Mobile Viewports */}
      <div className="dpad-container" style={{ marginTop: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', width: '150px', margin: '0 auto', gap: '6px' }}>
          <div></div>
          <button
            onClick={() => handleDirectionChange('UP')}
            className="brutalist-button dpad-btn"
            style={{ padding: '8px' }}
            aria-label="Up"
          >
            <ArrowUp size={16} />
          </button>
          <div></div>

          <button
            onClick={() => handleDirectionChange('LEFT')}
            className="brutalist-button dpad-btn"
            style={{ padding: '8px' }}
            aria-label="Left"
          >
            <ArrowLeft size={16} />
          </button>
          <div
            style={{
              border: '2px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--gray-light)',
            }}
          >
            <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--fg)', borderRadius: '50%' }}></div>
          </div>
          <button
            onClick={() => handleDirectionChange('RIGHT')}
            className="brutalist-button dpad-btn"
            style={{ padding: '8px' }}
            aria-label="Right"
          >
            <ArrowRight size={16} />
          </button>

          <div></div>
          <button
            onClick={() => handleDirectionChange('DOWN')}
            className="brutalist-button dpad-btn"
            style={{ padding: '8px' }}
            aria-label="Down"
          >
            <ArrowDown size={16} />
          </button>
          <div></div>
        </div>
      </div>

      <style>{`
        .dpad-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 2px 2px 0 0 var(--border) !important;
        }
        .dpad-btn:hover {
          transform: translate(-1px, -1px) !important;
          box-shadow: 3px 3px 0 0 var(--border) !important;
        }
        .dpad-btn:active {
          transform: translate(2px, 2px) !important;
          box-shadow: 0px 0px 0 0 var(--border) !important;
        }
        @media (min-width: 768px) {
          .dpad-container {
            display: none;
          }
        }
      `}</style>
    </GameWrapper>
  );
};

export default Snake;
