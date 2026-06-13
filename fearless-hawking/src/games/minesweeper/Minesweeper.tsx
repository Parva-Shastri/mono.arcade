import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'minesweeper',
  title: 'Minesweeper',
  description: 'Avoid the hidden mines in this classic logic puzzle.',
  instructions: [
    'Left-click tiles to reveal them.',
    'Right-click tiles to toggle flags on suspected mines.',
    'Numbers show how many mines are adjacent.',
    'Reveal all safe cells to win.',
  ],
};

interface MinesweeperProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: 'minesweeper', record: ScoreRecord) => void;
}

interface Cell {
  row: number;
  col: number;
  hasMine: boolean;
  revealed: boolean;
  flagged: boolean;
  neighborMines: number;
}

const BOARD_SIZE = 10;
const MINE_COUNT = 10;

const initGrid = (): Cell[][] =>
  Array.from({ length: BOARD_SIZE }, (_, r) =>
    Array.from({ length: BOARD_SIZE }, (_, c) => ({
      row: r,
      col: c,
      hasMine: false,
      revealed: false,
      flagged: false,
      neighborMines: 0,
    }))
  );

const createBoard = (startRow: number, startCol: number): Cell[][] => {
  const grid = initGrid();
  let minesPlaced = 0;
  while (minesPlaced < MINE_COUNT) {
    const r = Math.floor(Math.random() * BOARD_SIZE);
    const c = Math.floor(Math.random() * BOARD_SIZE);
    if ((r !== startRow || c !== startCol) && !grid[r][c].hasMine) {
      grid[r][c].hasMine = true;
      minesPlaced++;
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!grid[r][c].hasMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (
              nr >= 0 &&
              nr < BOARD_SIZE &&
              nc >= 0 &&
              nc < BOARD_SIZE &&
              grid[nr][nc].hasMine
            ) {
              count++;
            }
          }
        }
        grid[r][c].neighborMines = count;
      }
    }
  }
  return grid;
};

