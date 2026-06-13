import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'wordle',
  title: 'Wordle Clone',
  description: 'Guess the hidden five-letter word in six attempts.',
  instructions: [
    'Type a five-letter word and submit.',
    'Green letters are correct and in the right spot.',
    'Yellow letters are correct but in the wrong spot.',
    'Gray letters are not in the word.',
  ],
};

interface WordleProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

const WORDS = ['PIXEL', 'BOARD', 'MATCH', 'LEVEL', 'CLONE', 'GAMES', 'SNAKE', 'PONG', 'MAZE', 'BRICK', 'TETRIS', 'SCORE', 'TIGHT', 'LIGHT'];
const VALID_WORDS = WORDS.filter(w => w.length === 5);

export const Wordle: React.FC<WordleProps> = ({ onBack, record, onUpdateRecord }) => {
  const [targetWord, setTargetWord] = useState<string>(() => getRandomWord());
  const [guesses, setGuesses] = useState<string[]>(Array(6).fill(''));
  const [currentGuessIdx, setCurrentGuessIdx] = useState<number>(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [message, setMessage] = useState<string>('');

  function getRandomWord() {
    const word = VALID_WORDS[Math.floor(Math.random() * VALID_WORDS.length)];
    return word || 'PIXEL';
  }

  const handleKeyPress = (char: string) => {
    if (status !== 'playing') return;
    const currentGuess = guesses[currentGuessIdx];

    if (char === 'ENTER') {
      if (currentGuess.length < 5) {
        setMessage('WORD TOO SHORT');
        setTimeout(() => setMessage(''), 1500);
        return;
      }

      // Check if correct
      const isCorrect = currentGuess === targetWord;
      const nextGuesses = [...guesses];
      nextGuesses[currentGuessIdx] = currentGuess;
      setGuesses(nextGuesses);

      if (isCorrect) {
        setStatus('won');
        audio.playWin();
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.75 },
          colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
        });
        onUpdateRecord('wordle', {
          highScore: Math.max(record.highScore, record.highScore + 15),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
      } else if (currentGuessIdx >= 5) {
        setStatus('lost');
        audio.playLose();
        setMessage(`WORD WAS: ${targetWord}`);
        onUpdateRecord('wordle', {
          highScore: record.highScore,
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon,
        });
      } else {
        audio.playScore();
        setCurrentGuessIdx(currentGuessIdx + 1);
      }
    } else if (char === 'BACKSPACE') {
      if (currentGuess.length > 0) {
        audio.playClick();
        const nextGuesses = [...guesses];
        nextGuesses[currentGuessIdx] = currentGuess.slice(0, -1);
        setGuesses(nextGuesses);
      }
    } else {
      if (currentGuess.length < 5) {
        audio.playClick();
        const nextGuesses = [...guesses];
        nextGuesses[currentGuessIdx] = currentGuess + char;
        setGuesses(nextGuesses);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      if (e.key === 'Enter') {
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACKSPACE');
      } else {
        const key = e.key.toUpperCase();
        if (key.length === 1 && key >= 'A' && key <= 'Z') {
          handleKeyPress(key);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guesses, currentGuessIdx, status, targetWord]);

  const handleReset = () => {
    setTargetWord(getRandomWord());
    setGuesses(Array(6).fill(''));
    setCurrentGuessIdx(0);
    setStatus('playing');
    setMessage('');
  };

  const handleSimulateWin = () => {
    const nextGuesses = [...guesses];
    nextGuesses[currentGuessIdx] = targetWord;
    setGuesses(nextGuesses);
    setStatus('won');
    audio.playWin();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
    });
    onUpdateRecord('wordle', {
      highScore: Math.max(record.highScore, record.highScore + 15),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    const nextGuesses = guesses.map((g, i) => (i < 6 ? 'WRONG' : g));
    setGuesses(nextGuesses);
    setStatus('lost');
    audio.playLose();
    setMessage(`WORD WAS: ${targetWord}`);
    onUpdateRecord('wordle', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  const getTileState = (rowIdx: number, colIdx: number, char: string) => {
    if (rowIdx >= currentGuessIdx && status === 'playing') {
      return char ? 'tbd' : 'empty';
    }
    const guess = guesses[rowIdx];
    if (!guess) return 'empty';

    if (targetWord[colIdx] === char) {
      return 'correct';
    }
    if (targetWord.includes(char)) {
      // Basic Wordle letter evaluation logic
      const targetLetters = targetWord.split('');
      const guessLetters = guess.split('');
      
      let targetCount = targetLetters.filter(c => c === char).length;
      let correctCount = 0;
      for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === char && targetLetters[i] === char) {
          correctCount++;
        }
      }

      let precedingPresentCount = 0;
      for (let i = 0; i < colIdx; i++) {
        if (guessLetters[i] === char) {
          if (targetLetters[i] !== char) {
            precedingPresentCount++;
          }
        }
      }

      if (precedingPresentCount < targetCount - correctCount) {
        return 'present';
      }
    }
    return 'absent';
  };

  const getTileStyles = (state: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '100%',
      aspectRatio: '1',
      border: '2px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      userSelect: 'none',
      transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
    };
    switch (state) {
      case 'correct':
        return {
          ...base,
          backgroundColor: 'var(--fg)',
          color: 'var(--bg)',
          border: '2px solid var(--border)',
        };
      case 'present':
        return {
          ...base,
          backgroundColor: 'var(--gray-mid)',
          color: 'var(--fg)',
          border: '2px solid var(--border)',
        };
      case 'absent':
        return {
          ...base,
          backgroundColor: 'var(--gray-light)',
          color: 'var(--gray-dark)',
          border: '2px solid var(--gray-mid)',
        };
      case 'tbd':
        return {
          ...base,
          border: '3px solid var(--border)',
        };
      default:
        return base;
    }
  };

  const getKeyStyle = (char: string): React.CSSProperties => {
    let bestState = 'empty';
    for (let r = 0; r < currentGuessIdx; r++) {
      const g = guesses[r];
      if (!g) continue;
      for (let c = 0; c < 5; c++) {
        if (g[c] === char) {
          const state = getTileState(r, c, char);
          if (state === 'correct') {
            bestState = 'correct';
          } else if (state === 'present' && bestState !== 'correct') {
            bestState = 'present';
          } else if (state === 'absent' && bestState === 'empty') {
            bestState = 'absent';
          }
        }
      }
    }

    const base: React.CSSProperties = {
      padding: '8px 4px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      border: '2px solid var(--border)',
      borderRadius: '2px',
      cursor: 'pointer',
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      backgroundColor: 'var(--bg)',
      color: 'var(--fg)',
      userSelect: 'none',
    };

    if (bestState === 'correct') {
      return { ...base, backgroundColor: 'var(--fg)', color: 'var(--bg)' };
    }
    if (bestState === 'present') {
      return { ...base, backgroundColor: 'var(--gray-mid)', color: 'var(--fg)' };
    }
    if (bestState === 'absent') {
      return { ...base, backgroundColor: 'var(--gray-light)', color: 'var(--gray-dark)', borderColor: 'var(--gray-mid)' };
    }
    return base;
  };

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  return (
    <div data-testid="game-wordle" style={{ width: '100%' }}>
      <GameWrapper
        title={metadata.title}
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="HIGH SCORE"
      >
        <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
          {/* Status Panel */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '2px solid var(--border)',
              padding: '10px 16px',
              backgroundColor: 'var(--gray-light)',
              marginBottom: '16px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
            }}
          >
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>ATTEMPTS</span>
              <span>{Math.min(6, currentGuessIdx + 1)} / 6</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span data-testid="wordle-status-text">{status}</span>
            </div>
          </div>

          {/* Alert Message Box */}
          {message && (
            <div
              data-testid="wordle-message"
              style={{
                textAlign: 'center',
                padding: '8px',
                border: '2px solid var(--border)',
                marginBottom: '12px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                backgroundColor: 'var(--bg)',
                animation: 'boot-flicker 0.2s ease-in-out',
              }}
            >
              {message}
            </div>
          )}

          {/* Word Grid */}
          <div
            data-testid="wordle-grid"
            style={{
              display: 'grid',
              gridTemplateRows: 'repeat(6, 1fr)',
              gap: '6px',
              marginBottom: '20px',
            }}
          >
            {guesses.map((guess, rIdx) => (
              <div
                key={rIdx}
                data-testid={`wordle-row-${rIdx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '6px',
                }}
              >
                {Array(5).fill(null).map((_, cIdx) => {
                  const char = guess[cIdx] || '';
                  const tileState = getTileState(rIdx, cIdx, char);
                  return (
                    <div
                      key={cIdx}
                      data-testid={`wordle-tile-${rIdx}-${cIdx}`}
                      data-char={char}
                      data-state={tileState}
                      style={getTileStyles(tileState)}
                    >
                      {char}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* On-Screen Keyboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {keyboardRows.map((row, rIdx) => (
              <div key={rIdx} style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                {row.map(char => (
                  <button
                    key={char}
                    data-testid={`wordle-key-${char}`}
                    onClick={() => handleKeyPress(char)}
                    style={{
                      ...getKeyStyle(char),
                      flexGrow: char === 'ENTER' || char === 'BACKSPACE' ? 1.5 : 1,
                      minWidth: char === 'ENTER' || char === 'BACKSPACE' ? '50px' : '26px',
                    }}
                  >
                    {char === 'BACKSPACE' ? '⌫' : char}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Hidden simulation triggers for E2E tests */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '15px' }}>
            <button onClick={handleSimulateWin} className="brutalist-button" style={{ display: 'none' }}>
              Simulate Win
            </button>
            <button onClick={handleSimulateLoss} className="brutalist-button" style={{ display: 'none' }}>
              Simulate Loss
            </button>
          </div>
        </div>
      </GameWrapper>
    </div>
  );
};

export default Wordle;
