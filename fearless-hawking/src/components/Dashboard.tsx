import React from 'react';
import type { GameId, GameMetadata, ScoresState } from '../types';
import { Play, RotateCcw, Monitor, Sun, Moon } from 'lucide-react';
import AudioToggle from './AudioToggle';
import audio from '../utils/audio';

interface DashboardProps {
  games: GameMetadata[];
  scores: ScoresState;
  onSelectGame: (id: GameId) => void;
  onResetAllScores: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  games,
  scores,
  onSelectGame,
  onResetAllScores,
  isDark,
  onToggleTheme,
  crtEnabled,
  onToggleCrt,
}) => {
  const totalGamesPlayed = Object.values(scores).reduce((acc, curr) => acc + curr.gamesPlayed, 0);
  const totalGamesWon = Object.values(scores).reduce((acc, curr) => acc + curr.gamesWon, 0);

  const handleSelectGame = (id: GameId) => {
    audio.playClick();
    onSelectGame(id);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all high scores and session statistics?')) {
      audio.playClick();
      onResetAllScores();
    }
  };

  return (
    <div data-testid="dashboard" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 16px' }}>
      {/* Game Center Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }} className="boot-flicker">
        <h1
          style={{
            fontSize: '3rem',
            fontFamily: 'var(--font-sans)',
            textTransform: 'uppercase',
            borderBottom: '6px solid var(--border)',
            paddingBottom: '16px',
            display: 'inline-block',
          }}
        >
          MONO.ARCADE
        </h1>
        <p
          style={{
            marginTop: '12px',
            fontSize: '0.85rem',
            color: 'var(--gray-dark)',
            fontWeight: '700',
            letterSpacing: '0.1em',
          }}
        >
          HIGH-CONTRAST MONOCHROME PLAYGROUND
        </p>
      </div>

      {/* Global Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '3px solid var(--border)',
          paddingBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            data-testid="theme-toggle"
            onClick={onToggleTheme}
            className="brutalist-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '0.75rem',
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'LIGHT THEME' : 'DARK THEME'}
          </button>
          <button
            data-testid="crt-toggle"
            onClick={onToggleCrt}
            className="brutalist-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '0.75rem',
            }}
          >
            <Monitor size={14} />
            {crtEnabled ? 'CRT: ON' : 'CRT: OFF'}
          </button>
          <button
            data-testid="reset-stats-btn"
            onClick={handleReset}
            className="brutalist-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '0.75rem',
            }}
          >
            <RotateCcw size={14} />
            RESET LOGS
          </button>
        </div>

        <AudioToggle />
      </div>

      {/* Statistics Cabinet */}
      <div
        className="brutalist-card"
        style={{
          marginBottom: '40px',
          backgroundColor: 'var(--gray-light)',
          padding: '20px',
        }}
      >
        <h3
          style={{
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontSize: '1rem',
            borderBottom: '2px solid var(--border)',
            paddingBottom: '8px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          ARCADE CABINET METRICS
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '20px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--gray-dark)',
                fontWeight: 'bold',
                display: 'block',
                letterSpacing: '0.05em',
              }}
            >
              TOTAL PLAYS
            </span>
            <span data-testid="stats-total-plays" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalGamesPlayed}</span>
          </div>
          <div>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--gray-dark)',
                fontWeight: 'bold',
                display: 'block',
                letterSpacing: '0.05em',
              }}
            >
              TOTAL WINS
            </span>
            <span data-testid="stats-total-wins" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalGamesWon}</span>
          </div>
          {games.map((game) => (
            <div key={game.id}>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--gray-dark)',
                  fontWeight: 'bold',
                  display: 'block',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {game.title} RECORD
              </span>
              <span data-testid={`highscore-${game.id}`} style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                {scores[game.id].highScore}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Game Catalog */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
        }}
      >
        {games.map((game) => (
          <div
            key={game.id}
            className="brutalist-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '230px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.2rem',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {game.title}
                </h3>
                <span
                  data-testid={`highscore-${game.id}`}
                  style={{
                    fontSize: '0.75rem',
                    border: '2px solid var(--border)',
                    padding: '2px 6px',
                    fontWeight: 'bold',
                  }}
                >
                  BEST: {scores[game.id].highScore}
                </span>
              </div>
              <p
                style={{
                  fontSize: '0.8rem',
                  lineHeight: '1.5',
                  color: 'var(--gray-dark)',
                  marginBottom: '20px',
                }}
              >
                {game.description}
              </p>
            </div>
            <button
              data-testid={`launch-game-${game.id}`}
              onClick={() => handleSelectGame(game.id)}
              className="brutalist-button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
              }}
            >
              <Play size={14} fill="currentColor" /> LAUNCH GAME
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
