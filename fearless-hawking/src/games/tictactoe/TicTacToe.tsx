import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord } from '../../types';
import { getAIMove, checkWinner, isBoardFull } from './ai';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'tictactoe',
  title: 'Tic-Tac-Toe',
  description: 'A monochrome duel of circles and crosses. Play against a smart AI or challenge a friend locally.',
  instructions: [
    'Choose play mode: VS AI or Pass & Play.',
    'Select difficulty (Easy, Medium, or Impossible) if playing against the AI.',
    'Click on an empty square on the grid to place your mark (X).',
    'Get three of your marks in a horizontal, vertical, or diagonal row to win.',
    'If the board is filled without any player getting three in a row, it is a draw.',
  ],
};

interface TicTacToeProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: 'tictactoe', record: ScoreRecord) => void;
}

export const TicTacToe: React.FC<TicTacToeProps> = ({ onBack, record, onUpdateRecord }) => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [playMode, setPlayMode] = useState<'ai' | 'pvp'>('ai');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'impossible'>('impossible');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [gameResult, setGameResult] = useState<{ winner: string | null; line: number[] | null } | null>(null);

  useEffect(() => {
    const res = checkWinner(board);
    if (res.winner) {
      setGameResult(res);
      audio.playWin();

      // Premium monochrome confetti blast
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
      });

      // Update record
      if (playMode === 'ai') {
        const playerWon = res.winner === 'X';
        onUpdateRecord('tictactoe', {
          highScore: record.highScore + (playerWon ? 1 : 0),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + (playerWon ? 1 : 0),
        });
      } else {
        onUpdateRecord('tictactoe', {
          highScore: record.highScore,
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      }
    } else if (isBoardFull(board)) {
      setGameResult({ winner: 'draw', line: null });
      audio.playLose();
      onUpdateRecord('tictactoe', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    } else if (playMode === 'ai' && !isXNext) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, difficulty, 'O', 'X');
        if (aiMove !== -1) {
          const nextBoard = [...board];
          nextBoard[aiMove] = 'O';
          setBoard(nextBoard);
          setIsXNext(true);
          audio.playClick();
        }
        setIsAiThinking(false);
      }, 500); // 500ms delay to feel natural
      return () => clearTimeout(timer);
    }
  }, [board, isXNext, playMode, difficulty]);

  const handleCellClick = (idx: number) => {
    if (board[idx] || gameResult || isAiThinking) return;
    if (playMode === 'ai' && !isXNext) return;

    audio.playClick();
    const nextBoard = [...board];
    nextBoard[idx] = isXNext ? 'X' : 'O';
    setBoard(nextBoard);
    setIsXNext(!isXNext);
  };

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setGameResult(null);
    setIsAiThinking(false);
  };

  return (
    <GameWrapper
      title="Tic-Tac-Toe"
      instructions={metadata.instructions}
      onBack={onBack}
      onReset={handleReset}
      highScore={record.gamesWon}
      highScoreLabel="TOTAL WINS (VS AI)"
    >
      {/* Settings Row */}
      <div
        style={{
          width: '100%',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
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
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 'bold',
                display: 'block',
                color: 'var(--gray-dark)',
                marginBottom: '4px',
              }}
            >
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

          {playMode === 'ai' && (
            <div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  display: 'block',
                  color: 'var(--gray-dark)',
                  marginBottom: '4px',
                }}
              >
                DIFFICULTY
              </span>
              <div style={{ display: 'flex', border: '2px solid var(--border)' }}>
                {(['easy', 'medium', 'impossible'] as const).map((level, i) => (
                  <button
                    key={level}
                    onClick={() => {
                      audio.playClick();
                      setDifficulty(level);
                      handleReset();
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      border: 'none',
                      borderLeft: i > 0 ? '2px solid var(--border)' : 'none',
                      backgroundColor: difficulty === level ? 'var(--fg)' : 'var(--bg)',
                      color: difficulty === level ? 'var(--bg)' : 'var(--fg)',
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
          )}
        </div>

        {/* Game Status Bar */}
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
          {gameResult ? (
            gameResult.winner === 'draw' ? (
              "GAME DRAW! RESET TO TRY AGAIN."
            ) : (
              `PLAYER ${gameResult.winner} WINS THE GAME!`
            )
          ) : isAiThinking ? (
            'AI IS COMPUTING MOVE...'
          ) : playMode === 'ai' ? (
            isXNext ? (
              'YOUR TURN (X)'
            ) : (
              'AI IS PLAYING (O)'
            )
          ) : (
            `PLAYER ${isXNext ? 'X' : 'O'} TURN`
          )}
        </div>
      </div>

      {/* Tic-Tac-Toe Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          width: '100%',
          maxWidth: '300px',
          aspectRatio: '1',
          border: '4px solid var(--border)',
          backgroundColor: 'var(--border)',
          gap: '4px',
          margin: '0 auto',
        }}
      >
        {board.map((cell, idx) => {
          const isWinningCell = gameResult?.line?.includes(idx);
          const isHoverable = !cell && !gameResult && (!isAiThinking || playMode === 'pvp');
          return (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: isWinningCell ? 'var(--fg)' : 'var(--bg)',
                color: isWinningCell ? 'var(--bg)' : 'var(--fg)',
                cursor: isHoverable ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                outline: 'none',
                transition: 'background-color 0.15s ease',
              }}
              className={isHoverable ? 'tictactoe-cell hoverable' : 'tictactoe-cell'}
            >
              {cell === 'X' && (
                <svg viewBox="0 0 100 100" style={{ width: '80%', height: '80%' }}>
                  <line
                    x1="15"
                    y1="15"
                    x2="85"
                    y2="85"
                    stroke={isWinningCell ? 'var(--bg)' : 'var(--fg)'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 100,
                      strokeDashoffset: 100,
                      animation: 'draw-line 0.2s ease-out forwards',
                    }}
                  />
                  <line
                    x1="85"
                    y1="15"
                    x2="15"
                    y2="85"
                    stroke={isWinningCell ? 'var(--bg)' : 'var(--fg)'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 100,
                      strokeDashoffset: 100,
                      animation: 'draw-line 0.2s ease-out 0.1s forwards',
                    }}
                  />
                </svg>
              )}
              {cell === 'O' && (
                <svg viewBox="0 0 100 100" style={{ width: '80%', height: '80%' }}>
                  <circle
                    cx="50"
                    cy="50"
                    r="32"
                    fill="none"
                    stroke={isWinningCell ? 'var(--bg)' : 'var(--fg)'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 220,
                      strokeDashoffset: 220,
                      animation: 'draw-circle 0.3s ease-out forwards',
                    }}
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Styled Animations for SVG drawing and Hover states */}
      <style>{`
        @keyframes draw-line {
          to { stroke-dashoffset: 0; }
        }
        @keyframes draw-circle {
          to { stroke-dashoffset: 0; }
        }
        .tictactoe-cell.hoverable:hover {
          background-color: var(--gray-light) !important;
        }
      `}</style>
    </GameWrapper>
  );
};

export default TicTacToe;