export const Minesweeper: React.FC<MinesweeperProps> = ({ onBack, record, onUpdateRecord }) => {
  const [grid, setGrid] = useState<Cell[][]>(() => initGrid());
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [firstClickDone, setFirstClickDone] = useState<boolean>(false);
  const [time, setTime] = useState<number>(0);

  useEffect(() => {
    if (status !== 'playing' || !firstClickDone) return;
    const interval = setInterval(() => {
      setTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status, firstClickDone]);

  const handleReset = () => {
    setGrid(initGrid());
    setStatus('playing');
    setFirstClickDone(false);
    setTime(0);
  };

  const checkWin = (currentGrid: Cell[][]): boolean => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = currentGrid[r][c];
        if (!cell.hasMine && !cell.revealed) {
          return false;
        }
      }
    }
    return true;
  };

  const revealCellRecursive = (currentGrid: Cell[][], r: number, c: number): Cell[][] => {
    const nextGrid = currentGrid.map((row) => row.map((cell) => ({ ...cell })));
    const reveal = (row: number, col: number) => {
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
      const cell = nextGrid[row][col];
      if (cell.revealed || cell.flagged) return;

      cell.revealed = true;
      if (cell.neighborMines === 0 && !cell.hasMine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            reveal(row + dr, col + dc);
          }
        }
      }
    };
    reveal(r, c);
    return nextGrid;
  };

  const handleCellClick = (r: number, c: number) => {
    if (status !== 'playing') return;
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) return;

    audio.playClick();
    let currentGrid = grid;
    if (!firstClickDone) {
      currentGrid = createBoard(r, c);
      setFirstClickDone(true);
    }

    if (currentGrid[r][c].hasMine) {
      setGrid(
        currentGrid.map((row) =>
          row.map((cell) => ({
            ...cell,
            revealed: cell.hasMine ? true : cell.revealed,
          }))
        )
      );
      setStatus('lost');
      audio.playLose();
      onUpdateRecord('minesweeper', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
      return;
    }

    const nextGrid = revealCellRecursive(currentGrid, r, c);
    if (checkWin(nextGrid)) {
      setGrid(nextGrid);
      setStatus('won');
      audio.playWin();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
      });
      const score = Math.max(10, 1000 - time);
      onUpdateRecord('minesweeper', {
        highScore: Math.max(record.highScore, score),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + 1,
      });
    } else {
      setGrid(nextGrid);
    }
  };

  const handleCellContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status !== 'playing') return;
    const cell = grid[r][c];
    if (cell.revealed) return;

    audio.playClick();
    setGrid(
      grid.map((row) =>
        row.map((item) =>
          item.row === r && item.col === c ? { ...item, flagged: !item.flagged } : item
        )
      )
    );
  };

  const simulateWin = () => {
    let currentGrid = grid;
    if (!firstClickDone) {
      currentGrid = createBoard(0, 0);
      setFirstClickDone(true);
    }
    setGrid(currentGrid.map((row) => row.map((cell) => ({ ...cell, revealed: !cell.hasMine }))));
    setStatus('won');
    audio.playWin();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
    });
    const score = Math.max(10, 1000 - time);
    onUpdateRecord('minesweeper', {
      highScore: Math.max(record.highScore, score),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const simulateLoss = () => {
    let currentGrid = grid;
    if (!firstClickDone) {
      currentGrid = createBoard(0, 0);
      setFirstClickDone(true);
    }
    setGrid(
      currentGrid.map((row) =>
        row.map((cell) => ({
          ...cell,
          revealed: cell.hasMine ? true : cell.revealed,
        }))
      )
    );
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('minesweeper', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  const flaggedCount = grid.reduce(
    (acc, row) => acc + row.filter((cell) => cell.flagged).length,
    0
  );
  const minesLeft = Math.max(0, MINE_COUNT - flaggedCount);

  let statusFace = '🙂';
  if (status === 'won') statusFace = '😎';
  if (status === 'lost') statusFace = '😵';

  const getNumberStyle = (mines: number): React.CSSProperties => {
    const colors = [
      'transparent',
      '#0033cc',
      '#006600',
      '#cc0000',
      '#000066',
      '#660000',
      '#006666',
      '#000000',
      '#777777',
    ];
    const weights = ['normal', 'bold', 'bold', '800', '800', '900', '900', '900', '900'];
    return {
      color: colors[mines] || 'var(--fg)',
      fontWeight: (weights[mines] || 'bold') as any,
    };
  };

  return (
    <div data-testid="game-minesweeper" style={{ width: '100%' }}>
      <GameWrapper
        title={metadata.title}
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="HIGH SCORE"
      >
        <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '2px solid var(--border)',
              padding: '10px 16px',
              backgroundColor: 'var(--gray-light)',
              marginBottom: '16px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  display: 'block',
                  color: 'var(--gray-dark)',
                }}
              >
                MINES
              </span>
              <span
                data-testid="minesweeper-mine-count"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {minesLeft}
              </span>
            </div>

            <button
              data-testid="minesweeper-status-face"
              onClick={handleReset}
              style={{
                fontSize: '1.6rem',
                cursor: 'pointer',
                background: 'var(--bg)',
                border: '2px solid var(--border)',
                borderRadius: '4px',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0 var(--border)',
              }}
              className="brutalist-button"
            >
              {statusFace}
            </button>

            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  display: 'block',
                  color: 'var(--gray-dark)',
                }}
              >
                TIME
              </span>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {String(time).padStart(3, '0')}
              </span>
            </div>
          </div>

          <div
            data-testid="minesweeper-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
              gap: '2px',
              border: '3px solid var(--border)',
              backgroundColor: 'var(--border)',
              width: '100%',
              aspectRatio: '1',
              marginBottom: '16px',
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const cellTestId = `minesweeper-cell-${rIdx}-${cIdx}`;
                let cellState = 'hidden';
                if (cell.revealed) {
                  cellState = 'revealed';
                } else if (cell.flagged) {
                  cellState = 'flagged';
                }

                let content = '';
                if (cell.revealed) {
                  if (cell.hasMine) {
                    content = '💣';
                  } else if (cell.neighborMines > 0) {
                    content = String(cell.neighborMines);
                  }
                } else if (cell.flagged) {
                  content = '⚑';
                }

                let style: React.CSSProperties = {
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: status === 'playing' && !cell.revealed ? 'pointer' : 'default',
                  outline: 'none',
                  userSelect: 'none',
                };

                if (cell.revealed) {
                  style = {
                    ...style,
                    backgroundColor: cell.hasMine ? '#ff4d4d' : 'var(--bg)',
                    ...getNumberStyle(cell.neighborMines),
                  };
                } else if (cell.flagged) {
                  style = {
                    ...style,
                    background: 'repeating-linear-gradient(45deg, #e0e0e0, #e0e0e0 4px, #bdbdbd 4px, #bdbdbd 8px)',
                    color: '#cc0000',
                    fontWeight: 'bold',
                  };
                } else {
                  style = {
                    ...style,
                    backgroundColor: 'var(--gray-light)',
                    boxShadow: 'inset 2px 2px 0px #ffffff, inset -2px -2px 0px #888888',
                  };
                }

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    data-testid={cellTestId}
                    data-state={cellState}
                    data-mines={cell.revealed && !cell.hasMine ? cell.neighborMines : undefined}
                    data-has-mine={cell.revealed && cell.hasMine ? 'true' : undefined}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    onContextMenu={(e) => handleCellContextMenu(e, rIdx, cIdx)}
                    style={style}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>

          <div
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              color: status === 'won' ? '#006600' : status === 'lost' ? '#cc0000' : 'var(--fg)',
            }}
          >
            STATUS:{' '}
            <span data-testid="minesweeper-status-text">
              {status}
            </span>
          </div>

          <div style={{ display: 'none' }}>
            <button onClick={simulateWin}>Simulate Win</button>
            <button onClick={simulateLoss}>Simulate Loss</button>
          </div>
        </div>
      </GameWrapper>
    </div>
  );
};

export default Minesweeper;
