import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'hangman',
  title: 'Hangman',
  description: 'Guess the hidden word before running out of guesses.',
  instructions: [
    'Use the on-screen keyboard or your physical keyboard to guess letters.',
    'Each incorrect guess adds a part to the gallows.',
    'Guess the word within 6 incorrect attempts to win and increase your streak.',
  ],
};

interface HangmanProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const WORDS = [
  'MONOCHROME',
  'ARCADE',
  'RETRO',
  'CABINET',
  'PIXEL',
  'JOYSTICK',
  'CONSOLE',
  'CHIPTIUN',
  'VECTOR',
  'MATRIX',
  'BRUTALIST',
  'PUPPETEER',
  'SCREEN',
  'SOUND',
  'SCORE',
];

export const Hangman: React.FC<HangmanProps> = ({ onBack, record, onUpdateRecord }) => {
  const [word, setWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const mistakes = Array.from(guessedLetters).filter(
    (letter) => !word.includes(letter)
  ).length;

  const maxMistakes = 6;

  const initGame = (resetStreak = false) => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(randomWord);
    setGuessedLetters(new Set());
    setStatus('playing');
    if (resetStreak) {
      setStreak(0);
    }
  };

  useEffect(() => {
    initGame(false);
  }, []);

  const handleReset = () => {
    audio.playClick();
    initGame(true);
  };

  const makeGuess = (letter: string) => {
    if (status !== 'playing' || guessedLetters.has(letter)) return;

    audio.playClick();
    const nextGuessed = new Set(guessedLetters);
    nextGuessed.add(letter);
    setGuessedLetters(nextGuessed);

    const isCorrect = word.includes(letter);
    if (isCorrect) {
      audio.playScore();
      // Check if all letters guessed
      const allGuessed = Array.from(word).every((char) => nextGuessed.has(char));
      if (allGuessed) {
        setStatus('won');
        audio.playWin();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        onUpdateRecord('hangman', {
          highScore: Math.max(record.highScore, nextStreak),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
      }
    } else {
      audio.playMerge();
      const newMistakes = mistakes + 1;
      if (newMistakes >= maxMistakes) {
        setStatus('lost');
        audio.playLose();
        onUpdateRecord('hangman', {
          highScore: record.highScore,
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      }
    }
  };

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        makeGuess(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, word, guessedLetters, streak]);

  const handleSimulateWin = () => {
    // Reveal all letters
    const wonGuessed = new Set(word.split(''));
    setGuessedLetters(wonGuessed);
    setStatus('won');
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    onUpdateRecord('hangman', {
      highScore: Math.max(record.highScore, nextStreak),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    // Fill in incorrect letters
    const incorrects = 'QWXZJVYFGP'.split('').filter(char => !word.includes(char)).slice(0, 6);
    const lostGuessed = new Set([...guessedLetters, ...incorrects]);
    setGuessedLetters(lostGuessed);
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('hangman', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div data-testid="game-hangman" id="hangman-board" style={{ width: '100%' }}>
      <GameWrapper
        title="Hangman"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="STREAK"
      >
        <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto', fontFamily: 'var(--font-mono)' }}>
          
          {/* Header Panel */}
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
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STREAK</span>
              <span data-testid="hangman-streak">{streak}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>MISTAKES</span>
              <span data-testid="hangman-mistakes">{mistakes} / {maxMistakes}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span>{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Gallows Graphics & Screen */}
          <div
            style={{
              border: '3px solid var(--border)',
              padding: '16px',
              backgroundColor: 'var(--bg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              marginBottom: '16px',
            }}
          >
            {/* SVG Gallows */}
            <svg width="150" height="150" viewBox="0 0 100 100" style={{ stroke: 'var(--fg)', strokeWidth: '3', fill: 'none', strokeLinecap: 'round' }}>
              {/* Stand */}
              <line x1="10" y1="90" x2="60" y2="90" />
              {/* Post */}
              <line x1="25" y1="90" x2="25" y2="10" />
              {/* Top beam */}
              <line x1="25" y1="10" x2="65" y2="10" />
              {/* Rope */}
              <line x1="65" y1="10" x2="65" y2="25" />

              {/* Head */}
              {mistakes >= 1 && <circle cx="65" cy="31" r="6" style={{ strokeWidth: '2.5' }} />}
              {/* Body */}
              {mistakes >= 2 && <line x1="65" y1="37" x2="65" y2="58" />}
              {/* Left Arm */}
              {mistakes >= 3 && <line x1="65" y1="42" x2="52" y2="48" />}
              {/* Right Arm */}
              {mistakes >= 4 && <line x1="65" y1="42" x2="78" y2="48" />}
              {/* Left Leg */}
              {mistakes >= 5 && <line x1="65" y1="58" x2="54" y2="74" />}
              {/* Right Leg */}
              {mistakes >= 6 && <line x1="65" y1="58" x2="76" y2="74" />}
            </svg>

            {/* Guessed Word Spaces */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
              {word.split('').map((char, index) => {
                const revealed = guessedLetters.has(char) || status === 'lost';
                return (
                  <span
                    key={index}
                    style={{
                      borderBottom: '3px solid var(--border)',
                      minWidth: '20px',
                      textAlign: 'center',
                      color: revealed ? 'var(--fg)' : 'transparent',
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Game Over Message Overlay */}
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
              {status === 'won' ? (
                <div style={{ color: 'var(--fg)' }}>CORRECT! NEXT ROUND STARTING...</div>
              ) : (
                <div style={{ color: 'var(--fg)' }}>GAME OVER! Word was: {word}</div>
              )}
              <button
                onClick={() => initGame(status === 'lost')}
                className="brutalist-button"
                style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.8rem' }}
              >
                CONTINUE
              </button>
            </div>
          )}

          {/* On-screen Keyboard */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
              padding: '4px',
            }}
          >
            {alphabet.map((letter) => {
              const guessed = guessedLetters.has(letter);
              return (
                <button
                  key={letter}
                  onClick={() => makeGuess(letter)}
                  disabled={guessed || status !== 'playing'}
                  className="brutalist-button"
                  style={{
                    padding: '8px 0',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    opacity: guessed ? 0.35 : 1,
                    textDecoration: guessed ? 'line-through' : 'none',
                    cursor: guessed || status !== 'playing' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>

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

export default Hangman;
