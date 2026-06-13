import React, { useState, useEffect, useCallback } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'sudoku',
  title: 'Sudoku',
  description: 'Fill the 9x9 grid so that each row, column, and 3x3 section contains numbers 1-9.',
  instructions: [
    'Select a cell on the grid (use mouse or keyboard arrow keys).',
    'Click a number key (1-9) below or type it on your keyboard.',
    'Clear a cell with the ERASE button, Backspace, or 0.',
    'Careful! 3 incorrect entries will trigger game over.',
  ],
};

interface SudokuProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const SEED_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

const generateScrambledSudoku = () => {
  let board = SEED_SOLUTION.map(row => [...row]);

  // 1. Map digits
  const digitMap = new Map<number, number>();
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffledDigits = [...digits].sort(() => Math.random() - 0.5);
  digits.forEach((d, idx) => digitMap.set(d, shuffledDigits[idx]));
  board = board.map(row => row.map(cell => digitMap.get(cell)!));

  // 2. Shuffle row/col bands
  const shuffleBands = (arr: number[][], isCol = false) => {
    const bandIndices = [0, 1, 2].sort(() => Math.random() - 0.5);
    const newGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
    
    for (let b = 0; b < 3; b++) {
      const targetBand = bandIndices[b];
      const innerIndices = [0, 1, 2].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 3; i++) {
        const sourceIdx = targetBand * 3 + innerIndices[i];
        const destIdx = b * 3 + i;
        for (let j = 0; j < 9; j++) {
          if (isCol) {
            newGrid[j][destIdx] = arr[j][sourceIdx];
          } else {
            newGrid[destIdx][j] = arr[sourceIdx][j];
          }
        }
      }
    }
    return newGrid;
  };

  board = shuffleBands(board, false); // row scramble
  board = shuffleBands(board, true);  // col scramble

  // 3. Keep 35 cells as clues
  const cluesCount = 35;
  const puzzle = board.map(row => row.map(() => 0));
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push({ r, c });
    }
  }
  cells.sort(() => Math.random() - 0.5);
  for (let i = 0; i < cluesCount; i++) {
    const { r, c } = cells[i];
    puzzle[r][c] = board[r][c];
  }

  return { puzzle, solution: board };
};

const checkWinCondition = (currentGrid: number[][], sol: number[][]) => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentGrid[r][c] !== sol[r][c]) {
        return false;
      }
    }
  }
  return true;
};

