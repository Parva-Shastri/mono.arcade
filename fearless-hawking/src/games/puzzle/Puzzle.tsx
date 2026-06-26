import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'puzzle',
  title: 'Puzzle',
  description: 'Solve the sliding tile puzzle to reveal the hidden picture.',
  instructions: [
    'Click or tap on tiles adjacent to the empty slot to slide them.',
    'Arrange all the tiles in correct sequential order.',
    'Complete the puzzle to win!',
  ],
};

interface PuzzleProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const SOLVED_BOARD = [1, 2, 3, 4, 5, 6, 7, 8, 0];

// Generate a solvable board outside of the component to keep the component pure
function generateShuffledBoard(): number[] {
  const currentBoard = [...SOLVED_BOARD];
  let emptyIdx = 8;

  for (let step = 0; step < 40; step++) {
    const row = Math.floor(emptyIdx / 3);
    const col = emptyIdx % 3;
    const validIndices: number[] = [];

    if (row > 0) validIndices.push(emptyIdx - 3);
    if (row < 2) validIndices.push(emptyIdx + 3);
    if (col > 0) validIndices.push(emptyIdx - 1);
    if (col < 2) validIndices.push(emptyIdx + 1);

    const randomTarget = validIndices[Math.floor(Math.random() * validIndices.length)];
    // Swap
    const temp = currentBoard[emptyIdx];
    currentBoard[emptyIdx] = currentBoard[randomTarget];
    currentBoard[randomTarget] = temp;
    emptyIdx = randomTarget;
  }

  // In case shuffling accidentally lands on solved, shuffle again
  let isSolved = true;
  for (let i = 0; i < 9; i++) {
    if (currentBoard[i] !== SOLVED_BOARD[i]) {
      isSolved = false;
      break;
    }
  }
  if (isSolved) {
    return generateShuffledBoard();
  }

  return currentBoard;
}

export const Puzzle: React.FC<PuzzleProps> = ({ onBack, record, onUpdateRecord }) => {
  const [board, setBoard] = useState<number[]>(SOLVED_BOARD);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const shuffleBoard = () => {
    setBoard(generateShuffledBoard());
    setMoves(0);
    setStatus('playing');
  };

  useEffect(() => {
    shuffleBoard();
  }, []);

  const handleTileClick = (index: number) => {
    if (status !== 'playing') return;

    const tileVal = board[index];
    if (tileVal === 0) return; // clicked empty

    // Find empty slot (0)
    const emptyIdx = board.indexOf(0);

    const tileRow = Math.floor(index / 3);
    const tileCol = index % 3;
    const emptyRow = Math.floor(emptyIdx / 3);
    const emptyCol = emptyIdx % 3;

    const isAdjacent =
      (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) ||
      (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow);

    if (isAdjacent) {
      const nextBoard = [...board];
      nextBoard[emptyIdx] = tileVal;
      nextBoard[index] = 0;
      setBoard(nextBoard);

      const nextMoves = moves + 1;
      setMoves(nextMoves);
      audio.playClick();

      // Check solved
      let solved = true;
      for (let i = 0; i < 9; i++) {
        if (nextBoard[i] !== SOLVED_BOARD[i]) {
          solved = false;
          break;
        }
      }

      if (solved) {
        setStatus('won');
        audio.playWin();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
        const scoreValue = Math.max(1000 - nextMoves * 10, 100);
        onUpdateRecord('puzzle', {
          highScore: Math.max(record.highScore, scoreValue),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
      }
    }
  };

  const handleSimulateWin = () => {
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    setStatus('won');
    setBoard(SOLVED_BOARD);
    setMoves(5);
    onUpdateRecord('puzzle', {
      highScore: Math.max(record.highScore, 950),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    audio.playLose();
    setStatus('lost');
    onUpdateRecord('puzzle', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  const handleReset = () => {
    audio.playClick();
    shuffleBoard();
  };

  return (
    <div data-testid="game-puzzle" style={{ width: '100%' }}>
      <GameWrapper
        title="Puzzle"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span>State: {moves}</span>
            <span>STATUS: {status.toUpperCase()}</span>
          </div>

          {/* Grid layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              width: '240px',
              height: '240px',
              padding: '8px',
              border: '4px solid var(--border)',
              backgroundColor: 'var(--gray-light)',
            }}
          >
            {board.map((tile, idx) => {
              const isEmpty = tile === 0;
              return (
                <button
                  key={idx}
                  onClick={() => handleTileClick(idx)}
                  disabled={status !== 'playing' || isEmpty}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: isEmpty ? 'transparent' : 'var(--bg)',
                    color: 'var(--fg)',
                    border: isEmpty ? 'none' : '3px solid var(--border)',
                    cursor: isEmpty || status !== 'playing' ? 'default' : 'pointer',
                    boxShadow: isEmpty ? 'none' : '2px 2px 0 var(--border)',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {!isEmpty ? tile : ''}
                </button>
              );
            })}
          </div>

          {status === 'won' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>CONGRATULATIONS! PUZZLE SOLVED.</p>
              <button className="brutalist-button" onClick={shuffleBoard}>PLAY AGAIN</button>
            </div>
          )}

          {status === 'lost' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>YOU GAVE UP! TRY AGAIN.</p>
              <button className="brutalist-button" onClick={shuffleBoard}>TRY AGAIN</button>
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

export default Puzzle;
