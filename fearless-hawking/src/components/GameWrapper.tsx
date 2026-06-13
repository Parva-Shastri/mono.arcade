import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, RotateCcw } from 'lucide-react';
import AudioToggle from './AudioToggle';
import audio from '../utils/audio';

interface GameWrapperProps {
  title: string;
  instructions: string[];
  onBack: () => void;
  onReset?: () => void;
  highScore?: number;
  highScoreLabel?: string;
  children: React.ReactNode;
}

export const GameWrapper: React.FC<GameWrapperProps> = ({
  title,
  instructions,
  onBack,
  onReset,
  highScore = 0,
  highScoreLabel = 'HIGH SCORE',
  children,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleBack = () => {
    audio.playClick();
    onBack();
  };

  const handleToggleInstructions = () => {
    audio.playClick();
    setShowInstructions(!showInstructions);
  };

  const handleReset = () => {
    audio.playClick();
    if (onReset) onReset();
  };

  return (
    <div data-testid="game-wrapper" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 10px' }}>
      {/* Header Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          data-testid="game-back-btn"
          onClick={handleBack}
          className="brutalist-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            fontSize: '0.85rem',
          }}
        >
          <ArrowLeft size={16} /> BACK
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="game-info-btn"
            onClick={handleToggleInstructions}
            className="brutalist-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              fontSize: '0.85rem',
            }}
          >
            <HelpCircle size={16} /> INFO
          </button>
          <AudioToggle />
        </div>
      </div>

      {/* Main Console Box */}
      <div className="brutalist-card" style={{ position: 'relative', overflow: 'visible' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '3px solid var(--border)',
            paddingBottom: '12px',
            marginBottom: '20px',
          }}
        >
          <h2 data-testid="game-title" style={{ fontSize: '1.4rem', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
            {title}
          </h2>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '0.7rem',
                display: 'block',
                color: 'var(--gray-dark)',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
              }}
            >
              {highScoreLabel}
            </span>
            <span data-testid="game-high-score" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{highScore}</span>
          </div>
        </div>

        {/* Collapsible Instruction Card */}
        {showInstructions && (
          <div
            data-testid="game-instructions"
            className="brutalist-card"
            style={{
              marginBottom: '20px',
              backgroundColor: 'var(--gray-light)',
              boxShadow: '4px 4px 0 0 var(--border)',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '1rem', marginBottom: '8px', textTransform: 'uppercase' }}>
              How to Play
            </h3>
            <ol style={{ paddingLeft: '18px', fontSize: '0.85rem', lineHeight: '1.4' }}>
              {instructions.map((step, idx) => (
                <li data-testid={`game-instruction-step-${idx}`} key={idx} style={{ marginBottom: '6px' }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Core Gameplay Canvas */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
          }}
        >
          {children}
        </div>

        {/* Global Reset Action */}
        {onReset && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '24px',
              borderTop: '2px solid var(--border)',
              paddingTop: '16px',
            }}
          >
            <button
              data-testid="game-reset-btn"
              onClick={handleReset}
              className="brutalist-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '0.85rem',
              }}
            >
              <RotateCcw size={14} /> RESET BOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameWrapper;
