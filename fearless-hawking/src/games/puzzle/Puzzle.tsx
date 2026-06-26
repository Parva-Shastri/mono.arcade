import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'puzzle',
  title: 'Photo Puzzle',
  description: 'Rearrange tiles to restore a stunning photo. Choose your category and difficulty.',
  instructions: [
    'Select a category and difficulty, then press Start Puzzle.',
    'Click tiles adjacent to the empty slot to slide them into place.',
    'Press Preview to briefly see the complete image.',
    'Restore the full image in the fewest moves to get a high score!',
  ],
};

interface PuzzleProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const CATEGORIES: { name: string; images: string[] }[] = [
  {
    name: 'Nature',
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=600&fit=crop',
    ],
  },
  {
    name: 'Wildlife',
    images: [
      'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1564349683136-77e08dba1ef3?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=600&h=600&fit=crop',
    ],
  },
  {
    name: 'Cityscapes',
    images: [
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=600&h=600&fit=crop',
    ],
  },
  {
    name: 'Architecture',
    images: [
      'https://images.unsplash.com/photo-1431576901776-e539bd916ba2?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=600&h=600&fit=crop',
    ],
  },
  {
    name: 'Space',
    images: [
      'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&h=600&fit=crop',
    ],
  },
];

const DIFFICULTIES = [
  { label: 'Easy', grid: 4 },
  { label: 'Mid', grid: 6 },
  { label: 'Hard', grid: 8 },
  { label: 'Extreme', grid: 10 },
];

const PUZZLE_SIZE = 480;

/** Generate a solvable shuffle by doing 300 random valid moves from solved state */
function generateShuffledTiles(n: number): number[] {
  const total = n * n;
  const tiles = Array.from({ length: total }, (_, i) => i); // 0 = empty
  let emptyIdx = 0; // empty tile starts at position 0 (top-left)

  for (let step = 0; step < 300; step++) {
    const row = Math.floor(emptyIdx / n);
    const col = emptyIdx % n;
    const neighbors: number[] = [];

    if (row > 0) neighbors.push(emptyIdx - n);
    if (row < n - 1) neighbors.push(emptyIdx + n);
    if (col > 0) neighbors.push(emptyIdx - 1);
    if (col < n - 1) neighbors.push(emptyIdx + 1);

    const swapIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
    const temp = tiles[emptyIdx];
    tiles[emptyIdx] = tiles[swapIdx];
    tiles[swapIdx] = temp;
    emptyIdx = swapIdx;
  }

  return tiles;
}

