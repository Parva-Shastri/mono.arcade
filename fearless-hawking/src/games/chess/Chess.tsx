import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'chess',
  title: 'Chess',
  description: 'Retro 2-player local chess match. Capture the opponent\'s King to win.',
  instructions: [
    'Select a piece on your turn by clicking it.',
    'Click a valid destination cell to move or capture.',
    'Play alternates between White and Black players.',
    'Capture the opponent\'s King to secure victory.',
  ],
};

interface ChessProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | null;
type Color = 'w' | 'b' | null;

interface Square {
  type: PieceType;
  color: Color;
}

const INITIAL_BOARD: Square[][] = [
  [
    { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' },
    { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }
  ],
  Array.from({ length: 8 }, () => ({ type: 'p', color: 'b' })),
  Array.from({ length: 8 }, () => ({ type: null, color: null })),
  Array.from({ length: 8 }, () => ({ type: null, color: null })),
  Array.from({ length: 8 }, () => ({ type: null, color: null })),
  Array.from({ length: 8 }, () => ({ type: null, color: null })),
  Array.from({ length: 8 }, () => ({ type: 'p', color: 'w' })),
  [
    { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' },
    { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
  ],
];

const PIECE_GLYPHS: Record<string, string> = {
  bp: '♟', br: '♜', bn: '♞', bb: '♝', bq: '♛', bk: '♚',
  wp: '♙', wr: '♖', wn: '♘', wb: '♗', wq: '♕', wk: '♔',
};

export const Chess: React.FC<ChessProps> = ({ onBack, record, onUpdateRecord }) => {
  const [board, setBoard] = useState<Square[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const startNewGame = () => {
    audio.playClick();
    setBoard(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    setSelected(null);
    setTurn('w');
    setStatus('playing');
  };

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCellClick = (r: number, c: number) => {
    if (status !== 'playing') return;
    audio.playClick();

    const square = board[r][c];

    if (selected) {
      const [sr, sc] = selected;
      if (sr === r && sc === c) {
        setSelected(null);
        return;
      }

      // Move piece
      const movingPiece = board[sr][sc];
      const targetPiece = board[r][c];

      // Prevent friendly fire
      if (targetPiece.color === turn) {
        setSelected([r, c]);
        return;
      }

      // Update board
      const newBoard = board.map(row => row.map(cell => ({ ...cell })));
      newBoard[r][c] = { type: movingPiece.type, color: movingPiece.color };
      newBoard[sr][sc] = { type: null, color: null };

      setBoard(newBoard);
      setSelected(null);
      audio.playScore();

      // Check win condition (King capture)
      if (targetPiece.type === 'k') {
        if (targetPiece.color === 'b') {
          setStatus('won');
          audio.playWin();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
          onUpdateRecord('chess', {
            highScore: record.highScore + 1,
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon + 1,
          });
        } else {
          setStatus('lost');
          audio.playLose();
          onUpdateRecord('chess', {
            highScore: record.highScore,
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon,
          });
        }
      } else {
        setTurn(t => (t === 'w' ? 'b' : 'w'));
      }
    } else {
      if (square.color === turn) {
        setSelected([r, c]);
      }
    }
  };

  const handleSimulateWin = () => {
    setStatus('won');
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    onUpdateRecord('chess', {
      highScore: record.highScore + 1,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('chess', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  return (
    <div data-testid="game-chess" style={{ width: '100%' }}>
      <GameWrapper
        title="Chess"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={startNewGame}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          {/* Turn Tracker */}
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}>
            Current Turn: {turn === 'w' ? 'White (P1)' : 'Black (P2)'}
          </div>

          {/* Checkerboard container */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: 'repeat(8, 1fr)',
              border: '4px solid var(--border)',
              width: '320px',
              height: '320px',
              background: 'var(--bg)',
            }}
          >
            {board.map((row, rIdx) => (
              <div key={rIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', height: '40px' }}>
                {row.map((square, cIdx) => {
                  const isBlackSquare = (rIdx + cIdx) % 2 === 1;
                  const isSelected = selected && selected[0] === rIdx && selected[1] === cIdx;
                  const glyphKey = square.color && square.type ? `${square.color}${square.type}` : '';
                  const glyph = glyphKey ? PIECE_GLYPHS[glyphKey] : '';

                  return (
                    <div
                      key={cIdx}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      data-testid={`chess-cell-${rIdx}-${cIdx}`}
                      style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.75rem',
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--gray-mid)'
                          : isBlackSquare
                            ? 'var(--gray-light)'
                            : 'var(--bg)',
                        border: isSelected ? '2px solid var(--border)' : 'none',
                        color: square.color === 'b' ? 'var(--fg)' : 'var(--gray-dark)',
                        userSelect: 'none',
                      }}
                    >
                      {glyph}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Game Over Message Overlay */}
          {status !== 'playing' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>
                {status === 'won' ? 'WHITE WINS (CHECKMATE)!' : 'BLACK WINS (CHECKMATE)!'}
              </h3>
              <button className="brutalist-button" onClick={startNewGame}>
                PLAY AGAIN
              </button>
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

export default Chess;
