import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import audio from '../utils/audio';

export const AudioToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(() => audio.getMuted());

  const handleToggle = () => {
    const nextMuted = !isMuted;
    audio.setMute(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted) {
      audio.playClick();
    }
  };

  return (
    <button
      data-testid="audio-toggle"
      onClick={handleToggle}
      className="brutalist-button"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '0.85rem',
        padding: '6px 12px',
      }}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? (
        <>
          <VolumeX size={16} />
          <span>MUTED</span>
        </>
      ) : (
        <>
          <Volume2 size={16} />
          <span>SOUNDS</span>
        </>
      )}
    </button>
  );
};

export default AudioToggle;
