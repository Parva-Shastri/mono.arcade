import React, { useState } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';

export const metadata: GameMetadata = {
  id: 'breakout',
  title: 'Breakout',
  description: 'Destroy all the bricks on the screen using a paddle and a bouncing ball.',
  instructions: [
    'Move the paddle left and right.',
    'Keep the ball from falling off the bottom of the screen.',
    'Destroy all the colored bricks to win.',
  ],
};

interface BreakoutProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

export const Breakout: React.FC<BreakoutProps> = ({ onBack, record, onUpdateRecord }) => {
  const [dummyState, setDummyState] = useState(0);

  const handleReset = () => {
    setDummyState(0);
  };

  const handleSimulateWin = () => {
    const nextWon = record.gamesWon + 1;
    const nextPlayed = record.gamesPlayed + 1;
    onUpdateRecord('breakout', {
      highScore: Math.max(record.highScore, record.highScore + 100),
      gamesPlayed: nextPlayed,
      gamesWon: nextWon,
    });
  };

  const handleSimulateLoss = () => {
    onUpdateRecord('breakout', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  return (
    <div data-testid="game-breakout" style={{ width: '100%' }}>
      <GameWrapper
        title={metadata.title}
        instructions={metadata.instructions}
        onBack={onBack}
        onReset={handleReset}
        highScore={record.highScore}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ marginBottom: '10px' }}>{metadata.description}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '15px' }}>
            <button onClick={handleSimulateWin} className="brutalist-button" style={{ padding: '8px 16px' }}>
              Simulate Win (+100 Score)
            </button>
            <button onClick={handleSimulateLoss} className="brutalist-button" style={{ padding: '8px 16px' }}>
              Simulate Loss
            </button>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--gray-dark)' }}>
            Played: {record.gamesPlayed} | Won: {record.gamesWon} | State: {dummyState}
          </div>
        </div>
      </GameWrapper>
    </div>
  );
};

export default Breakout;
