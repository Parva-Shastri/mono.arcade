import React, { useState, useEffect, useCallback } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'connectfour',
  title: 'Connect Four',
  description: 'Drop checkers to connect four in a row horizontally, vertically, or diagonally.',
  instructions: [
    'Choose Play Mode: VS AI or Pass & Play.',
    'Click on any column to drop your checker to the bottom-most available cell.',
    'Connect four of your checkers in a line (horizontal, vertical, or diagonal) to win.',
  ],
};

interface ConnectFourProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

type CellOwner = 'none' | 'player1' | 'player2';

const ROWS = 6;
const COLS = 7;

// Heuristic Evaluation functions for minimax AI
const evaluateWindow = (window: CellOwner[], player: CellOwner) => {
  const opp = player === 'player1' ? 'player2' : 'player1';
  let score = 0;
  
  const playerCount = window.filter(c => c === player).length;
  const oppCount = window.filter(c => c === opp).length;
  const emptyCount = window.filter(c => c === 'none').length;
  
  if (playerCount === 4) {
    score += 100000;
  } else if (playerCount === 3 && emptyCount === 1) {
    score += 100;
  } else if (playerCount === 2 && emptyCount === 2) {
    score += 10;
  }
  
  if (oppCount === 3 && emptyCount === 1) {
    score -= 80; // block opponent's 3-in-a-row
  }
  
  return score;
};

const scoreBoard = (g: CellOwner[][], player: CellOwner) => {
  let score = 0;

  // Score center column higher
  const centerCol = 3;
  const centerCount = g.map(row => row[centerCol]).filter(c => c === player).length;
  score += centerCount * 20;

  // Horizontal Score
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [g[r][c], g[r][c+1], g[r][c+2], g[r][c+3]];
      score += evaluateWindow(window, player);
    }
  }
  
  // Vertical Score
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      const window = [g[r][c], g[r+1][c], g[r+2][c], g[r+3][c]];
      score += evaluateWindow(window, player);
    }
  }

  // Diagonal Up-Right
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [g[r][c], g[r-1][c+1], g[r-2][c+2], g[r-3][c+3]];
      score += evaluateWindow(window, player);
    }
  }

  // Diagonal Down-Right
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const window = [g[r][c], g[r+1][c+1], g[r+2][c+2], g[r+3][c+3]];
      score += evaluateWindow(window, player);
    }
  }

  return score;
};

const checkWin = (g: CellOwner[][], player: CellOwner) => {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (g[r][c] === player && g[r][c+1] === player && g[r][c+2] === player && g[r][c+3] === player) {
        return true;
      }
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      if (g[r][c] === player && g[r+1][c] === player && g[r+2][c] === player && g[r+3][c] === player) {
        return true;
      }
    }
  }
  // Diagonal Up-Right
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (g[r][c] === player && g[r-1][c+1] === player && g[r-2][c+2] === player && g[r-3][c+3] === player) {
        return true;
      }
    }
  }
  // Diagonal Down-Right
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (g[r][c] === player && g[r+1][c+1] === player && g[r+2][c+2] === player && g[r+3][c+3] === player) {
        return true;
      }
    }
  }
  return false;
};

const isBoardFull = (g: CellOwner[][]) => {
  for (let c = 0; c < COLS; c++) {
    if (g[0][c] === 'none') return false;
  }
  return true;
};

