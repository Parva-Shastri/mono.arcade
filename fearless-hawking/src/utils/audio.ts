class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Load mute preference from LocalStorage
    this.isMuted = localStorage.getItem('mono_games_muted') === 'true';
  }

  private initCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    localStorage.setItem('mono_games_muted', String(mute));
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', gainValue = 0.1) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
      // Clean exponential decay to prevent pops/clicks
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play audio tone:', e);
    }
  }

  playClick() {
    // Crisp high-pitched click/beep
    this.playTone(800, 0.05, 'triangle', 0.12);
  }

  playScore() {
    // Pleasant mid-tone blip
    this.playTone(523.25, 0.12, 'sine', 0.15); // C5
  }

  playMerge() {
    // Ascending pitch slide for 2048 cell merges
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, ctx.currentTime); // E4
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15); // E5

      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Failed to play merge tone:', e);
    }
  }

  playWin() {
    // Happy retro ascending arpeggio
    if (this.isMuted) return;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'square', 0.08);
      }, i * 100);
    });
  }

  playLose() {
    // Sad retro descending buzz
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Failed to play lose tone:', e);
    }
  }
}

export const audio = new AudioManager();
export default audio;
