import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'maze',
  title: 'Maze',
  description: 'Navigate through a grid to find the exit.',
  instructions: [
    'Use arrow keys to move your character.',
    'Avoid walls and obstacles.',
    'Reach the destination point to solve the maze.',
  ],
};

interface MazeProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const GRID_SIZE = 15;
const CANVAS_SIZE = 300;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

export const Maze: React.FC<MazeProps> = ({ onBack, record, onUpdateRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [level, setLevel] = useState<number>(1);
  const [steps, setSteps] = useState<number>(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  // Player position & Maze structure
  const [playerPosition, setPlayerPosition] = useState<{ r: number; c: number }>({ r: 1, c: 1 });
  const [grid, setGrid] = useState<number[][]>(() => generateMaze());

  // Generate Maze using Recursive Backtracking (DFS)
  function generateMaze(): number[][] {
    // 0 = path, 1 = wall
    const maze = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(1));

    const stack: [number, number][] = [];
    const startR = 1;
    const startC = 1;
    maze[startR][startC] = 0;
    stack.push([startR, startC]);

    while (stack.length > 0) {
      const [r, c] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = []; // [nr, nc, wallR, wallC]

      // Directions: Up, Down, Left, Right (2 steps)
      const dirs = [
        [-2, 0, -1, 0],
        [2, 0, 1, 0],
        [0, -2, 0, -1],
        [0, 2, 0, 1]
      ];

      for (const [dr, dc, wr, wc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr > 0 && nr < GRID_SIZE - 1 && nc > 0 && nc < GRID_SIZE - 1 && maze[nr][nc] === 1) {
          neighbors.push([nr, nc, r + wr, c + wc]);
        }
      }

      if (neighbors.length > 0) {
        // Pick random neighbor
        const [nr, nc, wr, wc] = neighbors[Math.floor(Math.random() * neighbors.length)];
        maze[wr][wc] = 0;
        maze[nr][nc] = 0;
        stack.push([nr, nc]);
      } else {
        stack.pop();
      }
    }

    // Ensure entrance & exit are open
    maze[1][1] = 0;
    maze[GRID_SIZE - 2][GRID_SIZE - 2] = 0;

    return maze;
  }

  const handleMove = (dr: number, dc: number) => {
    if (status !== 'playing') return;
    const nextR = playerPosition.r + dr;
    const nextC = playerPosition.c + dc;

    if (nextR >= 0 && nextR < GRID_SIZE && nextC >= 0 && nextC < GRID_SIZE && grid[nextR][nextC] === 0) {
      audio.playClick();
      setPlayerPosition({ r: nextR, c: nextC });
      setSteps(s => s + 1);

      // Check win condition (exit at bottom-right path cell)
      if (nextR === GRID_SIZE - 2 && nextC === GRID_SIZE - 2) {
        setStatus('won');
        audio.playWin();
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.75 },
        });
        const scoreVal = level * 100 - steps;
        onUpdateRecord('maze', {
          highScore: Math.max(record.highScore, scoreVal),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
      }
    }
  };

  const handleReset = () => {
    const newGrid = generateMaze();
    setGrid(newGrid);
    setPlayerPosition({ r: 1, c: 1 });
    setLevel(1);
    setSteps(0);
    setStatus('playing');
  };

  const nextLevel = () => {
    const newGrid = generateMaze();
    setGrid(newGrid);
    setPlayerPosition({ r: 1, c: 1 });
    setLevel(l => l + 1);
    setStatus('playing');
  };

  const handleSimulateWin = () => {
    setPlayerPosition({ r: GRID_SIZE - 2, c: GRID_SIZE - 2 });
    setStatus('won');
    audio.playWin();
    onUpdateRecord('maze', {
      highScore: Math.max(record.highScore, level * 100),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('maze', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleMove(-1, 0);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleMove(1, 0);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleMove(0, -1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleMove(0, 1);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPosition, status, grid, level, steps]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const computed = window.getComputedStyle(canvas);
    const bg = computed.getPropertyValue('--bg').trim() || '#000000';
    const fg = computed.getPropertyValue('--fg').trim() || '#ffffff';
    const border = computed.getPropertyValue('--border').trim() || '#ffffff';
    const grayMid = computed.getPropertyValue('--gray-mid').trim() || '#666666';

    // Draw background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Maze walls & paths
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 1) {
          ctx.fillStyle = fg;
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = border;
          ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw Exit point (hatched pattern or custom block)
    ctx.fillStyle = grayMid;
    ctx.fillRect((GRID_SIZE - 2) * CELL_SIZE + 2, (GRID_SIZE - 2) * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.strokeStyle = border;
    ctx.strokeRect((GRID_SIZE - 2) * CELL_SIZE + 2, (GRID_SIZE - 2) * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    // Draw Player
    ctx.fillStyle = bg;
    ctx.fillRect(playerPosition.c * CELL_SIZE + 2, playerPosition.r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = border;
    ctx.strokeRect(playerPosition.c * CELL_SIZE + 2, playerPosition.r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }, [grid, playerPosition]);

  return (
    <div data-testid="game-maze" style={{ width: '100%' }}>
      <GameWrapper
        title={metadata.title}
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="HIGH SCORE"
      >
        <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
          {/* Status Panel */}
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
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>LEVEL</span>
              <span data-testid="maze-level">{level}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STEPS</span>
              <span data-testid="maze-steps">{steps}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span data-testid="maze-status-text">{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Canvas Board */}
          <div
            style={{
              border: '4px solid var(--border)',
              backgroundColor: 'var(--bg)',
              position: 'relative',
              width: `${CANVAS_SIZE}px`,
              height: `${CANVAS_SIZE}px`,
              margin: '0 auto 12px auto',
            }}
          >
            <canvas
              ref={canvasRef}
              data-testid="maze-canvas"
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ display: 'block' }}
            />

            {status === 'won' && (
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
                  zIndex: 10,
                }}
              >
                <h3 style={{ fontSize: '1.4rem', color: '#66ff66', marginBottom: '8px' }}>LEVEL CLEAR!</h3>
                <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>YOU ESCAPED THE MAZE IN {steps} STEPS.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={nextLevel} className="brutalist-button" style={{ backgroundColor: '#ffffff', color: '#000000', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                    NEXT LEVEL
                  </button>
                  <button onClick={handleReset} className="brutalist-button" style={{ backgroundColor: 'transparent', color: '#ffffff', border: '2px solid #ffffff', boxShadow: 'none', padding: '6px 12px', fontSize: '0.75rem' }}>
                    RESTART
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden position tracking for E2E tests */}
          <div
            data-testid="maze-position"
            data-pos={`${playerPosition.r}-${playerPosition.c}`}
            style={{ display: 'none' }}
          />

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

export default Maze;