export const Sudoku: React.FC<SudokuProps> = ({ onBack, record, onUpdateRecord }) => {
  const [initData, setInitData] = useState(() => generateScrambledSudoku());
  const [grid, setGrid] = useState<number[][]>(initData.puzzle);
  const [initialGrid, setInitialGrid] = useState<number[][]>(initData.puzzle);
  const [solution, setSolution] = useState<number[][]>(initData.solution);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  const handleReset = () => {
    const data = generateScrambledSudoku();
    setInitData(data);
    setGrid(data.puzzle);
    setInitialGrid(data.puzzle);
    setSolution(data.solution);
    setMistakes(0);
    setStatus('playing');
    setSelectedCell(null);
  };

  const enterNumber = useCallback((num: number) => {
    if (status !== 'playing' || !selectedCell) return;
    const { r, c } = selectedCell;

    // Cannot modify given clues
    if (initialGrid[r][c] !== 0) return;

    audio.playClick();

    const nextGrid = grid.map(row => [...row]);
    
    if (num === 0) {
      nextGrid[r][c] = 0;
      setGrid(nextGrid);
      return;
    }

    const correctVal = solution[r][c];
    nextGrid[r][c] = num;

    if (num !== correctVal) {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      if (nextMistakes >= 3) {
        setStatus('lost');
        audio.playLose();
        onUpdateRecord('sudoku', {
          highScore: record.highScore,
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      }
    } else {
      audio.playScore();
    }

    setGrid(nextGrid);

    if (num === correctVal && checkWinCondition(nextGrid, solution)) {
      setStatus('won');
      audio.playWin();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
      });
      onUpdateRecord('sudoku', {
        highScore: record.highScore + 50,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + 1,
      });
    }
  }, [status, selectedCell, initialGrid, grid, solution, mistakes, record, onUpdateRecord]);

  // Keyboard navigation and digit input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing' || !selectedCell) return;
      let { r, c } = selectedCell;

      if (e.key === 'ArrowUp') {
        r = (r - 1 + 9) % 9;
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        r = (r + 1) % 9;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        c = (c - 1 + 9) % 9;
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        c = (c + 1) % 9;
        e.preventDefault();
      } else if (e.key >= '1' && e.key <= '9') {
        enterNumber(parseInt(e.key));
        return;
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        enterNumber(0);
        return;
      } else {
        return;
      }

      setSelectedCell({ r, c });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, status, enterNumber]);


  const handleSimulateWin = () => {
    setGrid(solution);
    setStatus('won');
    audio.playWin();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
    });
    onUpdateRecord('sudoku', {
      highScore: record.highScore + 50,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setMistakes(3);
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('sudoku', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  // Cell border logic: thick double borders separating 3x3 zones
  const getCellBorders = (r: number, c: number) => {
    const style: React.CSSProperties = {};
    if (c === 2 || c === 5) {
      style.borderRight = '3px double var(--border)';
    } else if (c !== 8) {
      style.borderRight = '1px solid var(--gray-light)';
    }
    if (r === 2 || r === 5) {
      style.borderBottom = '3px double var(--border)';
    } else if (r !== 8) {
      style.borderBottom = '1px solid var(--gray-light)';
    }
    return style;
  };

  return (
    <div data-testid="game-sudoku" style={{ width: '100%' }}>
      <GameWrapper
        title={metadata.title}
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
          {/* Mistakes and strikes */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '2px solid var(--border)',
              padding: '10px 16px',
              backgroundColor: 'var(--gray-light)',
              marginBottom: '16px',
              fontWeight: 'bold',
            }}
          >
            <div data-testid="sudoku-errors">
              MISTAKES: {'❌'.repeat(mistakes) || 'None'} ({mistakes}/3)
            </div>
            <div>
              GRID FOCUS: {selectedCell ? `Row ${selectedCell.r + 1}, Col ${selectedCell.c + 1}` : 'None'}
            </div>
          </div>

          {/* Sudoku Grid */}
          <div
            data-testid="sudoku-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              border: '3px solid var(--border)',
              backgroundColor: 'var(--bg)',
              width: '100%',
              aspectRatio: '1',
              marginBottom: '20px',
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const isGiven = initialGrid[rIdx][cIdx] !== 0;
                const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;
                const isIncorrect = val !== 0 && !isGiven && val !== solution[rIdx][cIdx];
                
                let state: 'given' | 'user-entered' | 'incorrect' | 'empty';
                if (isGiven) state = 'given';
                else if (val === 0) state = 'empty';
                else if (isIncorrect) state = 'incorrect';
                else state = 'user-entered';

                const cellBorders = getCellBorders(rIdx, cIdx);

                // Styling
                let cellBg = 'var(--bg)';
                let cellFg = 'var(--fg)';
                
                if (isSelected) {
                  cellBg = 'var(--fg)';
                  cellFg = 'var(--bg)';
                } else if (isGiven) {
                  cellBg = 'var(--gray-light)';
                  cellFg = 'var(--fg)';
                } else if (isIncorrect) {
                  cellBg = '#ffe6e6';
                  cellFg = '#cc0000';
                }

                const cellStyle: React.CSSProperties = {
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: cellBg,
                  color: cellFg,
                  fontSize: '1.2rem',
                  fontWeight: isGiven ? 'bold' : 'normal',
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                  userSelect: 'none',
                  ...cellBorders,
                };

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    data-testid={`sudoku-cell-${rIdx}-${cIdx}`}
                    data-state={state}
                    data-value={val !== 0 ? val : undefined}
                    onClick={() => {
                      audio.playClick();
                      setSelectedCell({ r: rIdx, c: cIdx });
                    }}
                    style={cellStyle}
                  >
                    {val !== 0 ? val : ''}
                  </button>
                );
              })
            )}
          </div>

          {/* Number Pad and Eraser */}
          <div
            data-testid="sudoku-num-pad"
            style={{
              display: 'flex',
              gap: '6px',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                data-testid={`sudoku-num-${num}`}
                onClick={() => enterNumber(num)}
                className="brutalist-button"
                style={{
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  padding: '0',
                }}
              >
                {num}
              </button>
            ))}
            <button
              data-testid="sudoku-clear-btn"
              onClick={() => enterNumber(0)}
              className="brutalist-button"
              style={{
                height: '34px',
                padding: '0 10px',
                fontWeight: 'bold',
                fontSize: '0.8rem',
              }}
            >
              ERASE
            </button>
          </div>

          <div
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
            }}
          >
            STATUS:{' '}
            <span data-testid="sudoku-status-text">
              {status}
            </span>
          </div>

          {/* Hidden buttons for E2E test runner */}
          <div style={{ display: 'none' }}>
            <button onClick={handleSimulateWin}>Simulate Win</button>
            <button onClick={handleSimulateLoss}>Simulate Loss</button>
          </div>
        </div>
      </GameWrapper>
    </div>
  );
};

export default Sudoku;

