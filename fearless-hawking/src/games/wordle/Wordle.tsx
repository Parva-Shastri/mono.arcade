import React, { useState } from 'react';
import GameWrapper from '../../components/GameWrapper';
import type { GameMetadata, ScoreRecord, GameId } from '../../types';

export const metadata: GameMetadata = {
  id: 'wordle',
  title: 'Wordle',
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

export const Wordle: React.FC<WordleProps> = ({ onBack, record, onUpdateRecord }) => {
  const [dummyState, setDummyState] = useState(0);

  const handleReset = () => {
    setDummyState(0);
  };

  const handleSimulateWin = () => {
    const nextWon = record.gamesWon + 1;
    const nextPlayed = record.gamesPlayed + 1;
    onUpdateRecord('wordle', {
      highScore: Math.max(record.highScore, record.highScore + 20),
      gamesPlayed: nextPlayed,
      gamesWon: nextWon,
    });
  };

  const handleSimulateLoss = () => {
    onUpdateRecord('wordle', {
      highScore: record.highScore,
      gamesPlayed: record.gamesPlayed + 1,
      gamesWon: record.gamesWon,
    });
  };

  return (
    <div data-testid="game-wordle" style={{ width: '100%' }}>
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
              Simulate Win (+20 Score)
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

export default Wordle;
