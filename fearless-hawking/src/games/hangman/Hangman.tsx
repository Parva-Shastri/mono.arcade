import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'hangman',
  title: 'Hangman',
  description: 'Guess the hidden retro word letter by letter before the gallows is complete.',
  instructions: [
    'Choose letters from the on-screen keyboard to guess the secret word.',
    'Each incorrect guess adds another part to the gallows drawing.',
    'Guess the entire word correctly to win.',
    'You have 6 incorrect guesses allowed before the game is lost.',
  ],
};

interface HangmanProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const WORDS = ['REACT', 'TYPESCRIPT', 'VITE', 'MONOCHROME', 'PIXEL', 'CABINET', 'RETRO', 'COMPILER', 'PUPPETEER', 'ARCADE'];

export const Hangman: React.FC<HangmanProps> = ({ onBack, record, onUpdateRecord }) => {
  const [word, setWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const startNewGame = () => {
    audio.playClick();
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(randomWord);
    setGuessedLetters(new Set());
    setStatus('playing');
  };

  useEffect(() => {
    startNewGame();

  }, []);

  const getIncorrectGuesses = () => {
    let count = 0;
    guessedLetters.forEach(letter => {
      if (!word.includes(letter)) count++;
    });
    return count;
  };

  const handleGuess = (letter: string) => {
    if (status !== 'playing' || guessedLetters.has(letter)) return;
    audio.playClick();

    const newGuesses = new Set(guessedLetters);
    newGuesses.add(letter);
    setGuessedLetters(newGuesses);

    // Check progress
    const isCorrect = word.includes(letter);
    if (isCorrect) {
      audio.playScore();
      // Check if all letters guessed
      const allGuessed = [...word].every(char => newGuesses.has(char));
      if (allGuessed) {
        setStatus('won');
        audio.playWin();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
        onUpdateRecord('hangman', {
          highScore: Math.max(record.highScore, word.length * 10),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
      }
    } else {
      audio.playMerge();
      const incorrectCount = [...newGuesses].filter(l => !word.includes(l)).length;
      if (incorrectCount >= 6) {
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

  const handleSimulateWin = () => {
    setStatus('won');
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    onUpdateRecord('hangman', {
      highScore: Math.max(record.highScore, 100),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('hangman', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  const incorrect = getIncorrectGuesses();

  return (
    <div data-testid="game-hangman" style={{ width: '100%' }}>
      <GameWrapper
        title="Hangman"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={startNewGame}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Gallows visual representation using SVG */}
          <svg width="150" height="150" style={{ border: '2px solid var(--border)', background: 'var(--bg)' }}>
            {/* Base */}
            {incorrect >= 0 && <line x1="20" y1="130" x2="130" y2="130" stroke="var(--fg)" strokeWidth="4" />}
            {/* Post */}
            {incorrect >= 1 && <line x1="40" y1="130" x2="40" y2="20" stroke="var(--fg)" strokeWidth="4" />}
            {/* Beam */}
            {incorrect >= 2 && <line x1="40" y1="20" x2="100" y2="20" stroke="var(--fg)" strokeWidth="4" />}
            {/* Rope */}
            {incorrect >= 3 && <line x1="100" y1="20" x2="100" y2="45" stroke="var(--fg)" strokeWidth="2" />}
            {/* Head */}
            {incorrect >= 4 && <circle cx="100" cy="55" r="10" stroke="var(--fg)" strokeWidth="2" fill="none" />}
            {/* Body & Arms & Legs */}
            {incorrect >= 5 && (
              <>
                <line x1="100" y1="65" x2="100" y2="100" stroke="var(--fg)" strokeWidth="2" />
                <line x1="100" y1="75" x2="85" y2="85" stroke="var(--fg)" strokeWidth="2" />
                <line x1="100" y1="75" x2="115" y2="85" stroke="var(--fg)" strokeWidth="2" />
              </>
            )}
            {incorrect >= 6 && (
              <>
                <line x1="100" y1="100" x2="85" y2="120" stroke="var(--fg)" strokeWidth="2" />
                <line x1="100" y1="100" x2="115" y2="120" stroke="var(--fg)" strokeWidth="2" />
              </>
            )}
          </svg>

          {/* Word representation */}
          <div style={{ display: 'flex', gap: '8px', fontSize: '1.5rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
            {word.split('').map((char, index) => {
              const revealed = guessedLetters.has(char) || status !== 'playing';
              return (
                <span key={index} style={{ borderBottom: '3px solid var(--border)', minWidth: '20px', textAlign: 'center' }}>
                  {revealed ? char : ' '}
                </span>
              );
            })}
          </div>

          {/* Virtual Keyboard */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '380px', justifyContent: 'center' }}>
            {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(char => {
              const guessed = guessedLetters.has(char);
              return (
                <button
                  key={char}
                  disabled={guessed || status !== 'playing'}
                  onClick={() => handleGuess(char)}
                  className="brutalist-button"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                    opacity: guessed ? 0.3 : 1,
                    textDecoration: guessed ? 'line-through' : 'none',
                    minWidth: '34px',
                    boxShadow: 'none',
                  }}
                >
                  {char}
                </button>
              );
            })}
          </div>

          {/* Game Over Message Overlay */}
          {status !== 'playing' && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>
                {status === 'won' ? 'CORRECT GUESS!' : 'OUT OF ATTEMPTS!'}
              </h3>
              {status === 'lost' && <p style={{ fontSize: '0.8rem' }}>THE WORD WAS: {word}</p>}
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

export default Hangman;
