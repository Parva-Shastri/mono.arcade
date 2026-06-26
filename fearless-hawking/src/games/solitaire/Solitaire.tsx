import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'solitaire',
  title: 'Solitaire',
  description: 'Classic Klondike Solitaire. Build foundations from Ace to King.',
  instructions: [
    'Draw cards from the deck to the waste pile.',
    'Build foundations (top right) in ascending order by suit (A to K).',
    'Build tableau piles (bottom) in descending order with alternating color patterns.',
    'Move cards or stacks between tableau piles.',
  ],
};

interface SolitaireProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

interface Card {
  id: string;
  suit: '♠' | '♥' | '♦' | '♣';
  value: number; // 1 = A, 11 = J, 12 = Q, 13 = K
  isRed: boolean;
  faceUp: boolean;
}

const SUITS: Card['suit'][] = ['♠', '♥', '♦', '♣'];
const VALUES = Array.from({ length: 13 }, (_, i) => i + 1);

const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    VALUES.forEach((val) => {
      deck.push({
        id: `${suit}-${val}`,
        suit,
        value: val,
        isRed: suit === '♥' || suit === '♦',
        faceUp: false,
      });
    });
  });
  return deck;
};

const shuffle = (array: Card[]): Card[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const getCardName = (val: number): string => {
  if (val === 1) return 'A';
  if (val === 11) return 'J';
  if (val === 12) return 'Q';
  if (val === 13) return 'K';
  return String(val);
};

export const Solitaire: React.FC<SolitaireProps> = ({ onBack, record, onUpdateRecord }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau, setTableau] = useState<Card[][]>([[], [], [], [], [], [], []]);
  const [selectedCard, setSelectedCard] = useState<{ source: string; col?: number; idx?: number } | null>(null);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  const startNewGame = () => {
    audio.playClick();
    const newDeck = shuffle(generateDeck());
    const newTableau: Card[][] = Array.from({ length: 7 }, () => []);
    let deckIdx = 0;

    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = newDeck[deckIdx++];
        if (j === i) card.faceUp = true;
        newTableau[j].push(card);
      }
    }

    setDeck(newDeck.slice(deckIdx).map(c => ({ ...c, faceUp: false })));
    setWaste([]);
    setFoundations([[], [], [], []]);
    setTableau(newTableau);
    setSelectedCard(null);
    setStatus('playing');
    setIsAutoCompleting(false);
  };

  const checkGameOverState = (
    currentDeck: Card[],
    currentWaste: Card[],
    currentTableau: Card[][],
    currentFoundations: Card[][]
  ): boolean => {
    // 0. Ensure the game is fully initialized with all 52 cards
    const totalCards = currentDeck.length + currentWaste.length +
      currentTableau.reduce((acc, col) => acc + col.length, 0) +
      currentFoundations.reduce((acc, col) => acc + col.length, 0);
    if (totalCards !== 52) return false;

    // 1. Can we draw a card or recycle?
    if (currentDeck.length > 0) return false;
    if (currentWaste.length > 1) return false;

    // 2. Can we move any face-up card from tableau to another tableau?
    for (let srcCol = 0; srcCol < 7; srcCol++) {
      const srcCards = currentTableau[srcCol];
      if (srcCards.length === 0) continue;

      for (let srcIdx = 0; srcIdx < srcCards.length; srcIdx++) {
        const cardToMove = srcCards[srcIdx];
        if (!cardToMove.faceUp) continue;

        for (let destCol = 0; destCol < 7; destCol++) {
          if (srcCol === destCol) continue;

          const destCards = currentTableau[destCol];
          const destTop = destCards[destCards.length - 1];

          if (!destTop) {
            if (cardToMove.value === 13 && srcIdx > 0) {
              return false;
            }
          } else {
            if (destTop.isRed !== cardToMove.isRed && destTop.value === cardToMove.value + 1) {
              return false;
            }
          }
        }
      }
    }

    // 3. Can we move the top card of any tableau column to a foundation?
    for (let srcCol = 0; srcCol < 7; srcCol++) {
      const srcCards = currentTableau[srcCol];
      if (srcCards.length === 0) continue;
      const cardToMove = srcCards[srcCards.length - 1];

      for (let destCol = 0; destCol < 4; destCol++) {
        const destFound = currentFoundations[destCol];
        const destTop = destFound[destFound.length - 1];

        if (!destTop) {
          if (cardToMove.value === 1) return false;
        } else {
          if (destTop.suit === cardToMove.suit && destTop.value + 1 === cardToMove.value) return false;
        }
      }
    }

    // 4. Can we move the top card of the waste pile to any tableau or foundation?
    if (currentWaste.length > 0) {
      const cardToMove = currentWaste[currentWaste.length - 1];

      for (let destCol = 0; destCol < 7; destCol++) {
        const destCards = currentTableau[destCol];
        const destTop = destCards[destCards.length - 1];

        if (!destTop) {
          if (cardToMove.value === 13) return false;
        } else {
          if (destTop.isRed !== cardToMove.isRed && destTop.value === cardToMove.value + 1) return false;
        }
      }

      for (let destCol = 0; destCol < 4; destCol++) {
        const destFound = currentFoundations[destCol];
        const destTop = destFound[destFound.length - 1];

        if (!destTop) {
          if (cardToMove.value === 1) return false;
        } else {
          if (destTop.suit === cardToMove.suit && destTop.value + 1 === cardToMove.value) return false;
        }
      }
    }

    return true;
  };

  const autoCompleteStep = (): boolean => {
    // Try to find the next card that can be placed on foundations
    for (let fIdx = 0; fIdx < 4; fIdx++) {
      const destFound = foundations[fIdx];
      const nextValue = destFound.length + 1;
      const targetSuit = SUITS[fIdx];

      // 1. Check if it's in the waste pile (must be the top card)
      if (waste.length > 0) {
        const topWaste = waste[waste.length - 1];
        if (topWaste.suit === targetSuit && topWaste.value === nextValue) {
          setWaste(prev => prev.slice(0, -1));
          setFoundations(prev => {
            const next = [...prev];
            next[fIdx] = [...next[fIdx], topWaste];
            return next;
          });
          audio.playScore();
          return true;
        }
      }

      // 2. Check if it's the top card of any tableau column
      for (let tCol = 0; tCol < 7; tCol++) {
        const colCards = tableau[tCol];
        if (colCards.length > 0) {
          const topCard = colCards[colCards.length - 1];
          if (topCard.suit === targetSuit && topCard.value === nextValue) {
            setTableau(prev => {
              const next = [...prev];
              next[tCol] = next[tCol].slice(0, -1);
              if (next[tCol].length > 0) {
                next[tCol][next[tCol].length - 1].faceUp = true;
              }
              return next;
            });
            setFoundations(prev => {
              const next = [...prev];
              next[fIdx] = [...next[fIdx], topCard];
              return next;
            });
            audio.playScore();
            return true;
          }
        }
      }
    }

    // 3. If the next cards are in the deck/waste, draw or recycle
    if (deck.length > 0) {
      const nextCard = deck[deck.length - 1];
      nextCard.faceUp = true;
      setWaste(prev => [...prev, nextCard]);
      setDeck(prev => prev.slice(0, -1));
      audio.playClick();
      return true;
    } else if (waste.length > 1) {
      const reversed = [...waste].reverse().map(c => ({ ...c, faceUp: false }));
      setDeck(reversed);
      setWaste([]);
      audio.playClick();
      return true;
    }

    return false;
  };

  useEffect(() => {
    startNewGame();

  }, []);

  useEffect(() => {
    if (status !== 'playing') return;

    // Check if won
    const won = foundations.every(f => f.length === 13);
    if (won) {
      setIsAutoCompleting(false);
      return;
    }

    // Check if we should trigger auto-complete:
    // No face-down cards in tableau AND at least some cards remaining to be placed
    const hasFaceDownTableau = tableau.some(col => col.some(card => !card.faceUp));
    const hasTableauCards = tableau.some(col => col.length > 0);
    const hasWasteOrDeck = deck.length > 0 || waste.length > 0;

    if (!hasFaceDownTableau && (hasTableauCards || hasWasteOrDeck) && !isAutoCompleting) {
      setIsAutoCompleting(true);
      return;
    }

    // Check if lost (no moves left)
    const lost = checkGameOverState(deck, waste, tableau, foundations);
    if (lost && !isAutoCompleting) {
      setStatus('lost');
      audio.playLose();
      onUpdateRecord('solitaire', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, waste, tableau, foundations, status, isAutoCompleting]);

  useEffect(() => {
    if (!isAutoCompleting || status !== 'playing') return;

    const timer = setTimeout(() => {
      const moved = autoCompleteStep();
      if (!moved) {
        setIsAutoCompleting(false);
      }
    }, 150);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoCompleting, deck, waste, tableau, foundations, status]);

  const handleDrawCard = () => {
    if (status !== 'playing' || isAutoCompleting) return;
    audio.playClick();
    setSelectedCard(null);
    if (deck.length === 0) {
      if (waste.length === 0) return;
      const reversed = [...waste].reverse().map(c => ({ ...c, faceUp: false }));
      setDeck(reversed);
      setWaste([]);
    } else {
      const nextCard = deck[deck.length - 1];
      nextCard.faceUp = true;
      setWaste(prev => [...prev, nextCard]);
      setDeck(prev => prev.slice(0, -1));
    }
  };

  const handleCardClick = (source: string, col?: number, idx?: number) => {
    if (status !== 'playing' || isAutoCompleting) return;
    audio.playClick();

    if (selectedCard) {
      // Trying to make a move
      let cardToMove: Card | null = null;
      let movingStack: Card[] = [];

      if (selectedCard.source === 'waste' && waste.length > 0) {
        cardToMove = waste[waste.length - 1];
      } else if (selectedCard.source === 'tableau' && selectedCard.col !== undefined && selectedCard.idx !== undefined) {
        const colCards = tableau[selectedCard.col];
        movingStack = colCards.slice(selectedCard.idx);
        cardToMove = movingStack[0];
      }

      if (cardToMove) {
        // Destination check
        if (source === 'tableau' && col !== undefined) {
          const destCol = tableau[col];
          const destTopCard = destCol[destCol.length - 1];
          let valid;

          if (!destTopCard) {
            valid = cardToMove.value === 13; // King only
          } else {
            valid = destTopCard.isRed !== cardToMove.isRed && destTopCard.value === cardToMove.value + 1;
          }

          if (valid) {
            executeMove(selectedCard, 'tableau', col, movingStack.length > 0 ? movingStack : [cardToMove]);
            return;
          }
        } else if (source === 'foundation' && col !== undefined && movingStack.length <= 1) {
          const destFound = foundations[col];
          const destTopCard = destFound[destFound.length - 1];
          let valid;

          if (!destTopCard) {
            valid = cardToMove.value === 1; // Ace only
          } else {
            valid = destTopCard.suit === cardToMove.suit && destTopCard.value + 1 === cardToMove.value;
          }

          if (valid) {
            executeMove(selectedCard, 'foundation', col, [cardToMove]);
            return;
          }
        }
      }
      setSelectedCard(null);
    } else {
      // Selecting
      if (source === 'waste' && waste.length > 0) {
        setSelectedCard({ source });
      } else if (source === 'tableau' && col !== undefined && idx !== undefined) {
        const colCards = tableau[col];
        if (colCards[idx]?.faceUp) {
          setSelectedCard({ source, col, idx });
        }
      }
    }
  };

  const executeMove = (src: typeof selectedCard, destType: 'tableau' | 'foundation', destCol: number, cards: Card[]) => {
    if (!src) return;
    audio.playScore();

    // Remove cards from source
    if (src.source === 'waste') {
      setWaste(prev => prev.slice(0, -1));
    } else if (src.source === 'tableau' && src.col !== undefined) {
      setTableau(prev => {
        const next = [...prev];
        next[src.col!] = next[src.col!].slice(0, src.idx!);
        // Flip top card face up
        if (next[src.col!].length > 0) {
          next[src.col!][next[src.col!].length - 1].faceUp = true;
        }
        return next;
      });
    }

    // Add cards to destination
    if (destType === 'tableau') {
      setTableau(prev => {
        const next = [...prev];
        next[destCol] = [...next[destCol], ...cards];
        return next;
      });
    } else {
      setFoundations(prev => {
        const next = [...prev];
        next[destCol] = [...next[destCol], ...cards];
        return next;
      });
    }

    setSelectedCard(null);
    checkWinCondition();
  };

  const checkWinCondition = () => {
    setFoundations(prev => {
      const allDone = prev.every(f => f.length === 13);
      if (allDone) {
        setStatus('won');
        audio.playWin();
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
        onUpdateRecord('solitaire', {
          highScore: Math.max(record.highScore, 100),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
      }
      return prev;
    });
  };

  const handleSimulateWin = () => {
    setStatus('won');
    audio.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.75 } });
    onUpdateRecord('solitaire', {
      highScore: Math.max(record.highScore, 100),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    audio.playLose();
    onUpdateRecord('solitaire', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  return (
    <div data-testid="game-solitaire" style={{ width: '100%' }}>
      <GameWrapper
        title="Solitaire"
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={startNewGame}
        highScore={record.highScore}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Row: Deck, Waste, Foundations */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Deck */}
              <div
                onClick={handleDrawCard}
                className="brutalist-card"
                style={{
                  width: '50px',
                  height: '75px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: deck.length > 0 ? 'repeating-linear-gradient(45deg, var(--fg), var(--fg) 4px, var(--gray-mid) 4px, var(--gray-mid) 8px)' : 'var(--bg)',
                  border: '2px solid var(--border)',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                }}
              >
                {deck.length > 0 ? 'DECK' : '♻️'}
              </div>

              {/* Waste */}
              <div
                onClick={() => handleCardClick('waste')}
                className="brutalist-card"
                style={{
                  width: '50px',
                  height: '75px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: waste.length > 0 ? '2px solid var(--border)' : '2px dashed var(--border)',
                  background: waste.length > 0
                    ? selectedCard?.source === 'waste'
                      ? 'var(--gray-mid)'
                      : waste[waste.length - 1].isRed
                        ? 'var(--fg)'
                        : 'var(--bg)'
                    : 'var(--bg)',
                  position: 'relative',
                }}
              >
                {waste.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      color: waste[waste.length - 1].isRed
                        ? selectedCard?.source === 'waste' ? 'var(--fg)' : 'var(--bg)'
                        : 'var(--fg)',
                    }}
                  >
                    <span>{getCardName(waste[waste.length - 1].value)}</span>
                    <span>{waste[waste.length - 1].suit}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Foundations */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {foundations.map((foundCol, i) => {
                const hasCards = foundCol.length > 0;
                const topCard = hasCards ? foundCol[foundCol.length - 1] : null;
                const isRed = topCard?.isRed || false;
                return (
                  <div
                    key={i}
                    onClick={() => handleCardClick('foundation', i)}
                    className="brutalist-card"
                    style={{
                      width: '50px',
                      height: '75px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--border)',
                      background: hasCards
                        ? isRed
                          ? 'var(--fg)'
                          : 'var(--bg)'
                        : 'var(--bg)',
                    }}
                  >
                    {hasCards ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          color: isRed ? 'var(--bg)' : 'var(--fg)',
                        }}
                      >
                        <span>{getCardName(topCard!.value)}</span>
                        <span>{topCard!.suit}</span>
                      </div>
                    ) : (
                      <span style={{ opacity: 0.3, fontSize: '1.2rem' }}>[ {SUITS[i]} ]</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', minHeight: '200px' }}>
            {tableau.map((colCards, colIdx) => (
              <div
                key={colIdx}
                onClick={() => colCards.length === 0 && handleCardClick('tableau', colIdx, 0)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: colCards.length === 0 ? '2px dashed var(--border)' : 'none',
                  minHeight: '120px',
                  borderRadius: '4px',
                  position: 'relative',
                }}
              >
                {colCards.map((card, idx) => {
                  const isSelected = selectedCard?.source === 'tableau' && selectedCard.col === colIdx && selectedCard.idx === idx;
                  return (
                    <div
                      key={card.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick('tableau', colIdx, idx);
                      }}
                      className="brutalist-card"
                      style={{
                        width: '100%',
                        height: '65px',
                        marginTop: idx > 0 ? '-45px' : '0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--border)',
                        background: card.faceUp
                          ? isSelected
                            ? 'var(--gray-mid)'
                            : card.isRed
                              ? 'var(--fg)'
                              : 'var(--bg)'
                          : 'repeating-linear-gradient(45deg, var(--fg), var(--fg) 2px, var(--gray-light) 2px, var(--gray-light) 4px)',
                        cursor: 'pointer',
                        boxShadow: 'none',
                        zIndex: idx + 1,
                        position: 'relative',
                      }}
                    >
                      {card.faceUp && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: card.isRed
                              ? isSelected ? 'var(--fg)' : 'var(--bg)'
                              : 'var(--fg)',
                            lineHeight: '1',
                          }}
                        >
                          <span>{getCardName(card.value)}</span>
                          <span>{card.suit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Simulation Overlay States */}
          {status !== 'playing' && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <h3>{status === 'won' ? 'SOLITAIRE VICTORY!' : 'GAME OVER'}</h3>
              <button className="brutalist-button" onClick={startNewGame}>PLAY AGAIN</button>
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

export default Solitaire;