const minimax = (g: CellOwner[][], depth: number, alpha: number, beta: number, maximizingPlayer: boolean): { score: number; column: number } => {
  const validLocations = [];
  for (let c = 0; c < COLS; c++) {
    if (g[0][c] === 'none') {
      validLocations.push(c);
    }
  }

  const isTerminal = checkWin(g, 'player1') || checkWin(g, 'player2') || validLocations.length === 0;
  if (depth === 0 || isTerminal) {
    if (isTerminal) {
      if (checkWin(g, 'player2')) {
        return { score: 10000000 + depth, column: -1 };
      } else if (checkWin(g, 'player1')) {
        return { score: -10000000 - depth, column: -1 };
      } else {
        return { score: 0, column: -1 };
      }
    }
    return { score: scoreBoard(g, 'player2'), column: -1 };
  }

  if (maximizingPlayer) {
    let value = -Infinity;
    let column = validLocations[0];
    for (const col of validLocations) {
      let r = ROWS - 1;
      while (r >= 0 && g[r][col] !== 'none') {
        r--;
      }
      const gCopy = g.map(row => [...row]);
      gCopy[r][col] = 'player2';
      const newScore = minimax(gCopy, depth - 1, alpha, beta, false).score;
      if (newScore > value) {
        value = newScore;
        column = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { score: value, column };
  } else {
    let value = Infinity;
    let column = validLocations[0];
    for (const col of validLocations) {
      let r = ROWS - 1;
      while (r >= 0 && g[r][col] !== 'none') {
        r--;
      }
      const gCopy = g.map(row => [...row]);
      gCopy[r][col] = 'player1';
      const newScore = minimax(gCopy, depth - 1, alpha, beta, true).score;
      if (newScore < value) {
        value = newScore;
        column = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { score: value, column };
  }
};

export const ConnectFour: React.FC<ConnectFourProps> = ({ onBack, record, onUpdateRecord }) => {
  const [board, setBoard] = useState<CellOwner[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill('none'))
  );
  const [playMode, setPlayMode] = useState<'ai' | 'pvp'>('ai');
  const [turn, setTurn] = useState<'player1' | 'player2'>('player1');
  const [status, setStatus] = useState<'playing' | 'player1-win' | 'player2-win' | 'draw'>('playing');

  const handleReset = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill('none')));
    setTurn('player1');
    setStatus('playing');
  };

  const dropTokenInCol = useCallback((col: number, player: 'player1' | 'player2') => {
    // Drop token bottom-up
    let r = ROWS - 1;
    while (r >= 0 && board[r][col] !== 'none') {
      r--;
    }

    if (r < 0) return; // Column full

    audio.playScore();

    const nextBoard = board.map(row => [...row]);
    nextBoard[r][col] = player;
    setBoard(nextBoard);

    if (checkWin(nextBoard, player)) {
      const winState = player === 'player1' ? 'player1-win' : 'player2-win';
      setStatus(winState);

      if (playMode === 'ai') {
        if (player === 'player1') {
          audio.playWin();
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.75 },
            colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
          });
          onUpdateRecord('connectfour', {
            highScore: record.highScore + 30,
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon + 1,
          });
        } else {
          audio.playLose();
          onUpdateRecord('connectfour', {
            highScore: record.highScore,
            gamesPlayed: record.gamesPlayed + 1,
            gamesWon: record.gamesWon,
          });
        }
      } else {
        audio.playWin();
        onUpdateRecord('connectfour', {
          highScore: record.highScore,
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      }
    } else if (isBoardFull(nextBoard)) {
      setStatus('draw');
      audio.playLose();
      onUpdateRecord('connectfour', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    } else {
      setTurn(player === 'player1' ? 'player2' : 'player1');
    }
  }, [board, playMode, record, onUpdateRecord]);

  // AI turn triggering
  useEffect(() => {
    if (status !== 'playing' || playMode !== 'ai' || turn !== 'player2') return;

    const timer = setTimeout(() => {
      const { column } = minimax(board, 4, -Infinity, Infinity, true);
      if (column !== -1) {
        dropTokenInCol(column, 'player2');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [board, status, playMode, turn, dropTokenInCol]);


  const handleSimulateWin = () => {
    setStatus('player1-win');
    audio.playWin();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
    });
    onUpdateRecord('connectfour', {
      highScore: record.highScore + 30,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('player2-win');
    audio.playLose();
    onUpdateRecord('connectfour', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  return (
    <div data-testid="game-connectfour" style={{ width: '100%' }}>
      <GameWrapper
        title={metadata.title}
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
          {/* Controls & Turn info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', display: 'block', color: 'var(--gray-dark)', marginBottom: '4px' }}>
                  PLAY MODE
                </span>
                <div style={{ display: 'flex', border: '2px solid var(--border)' }}>
                  <button
                    onClick={() => {
                      audio.playClick();
                      setPlayMode('ai');
                      handleReset();
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      border: 'none',
                      backgroundColor: playMode === 'ai' ? 'var(--fg)' : 'var(--bg)',
                      color: playMode === 'ai' ? 'var(--bg)' : 'var(--fg)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    VS AI
                  </button>
                  <button
                    onClick={() => {
                      audio.playClick();
                      setPlayMode('pvp');
                      handleReset();
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      border: 'none',
                      borderLeft: '2px solid var(--border)',
                      backgroundColor: playMode === 'pvp' ? 'var(--fg)' : 'var(--bg)',
                      color: playMode === 'pvp' ? 'var(--bg)' : 'var(--fg)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    PASS & PLAY
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', display: 'block', color: 'var(--gray-dark)', marginBottom: '4px' }}>
                  TURN
                </span>
                <div
                  style={{
                    border: '2px solid var(--border)',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--gray-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: '1px solid var(--border)',
                      backgroundColor: turn === 'player1' ? 'var(--fg)' : undefined,
                      background: turn === 'player2' ? 'repeating-linear-gradient(45deg, var(--bg), var(--bg) 2px, var(--fg) 2px, var(--fg) 4px)' : undefined,
                    }}
                  />
                  <span data-testid="connectfour-turn">
                    {turn === 'player1' ? 'PLAYER 1' : (playMode === 'ai' ? 'AI (PLAYER 2)' : 'PLAYER 2')}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                border: '2px solid var(--border)',
                padding: '8px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                backgroundColor: 'var(--gray-light)',
                letterSpacing: '0.05em',
              }}
            >
              STATUS:{' '}
              <span data-testid="connectfour-status-text">
                {status}
              </span>
            </div>
          </div>

          {/* Grid Connect Four */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              justifyContent: 'center',
              backgroundColor: 'var(--fg)',
              padding: '12px',
              border: '4px solid var(--border)',
              boxShadow: '4px 4px 0 var(--border)',
              marginBottom: '20px',
            }}
          >
            {Array.from({ length: COLS }).map((_, c) => {
              return (
                <div
                  key={c}
                  data-testid={`connectfour-col-${c}`}
                  onClick={() => {
                    if (status === 'playing' && (playMode === 'pvp' || turn === 'player1')) {
                      dropTokenInCol(c, turn);
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '2px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '4px',
                  }}
                >
                  {Array.from({ length: ROWS }).map((_, r) => {
                    const player = board[r][c];
                    
                    // Style token placement
                    let tokenStyle: React.CSSProperties = {
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      border: '2px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      boxShadow: 'inset 0 3px 3px rgba(0,0,0,0.2)',
                    };

                    if (player === 'player1') {
                      tokenStyle = {
                        ...tokenStyle,
                        backgroundColor: 'var(--fg)',
                        boxShadow: 'inset 0 3px 3px rgba(255,255,255,0.2)',
                      };
                    } else if (player === 'player2') {
                      tokenStyle = {
                        ...tokenStyle,
                        background: 'repeating-linear-gradient(45deg, var(--bg), var(--bg) 4px, var(--fg) 4px, var(--fg) 8px)',
                        boxShadow: 'inset 0 3px 3px rgba(255,255,255,0.2)',
                      };
                    }

                    return (
                      <div
                        key={r}
                        data-testid={`connectfour-cell-${r}-${c}`}
                        data-player={player}
                        style={tokenStyle}
                      />
                    );
                  })}
                </div>
              );
            })}
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

export default ConnectFour;

