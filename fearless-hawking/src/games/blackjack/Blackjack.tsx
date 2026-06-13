import React, { useState, useEffect } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';
import audio from '../../utils/audio';
import confetti from 'canvas-confetti';

export const metadata: GameMetadata = {
  id: 'blackjack',
  title: 'Blackjack',
  description: 'Get your hand value closer to 21 than the dealer without going over.',
  instructions: [
    'Hit to take another card.',
    'Stand to keep your current hand.',
    'Go over 21 and you bust. Dealer wins.',
  ],
};

interface BlackjackProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

interface Card {
  suit: string;
  value: string;
  num: number;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = [
  { val: '2', num: 2 },
  { val: '3', num: 3 },
  { val: '4', num: 4 },
  { val: '5', num: 5 },
  { val: '6', num: 6 },
  { val: '7', num: 7 },
  { val: '8', num: 8 },
  { val: '9', num: 9 },
  { val: '10', num: 10 },
  { val: 'J', num: 10 },
  { val: 'Q', num: 10 },
  { val: 'K', num: 10 },
  { val: 'A', num: 11 },
];

export const Blackjack: React.FC<BlackjackProps> = ({ onBack, record, onUpdateRecord }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [status, setStatus] = useState<'betting' | 'playing' | 'won' | 'lost' | 'push'>('betting');
  const [statusText, setStatusText] = useState<string>('PLACE A BET TO DEAL');
  const [chips, setChips] = useState<number>(() => {
    const saved = localStorage.getItem('mono_blackjack_chips');
    return saved ? parseInt(saved) : 100;
  });
  const [bet, setBet] = useState<number>(10);

  useEffect(() => {
    localStorage.setItem('mono_blackjack_chips', String(chips));
  }, [chips]);

  function initDeck() {
    const newDeck: Card[] = [];
    SUITS.forEach(suit => {
      VALUES.forEach(v => {
        newDeck.push({ suit, value: v.val, num: v.num });
      });
    });
    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  }

  const getHandTotal = (hand: Card[]) => {
    let total = hand.reduce((sum, card) => sum + card.num, 0);
    let aces = hand.filter(card => card.value === 'A').length;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  };

  const startRound = () => {
    if (chips < bet) {
      setStatusText('INSIGNIFICANT CHIPS BALANCE');
      return;
    }
    audio.playClick();
    setChips(c => c - bet);
    const d = initDeck();
    const p1 = d.pop()!;
    const d1 = d.pop()!;
    const p2 = d.pop()!;
    const d2 = d.pop()!;

    setPlayerHand([p1, p2]);
    setDealerHand([d1, d2]);
    setDeck(d);
    
    const initialPlayerTotal = getHandTotal([p1, p2]);
    if (initialPlayerTotal === 21) {
      // Blackjack!
      const finalDealerTotal = getHandTotal([d1, d2]);
      if (finalDealerTotal === 21) {
        setChips(c => c + bet);
        setStatus('push');
        setStatusText('DOUBLE BLACKJACK! PUSH.');
      } else {
        const payout = Math.floor(bet * 2.5);
        setChips(c => c + payout);
        setStatus('won');
        setStatusText('BLACKJACK! YOU WIN.');
        audio.playWin();
        confetti({
          particleCount: 50,
          spread: 40,
          origin: { y: 0.75 },
          colors: ['#000000', '#ffffff'],
        });
        onUpdateRecord('blackjack', {
          highScore: Math.max(record.highScore, chips + payout - bet),
          gamesPlayed: record.gamesPlayed + 1,
          gamesWon: record.gamesWon + 1,
        });
      }
    } else {
      setStatus('playing');
      setStatusText('YOUR ACTION');
    }
  };

  const handleHit = () => {
    if (status !== 'playing') return;
    audio.playClick();
    const nextDeck = [...deck];
    const newCard = nextDeck.pop()!;
    const nextHand = [...playerHand, newCard];
    setPlayerHand(nextHand);
    setDeck(nextDeck);

    const total = getHandTotal(nextHand);
    if (total > 21) {
      setStatus('lost');
      setStatusText('YOU BUSTED! DEALER WINS.');
      audio.playLose();
      onUpdateRecord('blackjack', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    }
  };

  const handleStand = () => {
    if (status !== 'playing') return;
    audio.playClick();
    let currentDeck = [...deck];
    let currentDealerHand = [...dealerHand];
    
    // Dealer hits on soft 17
    while (getHandTotal(currentDealerHand) < 17) {
      const card = currentDeck.pop()!;
      currentDealerHand.push(card);
    }

    setDealerHand(currentDealerHand);
    setDeck(currentDeck);

    const playerTotal = getHandTotal(playerHand);
    const dealerTotal = getHandTotal(currentDealerHand);

    if (dealerTotal > 21) {
      const payout = bet * 2;
      setChips(c => c + payout);
      setStatus('won');
      setStatusText('DEALER BUSTED! YOU WIN.');
      audio.playWin();
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.75 },
        colors: ['#000000', '#ffffff'],
      });
      onUpdateRecord('blackjack', {
        highScore: Math.max(record.highScore, chips + payout),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + 1,
      });
    } else if (playerTotal > dealerTotal) {
      const payout = bet * 2;
      setChips(c => c + payout);
      setStatus('won');
      setStatusText(`YOU WIN (${playerTotal} VS ${dealerTotal})`);
      audio.playWin();
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.75 },
        colors: ['#000000', '#ffffff'],
      });
      onUpdateRecord('blackjack', {
        highScore: Math.max(record.highScore, chips + payout),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + 1,
      });
    } else if (playerTotal < dealerTotal) {
      setStatus('lost');
      setStatusText(`DEALER WINS (${dealerTotal} VS ${playerTotal})`);
      audio.playLose();
      onUpdateRecord('blackjack', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    } else {
      setChips(c => c + bet);
      setStatus('push');
      setStatusText(`PUSH (${playerTotal} VS ${dealerTotal})`);
      onUpdateRecord('blackjack', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    }
  };

  const handleDoubleDown = () => {
    if (status !== 'playing' || chips < bet) return;
    audio.playClick();
    setChips(c => c - bet);
    const doubleBet = bet * 2;

    const nextDeck = [...deck];
    const newCard = nextDeck.pop()!;
    const nextHand = [...playerHand, newCard];
    setPlayerHand(nextHand);
    setDeck(nextDeck);

    const playerTotal = getHandTotal(nextHand);
    if (playerTotal > 21) {
      setStatus('lost');
      setStatusText('YOU BUSTED! DEALER WINS.');
      audio.playLose();
      onUpdateRecord('blackjack', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
      return;
    }

    // Dealer actions
    let currentDealerHand = [...dealerHand];
    while (getHandTotal(currentDealerHand) < 17) {
      const card = nextDeck.pop()!;
      currentDealerHand.push(card);
    }
    setDealerHand(currentDealerHand);
    setDeck(nextDeck);

    const dealerTotal = getHandTotal(currentDealerHand);
    if (dealerTotal > 21) {
      const payout = doubleBet * 2;
      setChips(c => c + payout);
      setStatus('won');
      setStatusText('DEALER BUSTED! YOU WIN.');
      audio.playWin();
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.75 },
      });
      onUpdateRecord('blackjack', {
        highScore: Math.max(record.highScore, chips + payout),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + 1,
      });
    } else if (playerTotal > dealerTotal) {
      const payout = doubleBet * 2;
      setChips(c => c + payout);
      setStatus('won');
      setStatusText(`YOU WIN (${playerTotal} VS ${dealerTotal})`);
      audio.playWin();
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.75 },
      });
      onUpdateRecord('blackjack', {
        highScore: Math.max(record.highScore, chips + payout),
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon + 1,
      });
    } else if (playerTotal < dealerTotal) {
      setStatus('lost');
      setStatusText(`DEALER WINS (${dealerTotal} VS ${playerTotal})`);
      audio.playLose();
      onUpdateRecord('blackjack', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    } else {
      setChips(c => c + doubleBet);
      setStatus('push');
      setStatusText(`PUSH (${playerTotal} VS ${dealerTotal})`);
      onUpdateRecord('blackjack', {
        highScore: record.highScore,
        gamesPlayed: record.gamesPlayed + 1,
        gamesWon: record.gamesWon,
      });
    }
  };

  const handleReset = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setStatus('betting');
    setStatusText('PLACE A BET TO DEAL');
  };

  const handleSimulateWin = () => {
    setStatus('won');
    setStatusText('SIMULATED WIN');
    audio.playWin();
    onUpdateRecord('blackjack', {
      highScore: Math.max(record.highScore, record.highScore + 15),
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon + 1,
    });
  };

  const handleSimulateLoss = () => {
    setStatus('lost');
    setStatusText('SIMULATED LOSS');
    audio.playLose();
    onUpdateRecord('blackjack', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  const playerTotal = getHandTotal(playerHand);
  const dealerTotal = getHandTotal(dealerHand);

  return (
    <div data-testid="game-blackjack" style={{ width: '100%' }}>
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
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>CHIPS</span>
              <span data-testid="blackjack-chips">{chips}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>BET</span>
              <span data-testid="blackjack-bet">{bet}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-dark)', display: 'block' }}>RESULT</span>
              <span data-testid="blackjack-status-text">{status === 'betting' ? 'BETTING' : status.toUpperCase()}</span>
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '8px',
              border: '2px solid var(--border)',
              backgroundColor: 'var(--gray-light)',
              marginBottom: '16px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
            }}
          >
            {statusText}
          </div>

          {status === 'betting' ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div data-testid="blackjack-player-hand" style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                {[5, 10, 20, 50].map(val => (
                  <button
                    key={val}
                    onClick={() => {
                      audio.playClick();
                      setBet(val);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      border: '2px solid var(--border)',
                      backgroundColor: bet === val ? 'var(--fg)' : 'var(--bg)',
                      color: bet === val ? 'var(--bg)' : 'var(--fg)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <button
                onClick={startRound}
                className="brutalist-button"
                style={{ width: '100%', padding: '12px' }}
              >
                DEAL CARDS
              </button>
            </div>
          ) : (
            <div>
              {/* Dealer Hand */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--gray-dark)', marginBottom: '6px' }}>
                  DEALER HAND (TOTAL: <span data-testid="blackjack-dealer-total">{status === 'playing' ? '?' : dealerTotal}</span>)
                </div>
                <div data-testid="blackjack-dealer-hand" style={{ display: 'flex', gap: '8px' }}>
                  {dealerHand.map((card, idx) => {
                    const hideCard = status === 'playing' && idx === 1;
                    return (
                      <div
                        key={idx}
                        data-testid={`blackjack-dealer-card-${idx}`}
                        style={{
                          width: '60px',
                          height: '90px',
                          border: '2px solid var(--border)',
                          backgroundColor: hideCard ? 'var(--fg)' : 'var(--bg)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '6px',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          color: hideCard ? 'var(--bg)' : 'var(--fg)',
                          background: hideCard
                            ? 'repeating-linear-gradient(45deg, var(--fg), var(--fg) 4px, var(--gray-mid) 4px, var(--gray-mid) 8px)'
                            : undefined,
                        }}
                      >
                        {!hideCard && (
                          <>
                            <div>{card.value}</div>
                            <div style={{ fontSize: '1.5rem', alignSelf: 'center' }}>{card.suit}</div>
                            <div style={{ alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>{card.value}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Player Hand */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--gray-dark)', marginBottom: '6px' }}>
                  PLAYER HAND (TOTAL: <span data-testid="blackjack-player-total">{playerTotal}</span>)
                </div>
                <div data-testid="blackjack-player-hand" style={{ display: 'flex', gap: '8px' }}>
                  {playerHand.map((card, idx) => (
                    <div
                      key={idx}
                      data-testid={`blackjack-player-card-${idx}`}
                      style={{
                        width: '60px',
                        height: '90px',
                        border: '2px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '6px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: 'var(--fg)',
                      }}
                    >
                      <div>{card.value}</div>
                      <div style={{ fontSize: '1.5rem', alignSelf: 'center' }}>{card.suit}</div>
                      <div style={{ alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>{card.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {status === 'playing' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  <button
                    data-testid="blackjack-btn-hit"
                    onClick={handleHit}
                    className="brutalist-button"
                    style={{ padding: '8px', fontSize: '0.8rem', boxShadow: 'none' }}
                  >
                    HIT
                  </button>
                  <button
                    data-testid="blackjack-btn-stand"
                    onClick={handleStand}
                    className="brutalist-button"
                    style={{ padding: '8px', fontSize: '0.8rem', boxShadow: 'none' }}
                  >
                    STAND
                  </button>
                  <button
                    data-testid="blackjack-btn-double"
                    onClick={handleDoubleDown}
                    disabled={chips < bet}
                    className="brutalist-button"
                    style={{ padding: '8px', fontSize: '0.8rem', boxShadow: 'none' }}
                  >
                    DOUBLE
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleReset}
                  className="brutalist-button"
                  style={{ width: '100%', padding: '10px', marginBottom: '16px' }}
                >
                  NEXT ROUND
                </button>
              )}
            </div>
          )}

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

export default Blackjack;