function isSolved(tiles: number[]): boolean {
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== i) return false;
  }
  return true;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const Puzzle: React.FC<PuzzleProps> = ({ onBack, record, onUpdateRecord }) => {
  // Setup state
  const [screen, setScreen] = useState<'setup' | 'playing' | 'won'>('setup');
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [difficultyIdx, setDifficultyIdx] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Game state
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  const [finalMoves, setFinalMoves] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const n = DIFFICULTIES[difficultyIdx].grid;
  const tileSize = PUZZLE_SIZE / n;

  // Pick random image from selected category
  const pickImage = useCallback(() => {
    const imgs = CATEGORIES[categoryIdx].images;
    const url = imgs[Math.floor(Math.random() * imgs.length)];
    setImageUrl(url);
  }, [categoryIdx]);

  // Pick image whenever category changes on setup screen
  useEffect(() => {
    if (screen === 'setup') {
      pickImage();
    }
  }, [categoryIdx, screen, pickImage]);

  // Start timer when playing
  useEffect(() => {
    if (screen === 'playing') {
      timerRef.current = setInterval(() => {
        setElapsedTime(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen]);

  const startPuzzle = () => {
    if (!imageUrl) pickImage();
    const shuffled = generateShuffledTiles(n);
    setTiles(shuffled);
    setMoves(0);
    setElapsedTime(0);
    setScreen('playing');
  };

  const handleTileClick = (idx: number) => {
    if (screen !== 'playing' || showPreview) return;
    if (tiles[idx] === 0) return; // clicked the empty tile

    const emptyIdx = tiles.indexOf(0);
    const row = Math.floor(idx / n);
    const col = idx % n;
    const emptyRow = Math.floor(emptyIdx / n);
    const emptyCol = emptyIdx % n;

    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (!isAdjacent) return;

    audio.playClick();
    const nextTiles = [...tiles];
    nextTiles[emptyIdx] = nextTiles[idx];
    nextTiles[idx] = 0;
    const nextMoves = moves + 1;
    setTiles(nextTiles);
    setMoves(nextMoves);

    if (isSolved(nextTiles)) {
      if (timerRef.current) clearInterval(timerRef.current);
      setFinalTime(elapsedTime + 1);
      setFinalMoves(nextMoves);
      setScreen('won');
      audio.playWin();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

      const scoreValue = Math.max(1000 - nextMoves * 5, 100);
      onUpdateRecord('puzzle', {
        highScore: Math.max(record.highScore, scoreValue),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + 1,
      });
    }
  };

  const handlePreview = () => {
    if (showPreview) return;
    setShowPreview(true);
    previewTimerRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 1500);
  };

  const handlePlayAgain = () => {
    audio.playClick();
    setScreen('setup');
    setShowPreview(false);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  // ── Setup Screen ──────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div data-testid="game-puzzle" style={{ width: '100%' }}>
        <GameWrapper
          title="Photo Puzzle"
          instructions={metadata.instructions}
          onBack={onBack}
          highScore={record.highScore}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
            {/* Category row */}
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '8px', color: 'var(--gray-dark)', textTransform: 'uppercase' }}>
                Category
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.name}
                    onClick={() => { audio.playClick(); setCategoryIdx(i); }}
                    className="brutalist-button"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      background: categoryIdx === i ? 'var(--fg)' : 'var(--bg)',
                      color: categoryIdx === i ? 'var(--bg)' : 'var(--fg)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty row */}
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.08em', marginBottom: '8px', color: 'var(--gray-dark)', textTransform: 'uppercase' }}>
                Difficulty
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DIFFICULTIES.map((d, i) => (
                  <button
                    key={d.label}
                    onClick={() => { audio.playClick(); setDifficultyIdx(i); }}
                    className="brutalist-button"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      background: difficultyIdx === i ? 'var(--fg)' : 'var(--bg)',
                      color: difficultyIdx === i ? 'var(--bg)' : 'var(--fg)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    {d.label} ({d.grid}×{d.grid})
                  </button>
                ))}
              </div>
            </div>

            {/* Image preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
              {imageUrl && (
                <div
                  style={{
                    width: '160px',
                    height: '160px',
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '3px solid var(--border)',
                    boxShadow: '4px 4px 0 var(--border)',
                  }}
                />
              )}
              <button
                className="brutalist-button"
                onClick={() => { audio.playClick(); pickImage(); }}
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                🎲 Pick Image
              </button>
            </div>

            {/* Start button */}
            <button
              className="brutalist-button"
              onClick={startPuzzle}
              style={{ padding: '10px 32px', fontSize: '1rem', fontWeight: 'bold' }}
            >
              START PUZZLE
            </button>
          </div>
        </GameWrapper>
      </div>
    );
  }

  // ── Win Screen ────────────────────────────────────────────────────────────
  if (screen === 'won') {
    const scoreValue = Math.max(1000 - finalMoves * 5, 100);
    return (
      <div data-testid="game-puzzle" style={{ width: '100%' }}>
        <GameWrapper
          title="Photo Puzzle"
          instructions={metadata.instructions}
          onBack={onBack}
          highScore={record.highScore}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
            {/* Solved image */}
            <div
              style={{
                width: '220px',
                height: '220px',
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '4px solid var(--border)',
                boxShadow: '6px 6px 0 var(--border)',
              }}
            />
            <div>
              <p style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '6px' }}>🎉 PUZZLE SOLVED!</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--gray-dark)', marginBottom: '4px' }}>
                Time: <strong>{formatTime(finalTime)}</strong> &nbsp;|&nbsp; Moves: <strong>{finalMoves}</strong>
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--gray-dark)' }}>
                Score: <strong>{scoreValue}</strong>
              </p>
            </div>
            <button
              className="brutalist-button"
              onClick={handlePlayAgain}
              style={{ padding: '10px 32px', fontSize: '1rem', fontWeight: 'bold' }}
            >
              PLAY AGAIN
            </button>
          </div>
        </GameWrapper>
      </div>
    );
  }

  // ── Playing Screen ────────────────────────────────────────────────────────
  return (
    <div data-testid="game-puzzle" style={{ width: '100%' }}>
      <GameWrapper
        title="Photo Puzzle"
        instructions={metadata.instructions}
        onBack={onBack}
        highScore={record.highScore}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: `${PUZZLE_SIZE}px`,
              maxWidth: '100%',
              fontSize: '0.85rem',
              fontWeight: 'bold',
            }}
          >
            <span>⏱ {formatTime(elapsedTime)}</span>
            <button
              className="brutalist-button"
              onClick={handlePreview}
              disabled={showPreview}
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
            >
              👁 Preview
            </button>
            <span>Moves: {moves}</span>
          </div>

          {/* Puzzle grid */}
          <div
            style={{
              position: 'relative',
              width: `${PUZZLE_SIZE}px`,
              height: `${PUZZLE_SIZE}px`,
              maxWidth: '100%',
              border: '3px solid var(--border)',
              boxShadow: '4px 4px 0 var(--border)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: `repeat(${n}, ${tileSize}px)`,
              gridTemplateRows: `repeat(${n}, ${tileSize}px)`,
            }}
          >
            {tiles.map((tileVal, idx) => {
              const isEmpty = tileVal === 0;
              // The tile's original position in the solved image
              const origRow = Math.floor(tileVal / n);
              const origCol = tileVal % n;

              return (
                <button
                  key={idx}
                  onClick={() => handleTileClick(idx)}
                  disabled={isEmpty}
                  style={{
                    width: `${tileSize}px`,
                    height: `${tileSize}px`,
                    padding: 0,
                    margin: 0,
                    border: isEmpty ? 'none' : '1px solid rgba(0,0,0,0.25)',
                    cursor: isEmpty ? 'default' : 'pointer',
                    backgroundImage: isEmpty ? 'none' : `url(${imageUrl})`,
                    backgroundSize: `${PUZZLE_SIZE}px ${PUZZLE_SIZE}px`,
                    backgroundPosition: isEmpty ? 'unset' : `-${origCol * tileSize}px -${origRow * tileSize}px`,
                    backgroundColor: isEmpty ? 'var(--gray-dark)' : 'transparent',
                    transition: 'filter 0.1s',
                    filter: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    if (!isEmpty) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.filter = 'none';
                  }}
                />
              );
            })}

            {/* Preview overlay */}
            {showPreview && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.85,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              />
            )}
          </div>

          {/* Back to setup link */}
          <button
            className="brutalist-button"
            onClick={handlePlayAgain}
            style={{ padding: '6px 16px', fontSize: '0.8rem', marginTop: '4px' }}
          >
            ↩ Change Puzzle
          </button>
        </div>
      </GameWrapper>
    </div>
  );
};

export default Puzzle;
