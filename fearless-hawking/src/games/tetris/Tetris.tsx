import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'tetris',
  title: 'Tetris',
  description: 'Rotate and fit falling blocks to clear lines.',
  instructions: [
    'Use arrow keys to move and rotate the falling blocks.',
    'Form complete horizontal lines to clear them and score points.',
    'Do not let the blocks reach the top of the grid.',
  ],
};

interface TetrisProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const CANVAS_WIDTH = COLS * BLOCK_SIZE;
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE;

// Tetromino shapes
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

type ShapeType = keyof typeof SHAPES;
const SHAPE_KEYS = Object.keys(SHAPES) as ShapeType[];

export const Tetris: React.FC<TetrisProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'lost'>('idle');

  // Matrix and active piece ref to avoid React re-rendering delay
  const grid = useRef<number[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
  const currentPiece = useRef<{
    shape: number[][];
    type: ShapeType;
    x: number;
    y: number;
  } | null>(null);
  const nextPieceType = useRef<ShapeType>(getRandomShapeType());

  function getRandomShapeType(): ShapeType {
    return SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  }

  const spawnPiece = () => {
    const type = nextPieceType.current;
    const shape = SHAPES[type];
    nextPieceType.current = getRandomShapeType();

    currentPiece.current = {
      shape,
      type,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0,
    };

    // Draw next preview
    drawPreview();

    // Check collision on spawn (game over)
    if (checkCollision(currentPiece.current.shape, currentPiece.current.x, currentPiece.current.y)) {
      setStatus('lost');
      audio.playLose();
      onUpdateRecord('tetris', {
        highScore: Math.max(record.highScore, score),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    }
  };

  const checkCollision = (shape: number[][], offsetX: number, offsetY: number): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const nextX = offsetX + c;
          const nextY = offsetY + r;
          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
            return true;
          }
          if (nextY >= 0 && grid.current[nextY][nextX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergePiece = () => {
    if (!currentPiece.current) return;
    const { shape, x, y } = currentPiece.current;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          if (y + r >= 0) {
            grid.current[y + r][x + c] = getShapeColorId(currentPiece.current.type);
          }
        }
      }
    }
    clearLines();
  };

  const getShapeColorId = (type: ShapeType): number => {
    return SHAPE_KEYS.indexOf(type) + 1;
  };

  const clearLines = () => {
    let cleared = 0;
    const nextGrid = grid.current.filter(row => {
      const isFull = row.every(cell => cell !== 0);
      if (isFull) cleared++;
      return !isFull;
    });

    while (nextGrid.length < ROWS) {
      nextGrid.unshift(Array(COLS).fill(0));
    }
    grid.current = nextGrid;

    if (cleared > 0) {
      audio.playMerge();
      const points = [0, 100, 300, 500, 800][cleared] || 1000;
      setScore(prev => {
        const next = prev + points;
        if (next > record.highScore) {
          confetti({
            particleCount: 20,
            spread: 30,
            origin: { y: 0.8 },
          });
        }
        return next;
      });
      setLines(l => l + cleared);
    } else {
      audio.playClick();
    }
  };

  const drop = () => {
    if (status !== 'playing' || !currentPiece.current) return;
    if (!checkCollision(currentPiece.current.shape, currentPiece.current.x, currentPiece.current.y + 1)) {
      currentPiece.current.y++;
      drawBoard();
    } else {
      mergePiece();
      spawnPiece();
      drawBoard();
    }
  };

  const handleMove = (dir: number) => {
    if (status !== 'playing' || !currentPiece.current) return;
    if (!checkCollision(currentPiece.current.shape, currentPiece.current.x + dir, currentPiece.current.y)) {
      currentPiece.current.x += dir;
      audio.playClick();
      drawBoard();
    }
  };

  const handleRotate = () => {
    if (status !== 'playing' || !currentPiece.current) return;
    const shape = currentPiece.current.shape;
    const rotated = Array(shape[0].length).fill(null).map(() => Array(shape.length).fill(0));
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        rotated[c][shape.length - 1 - r] = shape[r][c];
      }
    }
    if (!checkCollision(rotated, currentPiece.current.x, currentPiece.current.y)) {
      currentPiece.current.shape = rotated;
      audio.playClick();
      drawBoard();
    }
  };

  const handleHardDrop = () => {
    if (status !== 'playing' || !currentPiece.current) return;
    while (!checkCollision(currentPiece.current.shape, currentPiece.current.x, currentPiece.current.y + 1)) {
      currentPiece.current.y++;
    }
    mergePiece();
    spawnPiece();
    drawBoard();
  };

  const handleStartPause = () => {
    if (status === 'idle' || status === 'lost') {
      audio.playClick();
      grid.current = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
      setScore(0);
      setLines(0);
      setStatus('playing');
      nextPieceType.current = getRandomShapeType();
      spawnPiece();
    } else if (status === 'playing') {
      audio.playClick();
      setStatus('paused');
    } else if (status === 'paused') {
      audio.playClick();
      setStatus('playing');
    }
  };

  const handleReset = () => {
    grid.current = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    setScore(0);
    setLines(0);
    setStatus('idle');
    currentPiece.current = null;
  };

  const handleSimulateWin = () => {
    const nextScore = score + 150;
    setScore(nextScore);
    setLines(l => l + 4);
    setStatus('playing');
    audio.playWin();
    onUpdateRecord('tetris', {
      highScore: Math.max(record.highScore, nextScore),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('tetris', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleMove(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleMove(1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleRotate();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          drop();
          break;
        case ' ':
          handleHardDrop();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, score]);

  // Gravity fall interval
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      drop();
    }, 500);
    return () => clearInterval(id);
  }, [status, score]);

  // Rendering engine
  const drawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear board
    ctx.fillStyle = 'var(--bg)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid Lines (brutalist outline style)
    ctx.strokeStyle = 'var(--gray-light)';
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK_SIZE, 0);
      ctx.lineTo(c * BLOCK_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK_SIZE);
      ctx.lineTo(CANVAS_WIDTH, r * BLOCK_SIZE);
      ctx.stroke();
    }

    // Draw settled blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = grid.current[r][c];
        if (val !== 0) {
          drawBlock(ctx, c, r, val);
        }
      }
    }

    // Draw active piece
    if (currentPiece.current) {
      const { shape, x, y, type } = currentPiece.current;
      const colorId = getShapeColorId(type);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] !== 0) {
            drawBlock(ctx, x + c, y + r, colorId);
          }
        }
      }
    }
  };

  const drawPreview = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'var(--bg)';
    ctx.fillRect(0, 0, 80, 80);

    const type = nextPieceType.current;
    const shape = SHAPES[type];
    const colorId = getShapeColorId(type);

    const offsetX = (80 - shape[0].length * BLOCK_SIZE) / 2;
    const offsetY = (80 - shape.length * BLOCK_SIZE) / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          ctx.fillStyle = getBlockPattern(colorId);
          ctx.fillRect(offsetX + c * BLOCK_SIZE, offsetY + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          ctx.strokeStyle = 'var(--border)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(offsetX + c * BLOCK_SIZE, offsetY + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }
  };

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, colorId: number) => {
    ctx.fillStyle = getBlockPattern(colorId);
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'var(--border)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  };

  const getBlockPattern = (id: number): string => {
    const patterns = [
      'var(--bg)', // empty
      'var(--fg)', // 1
      'var(--gray-dark)', // 2
      'var(--gray-mid)', // 3
      'var(--gray-light)', // 4
      '#777777', // 5
      '#444444', // 6
      '#aaaaaa', // 7
    ];
    return patterns[id] || 'var(--fg)';
  };

  // Render board on mount or state change
  useEffect(() => {
    drawBoard();
    drawPreview();
  }, [status, score]);

  return (
    <div data-testid="game-tetris" style={{ width: '100%' }}>
      <GameWrapper
        title="Tetris"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="HIGH SCORE"
      >
        <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Main Grid + Sidebar Container */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', width: '100%' }}>
            
            {/* Matrix Viewport */}
            <div
              style={{
                border: '4px solid var(--border)',
                backgroundColor: 'var(--bg)',
                position: 'relative',
                width: `${CANVAS_WIDTH + 8}px`,
                height: `${CANVAS_HEIGHT + 8}px`,
                padding: '2px',
              }}
            >
              <canvas
                ref={canvasRef}
                data-testid="tetris-canvas"
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
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#ffffff',
                    textAlign: 'center',
                    padding: '10px',
                    zIndex: 10,
                  }}
                >
                  {status === 'idle' && (
                    <>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>TETRIS MATRIX</h3>
                      <button
                        data-testid="tetris-start-btn"
                        onClick={handleStartPause}
                        className="brutalist-button"
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          border: '2px solid #ffffff',
                          boxShadow: 'none',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                        }}
                      >
                        PLAY GAME
                      </button>
                    </>
                  )}
                  {status === 'paused' && (
                    <>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>PAUSED</h3>
                      <button
                        onClick={handleStartPause}
                        className="brutalist-button"
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          border: '2px solid #ffffff',
                          boxShadow: 'none',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                        }}
                      >
                        RESUME
                      </button>
                    </>
                  )}
                  {status === 'lost' && (
                    <>
                      <h3 style={{ fontSize: '1.2rem', color: '#ff3333', marginBottom: '8px' }}>LOST MATRIX</h3>
                      <p style={{ fontSize: '0.7rem', marginBottom: '12px' }}>SCORE: {score}</p>
                      <button onClick={handleStartPause} className="brutalist-button" style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                        RESTART
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Stats and Controls */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Next Piece Panel */}
              <div style={{ border: '2px solid var(--border)', padding: '6px', backgroundColor: 'var(--gray-light)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--gray-dark)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>NEXT PIECE</span>
                <div
                  data-testid="tetris-next-piece"
                  style={{
                    width: '80px',
                    height: '80px',
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    margin: '0 auto',
                  }}
                >
                  <canvas ref={previewCanvasRef} width={80} height={80} style={{ display: 'block' }} />
                </div>
              </div>

              {/* Score Cabinet */}
              <div style={{ border: '2px solid var(--border)', padding: '8px', backgroundColor: 'var(--gray-light)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--gray-dark)', fontWeight: 'bold', display: 'block' }}>SCORE</span>
                <span data-testid="tetris-score" style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{score}</span>
              </div>

              {/* Lines Cabinet */}
              <div style={{ border: '2px solid var(--border)', padding: '8px', backgroundColor: 'var(--gray-light)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--gray-dark)', fontWeight: 'bold', display: 'block' }}>LINES CLEAR</span>
                <span data-testid="tetris-lines" style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{lines}</span>
              </div>

              {/* Status Indicator */}
              <div style={{ border: '2px solid var(--border)', padding: '8px', backgroundColor: 'var(--gray-light)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--gray-dark)', fontWeight: 'bold', display: 'block' }}>STATUS</span>
                <span data-testid="tetris-status-text" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{status.toUpperCase()}</span>
              </div>

              {/* Control Action Button */}
              {status === 'playing' && (
                <button
                  onClick={handleStartPause}
                  className="brutalist-button"
                  style={{ padding: '6px', fontSize: '0.7rem', width: '100%', boxShadow: 'none' }}
                >
                  PAUSE
                </button>
              )}
            </div>
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

export default Tetris;
