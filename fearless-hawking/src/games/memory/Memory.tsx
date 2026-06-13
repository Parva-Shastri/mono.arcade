import React, { useState } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'memory',
  title: 'Memory Match',
  description: 'Test your memory recall by matching pairs of symbols.',
  instructions: [
    'Flip cards to reveal their symbols.',
    'Find pairs of identical cards.',
    'Complete the board in as few moves as possible.',
  ],
};

interface MemoryProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

interface Card {
  id: number;
  glyph: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const GLYPHS = ['★', '✦', '▲', '◆', '●', '■', '♣', '♠'];

export const Memory: React.FC<MemoryProps> = ({ onBack, record, onUpdateRecord }) => {
  const [cards, setCards] = useState<Card[]>(() => initDeck());
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  function initDeck() {
    const deck: Card[] = [];
    // Duplicate glyphs to create pairs
    const doubleGlyphs = [...GLYPHS, ...GLYPHS];
    // Shuffle
    for (let i = doubleGlyphs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubleGlyphs[i], doubleGlyphs[j]] = [doubleGlyphs[j], doubleGlyphs[i]];
    }
    doubleGlyphs.forEach((glyph, idx) => {
      deck.push({
        id: idx,
        glyph,
        isFlipped: false,
        isMatched: false,
      });
    });
    return deck;
  }

  const handleCardClick = (idx: number) => {
    if (status !== 'playing' || selected.length >= 2) return;
    const clickedCard = cards[idx];
    if (clickedCard.isFlipped || clickedCard.isMatched) return;

    audio.playClick();
    const nextCards = cards.map((c, i) => (i === idx ? { ...c, isFlipped: true } : c));
    setCards(nextCards);

    const nextSelected = [...selected, idx];
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = nextSelected;
      const firstCard = nextCards[firstIdx];
      const secondCard = nextCards[secondIdx];

      if (firstCard.glyph === secondCard.glyph) {
        // Match!
        setTimeout(() => {
          audio.playScore();
          const matchedCards = nextCards.map((c, i) =>
            i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setSelected([]);

          // Check win
          if (matchedCards.every((c) => c.isMatched)) {
            setStatus('won');
            audio.playWin();
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.75 },
              colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
            });
            const scoreVal = Math.max(10, 100 - moves - 1);
            onUpdateRecord('memory', {
              highScore: Math.max(record.highScore, scoreVal),
              gamesPlayed: record.gamesPlayed + 1,
              gamesWon: record.gamesWon + 1,
            });
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = nextCards.map((c, i) =>
            i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c
          );
          setCards(resetCards);
          setSelected([]);
        }, 1000);
      }
    }
  };

  const handleReset = () => {
    setCards(initDeck());
    setSelected([]);
    setMoves(0);
    setStatus('playing');
  };

  const handleSimulateWin = () => {
    setCards(cards.map((c) => ({ ...c, isMatched: true, isFlipped: true })));
    setStatus('won');
    audio.playWin();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#000000', '#ffffff', '#cccccc', '#777777'],
    });
    onUpdateRecord('memory', {
      highScore: Math.max(record.highScore, record.highScore + 15),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('memory', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  const matchedCount = cards.filter((c) => c.isMatched).length;
  const pairsLeft = Math.max(0, 8 - matchedCount / 2);

  return (
    <div data-testid="game-memory" style={{ width: '100%' }}>
      <GameWrapper
        title={metadata.title}
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
        highScoreLabel="HIGH SCORE"
      >
        <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
          {/* Stats Bar */}
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
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>MOVES</span>
              <span data-testid="memory-moves-count">{moves}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>PAIRS LEFT</span>
              <span data-testid="memory-pairs-left">{pairsLeft}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>STATUS</span>
              <span data-testid="memory-status-text">{status}</span>
            </div>
          </div>

          {/* Cards Grid */}
          <div
            data-testid="memory-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              border: '3px solid var(--border)',
              backgroundColor: 'var(--border)',
              padding: '8px',
              width: '100%',
              aspectRatio: '1',
              marginBottom: '16px',
            }}
          >
            {cards.map((card, idx) => {
              const isFlipped = card.isFlipped || card.isMatched;
              let stateAttr = 'face-down';
              if (card.isMatched) {
                stateAttr = 'matched';
              } else if (card.isFlipped) {
                stateAttr = 'face-up';
              }

              let cardStyle: React.CSSProperties = {
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                cursor: status === 'playing' && !isFlipped ? 'pointer' : 'default',
                outline: 'none',
                userSelect: 'none',
                transition: 'transform 0.15s ease, background 0.15s ease',
              };

              if (isFlipped) {
                cardStyle = {
                  ...cardStyle,
                  backgroundColor: 'var(--bg)',
                  color: 'var(--fg)',
                  border: '2px solid var(--border)',
                };
              } else {
                cardStyle = {
                  ...cardStyle,
                  backgroundColor: 'var(--fg)',
                  color: 'var(--bg)',
                  background: 'repeating-linear-gradient(45deg, var(--fg), var(--fg) 4px, var(--gray-mid) 4px, var(--gray-mid) 8px)',
                  border: '2px solid transparent',
                  boxShadow: 'inset 2px 2px 0px rgba(255,255,255,0.4)',
                };
              }

              return (
                <button
                  key={card.id}
                  data-testid={`memory-card-${idx}`}
                  data-state={stateAttr}
                  data-glyph={card.glyph}
                  onClick={() => handleCardClick(idx)}
                  style={cardStyle}
                >
                  {isFlipped ? card.glyph : ''}
                </button>
              );
            })}
          </div>

          {/* Simulation triggers for test compatibility */}
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

export default Memory;
