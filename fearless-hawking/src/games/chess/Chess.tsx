import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'chess',
  title: 'Chess (Mini)',
  description: 'Play a game of chess against a random AI opponent.',
  instructions: [
    'Click a piece of your color (White, uppercase or outlined) to select it.',
    'Available moves will be highlighted. Click a highlighted square to move.',
    'Capture the black King to win the match.',
  ],
};

interface ChessProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

type Piece = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | 'P' | 'R' | 'N' | 'B' | 'Q' | 'K' | null;
type Board = Piece[][];

const INITIAL_BOARD: Board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

const PIECE_SYMBOLS: Record<string, string> = {
  r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟',
  R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔', P: '♙'
};

export const Chess: React.FC<ChessProps> = ({ onBack, record, onUpdateRecord }) => {
  const [board, setBoard] = useState<Board>(JSON.parse(JSON.stringify(INITIAL_BOARD)));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [captures, setCaptures] = useState(0);

  const initGame = () => {
    audio.playClick();
    setBoard(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    setSelected(null);
    setTurn('player');
    setStatus('playing');
    setCaptures(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleReset = () => {
    initGame();
  };

  const handleSimulateWin = () => {
    // Win by capturing AI king
    setStatus('won');
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    onUpdateRecord('chess', {
      highScore: Math.max(record.highScore, captures + 1),
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

  const isWhite = (piece: Piece) => {
    if (!piece) return false;
    return piece === piece.toUpperCase();
  };

  const isBlack = (piece: Piece) => {
    if (!piece) return false;
    return piece === piece.toLowerCase();
  };

  // Basic Chess validation
  const getMoves = (r: number, c: number, currentBoard: Board): [number, number][] => {
    const piece = currentBoard[r][c];
    if (!piece) return [];
    const moves: [number, number][] = [];
    const color = isWhite(piece) ? 'white' : 'black';

    const addMove = (nr: number, nc: number) => {
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return false;
      const target = currentBoard[nr][nc];
      if (!target) {
        moves.push([nr, nc]);
        return true;
      }
      if (color === 'white' && isBlack(target)) {
        moves.push([nr, nc]);
      } else if (color === 'black' && isWhite(target)) {
        moves.push([nr, nc]);
      }
      return false; // blocked
    };

    const type = piece.toLowerCase();
    if (type === 'p') {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;

      // Single step forward
      if (r + dir >= 0 && r + dir <= 7 && !currentBoard[r + dir][c]) {
        moves.push([r + dir, c]);
        // Double step
        if (r === startRow && !currentBoard[r + 2 * dir][c]) {
          moves.push([r + 2 * dir, c]);
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
          const target = currentBoard[nr][nc];
          if (target && (color === 'white' ? isBlack(target) : isWhite(target))) {
            moves.push([nr, nc]);
          }
        }
      }
    } else if (type === 'n') {
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (type === 'r' || type === 'q') {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      dirs.forEach(([dr, dc]) => {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
          const target = currentBoard[nr][nc];
          if (!target) {
            moves.push([nr, nc]);
          } else {
            if (color === 'white' && isBlack(target)) moves.push([nr, nc]);
            if (color === 'black' && isWhite(target)) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      });
    }

    if (type === 'b' || type === 'q') {
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      dirs.forEach(([dr, dc]) => {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
          const target = currentBoard[nr][nc];
          if (!target) {
            moves.push([nr, nc]);
          } else {
            if (color === 'white' && isBlack(target)) moves.push([nr, nc]);
            if (color === 'black' && isWhite(target)) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      });
    } else if (type === 'k') {
      const dirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      dirs.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    }

    return moves;
  };

  const selectSquare = (r: number, c: number) => {
    if (status !== 'playing' || turn !== 'player') return;

    const piece = board[r][c];

    if (selected) {
      const [sr, sc] = selected;
      const validMoves = getMoves(sr, sc, board);
      const isMoveValid = validMoves.some(([vr, vc]) => vr === r && vc === c);

      if (isMoveValid) {
        const targetPiece = board[r][c];
        const updatedBoard = board.map(row => [...row]);
        updatedBoard[r][c] = board[sr][sc];
        updatedBoard[sr][sc] = null;

        audio.playMerge();
        let currentCaptures = captures;
        if (targetPiece) {
          audio.playScore();
          currentCaptures += 1;
          setCaptures(currentCaptures);
        }

        setBoard(updatedBoard);
        setSelected(null);

        // Win check
        if (targetPiece === 'k') {
          setStatus('won');
          audio.playWin();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
          onUpdateRecord('chess', {
            highScore: Math.max(record.highScore, currentCaptures),
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon + 1,
          });
          return;
        }

        // AI Turn
        setTurn('ai');
        return;
      }
    }

    // Select White Piece
    if (piece && isWhite(piece)) {
      audio.playClick();
      setSelected([r, c]);
    } else {
      setSelected(null);
    }
  };

  // AI execution
  useEffect(() => {
    if (turn !== 'ai' || status !== 'playing') return;

    const timer = setTimeout(() => {
      // Find all AI moves
      const aiMoves: { from: [number, number]; to: [number, number] }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (isBlack(board[r][c])) {
            const moves = getMoves(r, c, board);
            moves.forEach(to => aiMoves.push({ from: [r, c], to }));
          }
        }
      }

      if (aiMoves.length === 0) {
        // AI has no moves, player wins or draw. We treat as player wins.
        setStatus('won');
        audio.playWin();
        onUpdateRecord('chess', {
          highScore: Math.max(record.highScore, captures),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
        return;
      }

      // Select random move
      const choice = aiMoves[Math.floor(Math.random() * aiMoves.length)];
      const [fr, fc] = choice.from;
      const [tr, tc] = choice.to;
      const targetPiece = board[tr][tc];

      const updatedBoard = board.map(row => [...row]);
      updatedBoard[tr][tc] = board[fr][fc];
      updatedBoard[fr][fc] = null;

      audio.playMerge();
      if (targetPiece) {
        audio.playClick();
      }

      setBoard(updatedBoard);
      setTurn('player');

      // Player Loss check
      if (targetPiece === 'K') {
        setStatus('lost');
        audio.playLose();
        onUpdateRecord('chess', {
          highScore: record.highScore,
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [turn, board, status, captures]);

  const selectedMoves = selected ? getMoves(selected[0], selected[1], board) : [];

  return (
    <div data-testid="game-chess" id="chess-board" style={{ width: '100%' }}>
      <GameWrapper
        title="Chess (Mini)"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="PIECES CAPTURED"
      >
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', fontFamily: 'var(--font-mono)' }}>
          
          {/* Dashboard info */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '2px solid var(--border)',
              padding: '8px 16px',
              backgroundColor: 'var(--gray-light)',
              marginBottom: '16px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
            }}
          >
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>CAPTURED</span>
              <span data-testid="chess-captures">{captures}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>TURN</span>
              <span>{turn === 'player' ? 'YOURS (WHITE)' : 'AI (BLACK)'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span>{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Chessboard grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              border: '4px solid var(--border)',
              backgroundColor: 'var(--bg)',
              margin: '0 auto 12px auto',
              aspectRatio: '1',
            }}
          >
            {board.map((row, rIdx) =>
              row.map((piece, cIdx) => {
                const isSelected = selected && selected[0] === rIdx && selected[1] === cIdx;
                const isHighlight = selectedMoves.some(([mr, mc]) => mr === rIdx && mc === cIdx);
                const isSquareDark = (rIdx + cIdx) % 2 === 1;

                // Monochrome palette
                const squareBg = isSelected
                  ? 'var(--fg)' // invert for selection
                  : isHighlight
                  ? 'var(--gray-light)'
                  : isSquareDark
                  ? 'var(--gray-medium)'
                  : 'var(--bg)';

                const textColor = isSelected
                  ? 'var(--bg)'
                  : isWhite(piece)
                  ? 'var(--fg)'
                  : 'var(--fg)'; // outlines handle differences or standard dark color

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => selectSquare(rIdx, cIdx)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                      fontWeight: 'bold',
                      backgroundColor: squareBg,
                      color: textColor,
                      cursor: status === 'playing' && turn === 'player' ? 'pointer' : 'default',
                      border: isHighlight ? '2px dashed var(--border)' : 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {piece ? PIECE_SYMBOLS[piece] : ''}
                  </div>
                );
              })
            )}
          </div>

          {/* Status Message Display */}
          {status !== 'playing' && (
            <div
              style={{
                border: '2px solid var(--border)',
                backgroundColor: 'var(--gray-light)',
                padding: '12px',
                textAlign: 'center',
                marginBottom: '16px',
                fontWeight: 'bold',
              }}
            >
              {status === 'won' ? 'VICTORY! YOU HAVE CAPTURED THE ENEMY KING.' : 'DEFEAT! THE ENEMY HAS CAPTURED YOUR KING.'}
              <button
                onClick={handleReset}
                className="brutalist-button"
                style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.8rem' }}
              >
                PLAY AGAIN
              </button>
            </div>
          )}

          {/* Hidden simulation triggers for E2E tests */}
          <div style={{ display: 'none' }}>
            <button onClick={handleSimulateWin} className="brutalist-button">Simulate Win</button>
            <button onClick={handleSimulateLoss} className="brutalist-button">Simulate Loss</button>
          </div>

        </div>
      </GameWrapper>
    </div>
  );
};

export default Chess;
