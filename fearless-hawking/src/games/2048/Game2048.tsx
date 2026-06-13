import React, { useState, useEffect, useRef } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: '2048',
  title: '2048',
  description: 'Slide tiles to merge matching patterns and reach the 2048 block. Reimagined with striking monochrome textures.',
  instructions: [
    'Use Arrow Keys, WASD, or swipe on screen to slide all tiles in a direction.',
    'When two tiles with the same number touch, they merge into one with double value.',
    'A new tile (2 or 4) spawns in a random empty space after every valid move.',
    'Reach the 2048 tile to win, or continue playing to set a high score!',
  ],
};

interface Game2048Props {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: '2048', record: ScoreRecord) => void;
}

export const Game2048: React.FC<Game2048Props> = ({ onBack, record, onUpdateRecord }) => {
  const [board, setBoard] = useState<number[][]>(() => initBoard());
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);
  const [newRecord, setNewRecord] = useState<boolean>(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function initBoard() {
    const e = Array(4).fill(null).map(() => Array(4).fill(0));
    spawnTile(e);
    spawnTile(e);
    return e;
  }

  function spawnTile(e: number[][]) {
    const emptyCells: { r: number; c: number }[] = [];
    for (let n = 0; n < 4; n++) {
      for (let r = 0; r < 4; r++) {
        if (e[n][r] === 0) emptyCells.push({ r: n, c: r });
      }
    }
    if (emptyCells.length > 0) {
      const { r: n, c: r } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      e[n][r] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  const handleReset = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setKeepPlaying(false);
    setNewRecord(false);
  };

  const checkGameStatus = (e: number[][], currentScore: number) => {
    if (!gameWon && !keepPlaying) {
      for (let t = 0; t < 4; t++) {
        for (let n = 0; n < 4; n++) {
          if (e[t][n] === 2048) {
            setGameWon(true);
            audio.playWin();
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.75 },
              colors: ['#000000', '#ffffff', '#aaaaaa'],
            });
            break;
          }
        }
      }
    }
    let hasMoves = false;
    for (let t = 0; t < 4; t++) {
      for (let n = 0; n < 4; n++) {
        if (e[t][n] === 0) {
          hasMoves = true;
          break;
        }
        if (t < 3 && e[t][n] === e[t + 1][n]) {
          hasMoves = true;
          break;
        }
        if (n < 3 && e[t][n] === e[t][n + 1]) {
          hasMoves = true;
          break;
        }
      }
      if (hasMoves) break;
    }
    if (!hasMoves) {
      setGameOver(true);
      audio.playLose();
      onUpdateRecord('2048', {
        highScore: Math.max(currentScore, record.highScore),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + (gameWon || currentScore >= 2048 ? 1 : 0),
      });
    }
  };

  const handleMove = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOver || (gameWon && !keepPlaying)) return;
    let nextBoard = board.map((row) => [...row]);
    let moved = false;
    let mergedAny = false;
    let earnedPoints = 0;

    const mergeLine = (line: number[]) => {
      let nonZero = line.filter((val) => val !== 0);
      for (let i = 0; i < nonZero.length - 1; i++) {
        if (nonZero[i] === nonZero[i + 1]) {
          nonZero[i] *= 2;
          earnedPoints += nonZero[i];
          nonZero[i + 1] = 0;
          mergedAny = true;
        }
      }
      let result = nonZero.filter((val) => val !== 0);
      while (result.length < 4) {
        result.push(0);
      }
      return result;
    };

    const rotateClockwise = (grid: number[][]) => {
      const rotated = Array(4).fill(null).map(() => Array(4).fill(0));
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          rotated[3 - c][r] = grid[r][c];
        }
      }
      return rotated;
    };

    const rotateCounterClockwise = (grid: number[][]) => {
      const rotated = Array(4).fill(null).map(() => Array(4).fill(0));
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          rotated[c][3 - r] = grid[r][c];
        }
      }
      return rotated;
    };

    if (direction === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const row = nextBoard[r];
        const merged = mergeLine(row);
        if (merged.join(',') !== row.join(',')) {
          moved = true;
        }
        nextBoard[r] = merged;
      }
    } else if (direction === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const row = nextBoard[r];
        const reversedMerged = mergeLine([...row].reverse()).reverse();
        if (reversedMerged.join(',') !== row.join(',')) {
          moved = true;
        }
        nextBoard[r] = reversedMerged;
      }
    } else if (direction === 'UP') {
      nextBoard = rotateClockwise(nextBoard);
      for (let r = 0; r < 4; r++) {
        const row = nextBoard[r];
        const merged = mergeLine(row);
        if (merged.join(',') !== row.join(',')) {
          moved = true;
        }
        nextBoard[r] = merged;
      }
      nextBoard = rotateCounterClockwise(nextBoard);
    } else if (direction === 'DOWN') {
      nextBoard = rotateCounterClockwise(nextBoard);
      for (let r = 0; r < 4; r++) {
        const row = nextBoard[r];
        const merged = mergeLine(row);
        if (merged.join(',') !== row.join(',')) {
          moved = true;
        }
        nextBoard[r] = merged;
      }
      nextBoard = rotateClockwise(nextBoard);
    }

    if (moved) {
      if (mergedAny) {
        audio.playMerge();
      } else {
        audio.playClick();
      }
      spawnTile(nextBoard);
      const nextScore = score + earnedPoints;
      setScore(nextScore);
      setBoard(nextBoard);
      if (nextScore > record.highScore) {
        setNewRecord(true);
      }
      checkGameStatus(nextBoard, nextScore);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (gameOver || (gameWon && !keepPlaying)) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleMove('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleMove('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleMove('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleMove('RIGHT');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, gameOver, gameWon, keepPlaying, score]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 50) {
        handleMove(dx > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      if (Math.abs(dy) > 50) {
        handleMove(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStart.current = null;
  };

  const getTileStyle = (val: number): React.CSSProperties => {
    if (val === 0) return { background: 'var(--bg)', border: 'none' };
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: val > 512 ? '1.1rem' : '1.3rem',
      borderRadius: '2px',
      aspectRatio: '1',
      userSelect: 'none',
      transition: 'transform 0.15s ease, background 0.15s ease',
    };
    switch (val) {
      case 2:
        return {
          ...baseStyle,
          backgroundColor: 'var(--bg)',
          color: 'var(--fg)',
          border: '3px solid var(--border)',
        };
      case 4:
        return {
          ...baseStyle,
          backgroundColor: 'var(--gray-light)',
          color: 'var(--fg)',
          border: '3px solid var(--border)',
        };
      case 8:
        return {
          ...baseStyle,
          background: 'repeating-linear-gradient(45deg, var(--bg), var(--bg) 4px, var(--gray-light) 4px, var(--gray-light) 8px)',
          color: 'var(--fg)',
          border: '3px solid var(--border)',
        };
      case 16:
        return {
          ...baseStyle,
          backgroundColor: 'var(--gray-mid)',
          color: 'var(--bg)',
          border: '3px solid var(--border)',
        };
      case 32:
        return {
          ...baseStyle,
          background: 'repeating-linear-gradient(-45deg, var(--fg), var(--fg) 3px, var(--gray-mid) 3px, var(--gray-mid) 6px)',
          color: 'var(--bg)',
          border: '3px solid var(--border)',
        };
      case 64:
        return {
          ...baseStyle,
          backgroundColor: 'var(--gray-dark)',
          color: 'var(--bg)',
          border: '3px solid var(--border)',
        };
      case 128:
        return {
          ...baseStyle,
          backgroundColor: 'var(--fg)',
          color: 'var(--bg)',
          border: '3px solid var(--border)',
        };
      case 256:
        return {
          ...baseStyle,
          backgroundColor: 'var(--fg)',
          color: 'var(--bg)',
          border: '5px double var(--border)',
        };
      case 512:
        return {
          ...baseStyle,
          backgroundColor: 'var(--fg)',
          color: 'var(--bg)',
          border: '3px dashed var(--border)',
        };
      case 1024:
        return {
          ...baseStyle,
          backgroundColor: 'var(--fg)',
          color: 'var(--bg)',
          border: '4px solid var(--border)',
          textDecoration: 'underline',
        };
      case 2048:
        return {
          ...baseStyle,
          backgroundColor: 'var(--fg)',
          color: 'var(--bg)',
          border: '5px solid var(--border)',
          animation: 'tile-pulse 1s infinite alternate',
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: 'var(--fg)',
          color: 'var(--bg)',
          border: '5px solid var(--border)',
          fontStyle: 'italic',
        };
    }
  };

  return (
    <GameWrapper
      title="2048"
      instructions={metadata.instructions}
      onBack={onBack}
      onReset={handleReset}
      highScore={record.highScore}
      highScoreLabel="HIGH SCORE"
    >
      <div
        style={{
          width: '100%',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              flexGrow: 1,
              textAlign: 'center',
              border: '2px solid var(--border)',
              padding: '6px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              backgroundColor: 'var(--gray-light)',
            }}
          >
            {gameOver ? (
              <span style={{ color: 'red' }}>GAME OVER</span>
            ) : newRecord ? (
              <span>NEW RECORD: {score} 🔥</span>
            ) : (
              <span>SCORE: {score}</span>
            )}
          </div>
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          width: '100%',
          maxWidth: '300px',
          aspectRatio: '1',
          border: '4px solid var(--border)',
          backgroundColor: 'var(--border)',
          gap: '4px',
          padding: '4px',
          margin: '0 auto',
          position: 'relative',
          touchAction: 'none',
        }}
      >
        {board.flat().map((cell, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1',
              borderRadius: '2px',
              ...getTileStyle(cell),
            }}
          >
            {cell > 0 ? cell : ''}
          </div>
        ))}

        {gameWon && !keepPlaying && (
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
              padding: '20px',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <h3
              style={{
                fontSize: '1.5rem',
                marginBottom: '8px',
                color: '#ffffff',
                fontFamily: 'var(--font-sans)',
              }}
            >
              2048 SECURED!
            </h3>
            <p
              style={{
                fontSize: '0.75rem',
                marginBottom: '16px',
                color: '#cccccc',
              }}
            >
              YOU COMBINED THE BLOCKS PERFECTLY.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  audio.playClick();
                  setKeepPlaying(true);
                }}
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
                KEEP PLAYING
              </button>
              <button
                onClick={handleReset}
                className="brutalist-button"
                style={{
                  backgroundColor: 'transparent',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  boxShadow: 'none',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                }}
              >
                RESTART
              </button>
            </div>
          </div>
        )}

        {gameOver && (
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
              padding: '20px',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <h3
              style={{
                fontSize: '1.4rem',
                marginBottom: '8px',
                color: '#ffffff',
                fontFamily: 'var(--font-sans)',
              }}
            >
              NO MORE MOVES!
            </h3>
            <p
              style={{
                fontSize: '0.75rem',
                marginBottom: '16px',
                color: '#cccccc',
              }}
            >
              FINAL SCORE: {score}
            </p>
            <button
              onClick={handleReset}
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
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tile-pulse {
          from {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          to {
            transform: scale(1.05);
            box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.6);
          }
        }
      `}</style>
    </GameWrapper>
  );
};

export default Game2048;
