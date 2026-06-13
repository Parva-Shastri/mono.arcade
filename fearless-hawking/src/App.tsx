import React, { useState, useEffect } from 'react';
import type { GameId, GameMetadata, ScoresState } from './types';
import Dashboard from './components/Dashboard';
import TicTacToe, { metadata as tictactoeMeta } from './games/tictactoe/TicTacToe';
import Snake, { metadata as snakeMeta } from './games/snake/Snake';
import Game2048, { metadata as game2048Meta } from './games/2048/Game2048';
import Minesweeper, { metadata as minesweeperMeta } from './games/minesweeper/Minesweeper';
import Memory, { metadata as memoryMeta } from './games/memory/Memory';
import Sudoku, { metadata as sudokuMeta } from './games/sudoku/Sudoku';
import Wordle, { metadata as wordleMeta } from './games/wordle/Wordle';
import Pong, { metadata as pongMeta } from './games/pong/Pong';
import Breakout, { metadata as breakoutMeta } from './games/breakout/Breakout';
import Tetris, { metadata as tetrisMeta } from './games/tetris/Tetris';
import ConnectFour, { metadata as connectfourMeta } from './games/connectfour/ConnectFour';
import Maze, { metadata as mazeMeta } from './games/maze/Maze';
import Solitaire, { metadata as solitaireMeta } from './games/solitaire/Solitaire';
import Hangman, { metadata as hangmanMeta } from './games/hangman/Hangman';
import Chess, { metadata as chessMeta } from './games/chess/Chess';
import Mario, { metadata as marioMeta } from './games/mario/Mario';
import Carrom, { metadata as carromMeta } from './games/carrom/Carrom';
import SpaceShooter, { metadata as spaceshooterMeta } from './games/spaceshooter/SpaceShooter';

const GAMES: GameMetadata[] = [
  tictactoeMeta,
  snakeMeta,
  game2048Meta,
  minesweeperMeta,
  memoryMeta,
  sudokuMeta,
  wordleMeta,
  pongMeta,
  breakoutMeta,
  tetrisMeta,
  connectfourMeta,
  mazeMeta,
  solitaireMeta,
  hangmanMeta,
  chessMeta,
  marioMeta,
  carromMeta,
  spaceshooterMeta,
];

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
          games={GAMES}
          scores={scores}
          onSelectGame={setActiveGame}
          onResetAllScores={handleResetAllScores}
          isDark={theme === 'dark'}
          onToggleTheme={toggleTheme}
          crtEnabled={crtEnabled}
          onToggleCrt={toggleCrt}
        />
      )}

      {activeGame === 'tictactoe' && (
        <TicTacToe
          onBack={() => setActiveGame(null)}
          record={scores.tictactoe}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'snake' && (
        <Snake
          onBack={() => setActiveGame(null)}
          record={scores.snake}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === '2048' && (
        <Game2048
          onBack={() => setActiveGame(null)}
          record={scores['2048']}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'minesweeper' && (
        <Minesweeper
          onBack={() => setActiveGame(null)}
          record={scores.minesweeper}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'memory' && (
        <Memory
          onBack={() => setActiveGame(null)}
          record={scores.memory}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'sudoku' && (
        <Sudoku
          onBack={() => setActiveGame(null)}
          record={scores.sudoku}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'wordle' && (
        <Wordle
          onBack={() => setActiveGame(null)}
          record={scores.wordle}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'pong' && (
        <Pong
          onBack={() => setActiveGame(null)}
          record={scores.pong}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'breakout' && (
        <Breakout
          onBack={() => setActiveGame(null)}
          record={scores.breakout}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'tetris' && (
        <Tetris
          onBack={() => setActiveGame(null)}
          record={scores.tetris}
          onUpdateRecord={handleUpdateRecord}
        />
      )}


      {activeGame === 'connectfour' && (
        <ConnectFour
          onBack={() => setActiveGame(null)}
          record={scores.connectfour}
          onUpdateRecord={handleUpdateRecord}
        />
      )}

      {activeGame === 'maze' && (
        <Maze
          onBack={() => setActiveGame(null)}
          record={scores.maze}
          onUpdateRecord={handleUpdateRecord}
        />
      )}
    </div>
  );
};

export default App;
