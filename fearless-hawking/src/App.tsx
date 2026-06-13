import React, { Suspense, lazy, useState, useEffect } from 'react';
import type { GameId, ScoresState } from './types';
import Dashboard from './components/Dashboard';
import { GAME_METADATA, GAME_ORDER } from './gameRegistry';

const GAME_COMPONENTS = {
  tictactoe: lazy(() => import('./games/tictactoe/TicTacToe')),
  snake: lazy(() => import('./games/snake/Snake')),
  '2048': lazy(() => import('./games/2048/Game2048')),
  minesweeper: lazy(() => import('./games/minesweeper/Minesweeper')),
  memory: lazy(() => import('./games/memory/Memory')),
  sudoku: lazy(() => import('./games/sudoku/Sudoku')),
  wordle: lazy(() => import('./games/wordle/Wordle')),
  pong: lazy(() => import('./games/pong/Pong')),
  breakout: lazy(() => import('./games/breakout/Breakout')),
  tetris: lazy(() => import('./games/tetris/Tetris')),
  connectfour: lazy(() => import('./games/connectfour/ConnectFour')),
  maze: lazy(() => import('./games/maze/Maze')),
  solitaire: lazy(() => import('./games/solitaire/Solitaire')),
  hangman: lazy(() => import('./games/hangman/Hangman')),
  chess: lazy(() => import('./games/chess/Chess')),
  mario: lazy(() => import('./games/mario/Mario')),
  carrom: lazy(() => import('./games/carrom/Carrom')),
  spaceshooter: lazy(() => import('./games/spaceshooter/SpaceShooter')),
} as const;

const GAME_LOADERS = {
  tictactoe: () => import('./games/tictactoe/TicTacToe'),
  snake: () => import('./games/snake/Snake'),
  '2048': () => import('./games/2048/Game2048'),
  minesweeper: () => import('./games/minesweeper/Minesweeper'),
  memory: () => import('./games/memory/Memory'),
  sudoku: () => import('./games/sudoku/Sudoku'),
  wordle: () => import('./games/wordle/Wordle'),
  pong: () => import('./games/pong/Pong'),
  breakout: () => import('./games/breakout/Breakout'),
  tetris: () => import('./games/tetris/Tetris'),
  connectfour: () => import('./games/connectfour/ConnectFour'),
  maze: () => import('./games/maze/Maze'),
  solitaire: () => import('./games/solitaire/Solitaire'),
  hangman: () => import('./games/hangman/Hangman'),
  chess: () => import('./games/chess/Chess'),
  mario: () => import('./games/mario/Mario'),
  carrom: () => import('./games/carrom/Carrom'),
  spaceshooter: () => import('./games/spaceshooter/SpaceShooter'),
} as const;

const DEFAULT_SCORES: ScoresState = {
  tictactoe: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  snake: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  '2048': { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  minesweeper: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  memory: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  sudoku: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  wordle: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  pong: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  breakout: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  tetris: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  connectfour: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  maze: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  solitaire: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  hangman: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  chess: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  mario: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  carrom: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
  spaceshooter: { highScore: 0, gamesPlayed: 0, gamesWon: 0 },
};


export const App: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mono_games_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [crtEnabled, setCrtEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('mono_games_crt');
    return saved !== 'false';
  });

  const [scores, setScores] = useState<ScoresState>(() => {
    const saved = localStorage.getItem('mono_games_scores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SCORES, ...parsed };
      } catch {
        return DEFAULT_SCORES;
      }
    }
    return DEFAULT_SCORES;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mono_games_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('mono_games_crt', String(crtEnabled));
  }, [crtEnabled]);

  const handleUpdateRecord = (id: GameId, nextRecord: typeof DEFAULT_SCORES[GameId]) => {
    setScores((prev) => {
      const nextScores = { ...prev, [id]: nextRecord };
      localStorage.setItem('mono_games_scores', JSON.stringify(nextScores));
      return nextScores;
    });
  };

  const handleResetAllScores = () => {
    setScores(DEFAULT_SCORES);
    localStorage.setItem('mono_games_scores', JSON.stringify(DEFAULT_SCORES));
  };

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  const toggleCrt = () => {
    setCrtEnabled((c) => !c);
  };

  const handleSelectGame = async (id: GameId) => {
    try {
      await GAME_LOADERS[id]();
      setActiveGame(id);
    } catch (error) {
      console.error(`Failed to load game module for ${id}:`, error);
    }
  };

  return (
    <div
      className="app-viewport"
      style={{
        minHeight: '100vh',
        position: 'relative',
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* Optional CRT Screen Scanline Layer */}
      {crtEnabled && (
        <>
          <div className="crt-scanlines" />
          <div className="noise-overlay" />
        </>
      )}

      {activeGame === null && (
        <Dashboard
          games={GAME_ORDER.map((id) => GAME_METADATA[id])}
          scores={scores}
          onSelectGame={handleSelectGame}
          onResetAllScores={handleResetAllScores}
          isDark={theme === 'dark'}
          onToggleTheme={toggleTheme}
          crtEnabled={crtEnabled}
          onToggleCrt={toggleCrt}
        />
      )}

      {activeGame !== null && (
        <Suspense fallback={null}>
          {(() => {
            const GameComponent = GAME_COMPONENTS[activeGame];
            return (
              <GameComponent
                onBack={() => setActiveGame(null)}
                record={scores[activeGame]}
                onUpdateRecord={handleUpdateRecord}
              />
            );
          })()}
        </Suspense>
      )}

    </div>
  );
};

export default App;
