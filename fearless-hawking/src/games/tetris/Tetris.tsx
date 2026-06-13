import React, { useState } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';

export const metadata: GameMetadata = {
  id: 'tetris',
  title: 'Tetris',
  description: 'Rotate and fit falling blocks to clear lines.',
  instructions: [
    'Use arrow keys to move and rotate the falling blocks.',
    'Form complete horizontal lines to clear them and score points.',
    'Do not let the blocks reach the top of the grid.',
  ],
};

interface TetrisProps {
  onBack: () => void;
  record: ScoreRecord;
  onUpdateRecord: (id: GameId, record: ScoreRecord) => void;
}

export const Tetris: React.FC<TetrisProps> = ({ onBack, record, onUpdateRecord }) => {
  const [dummyState, setDummyState] = useState(0);

  const handleReset = () => {
    setDummyState(0);
  };

  const handleSimulateWin = () => {
    const nextWon = record.gamesWon + 1;
    const nextPlayed = record.gamesPlayed + 1;
    onUpdateRecord('tetris', {
      highScore: Math.max(record.highScore, record.highScore + 200),
      gamesPlayed: nextPlayed,
      gamesWon: nextWon,
    });
  };

  const handleSimulateLoss = () => {
    onUpdateRecord('tetris', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  return (
    <div data-testid="game-tetris" style={{ width: '100%' }}>
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
              Simulate Win (+200 Score)
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

export default Tetris;
