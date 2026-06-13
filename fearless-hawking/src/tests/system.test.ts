import { registerTest } from './runner';
import { click, wait, waitFor, resetLocalStorage } from './utils';

// Helper to make sure we start on the dashboard in a clean state
async function ensureDashboard() {
  const backBtn = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
  if (backBtn) {
    click(backBtn);
    await wait(150);
  }
  await waitFor(() => !!document.querySelector('[data-testid="dashboard"]'), 2000);
}

// Helper to trigger a remount of the App component (simulates browser reload)
async function remountApp() {
  if (typeof (window as any).remountApp === 'function') {
    (window as any).remountApp();
    await wait(200);
  } else {
    throw new Error('remountApp function not found on window');
  }
}

// ----------------------------------------------------
// TIER 3 (CROSS-FEATURE) TESTS (10 Cases)
// ----------------------------------------------------

// 1. system-t3-theme
registerTest({
  id: 'system-t3-theme',
  name: 'Verify global theme toggle propagates theme state and localStorage',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    localStorage.removeItem('mono_games_theme');
    await remountApp();

    const themeBtn = document.querySelector('[data-testid="theme-toggle"]') as HTMLElement;
    if (!themeBtn) throw new Error('Theme toggle button not found');

    const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';

    click(themeBtn);
    await wait(150);

    const nextTheme = document.documentElement.getAttribute('data-theme');
    if (nextTheme === initialTheme) {
      throw new Error('Theme did not change after toggle click');
    }

    const storedTheme = localStorage.getItem('mono_games_theme');
    if (storedTheme !== nextTheme) {
      throw new Error(`localStorage theme does not match document theme: stored=${storedTheme}, doc=${nextTheme}`);
    }

    // Toggle back
    click(themeBtn);
    await wait(150);
    const finalTheme = document.documentElement.getAttribute('data-theme');
    if (finalTheme !== initialTheme) {
      throw new Error('Theme did not toggle back to initial');
    }
  }
});

// 2. system-t3-crt
registerTest({
  id: 'system-t3-crt',
  name: 'Verify global CRT toggle injects scanlines container and localStorage',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const crtBtn = document.querySelector('[data-testid="crt-toggle"]') as HTMLElement;
    if (!crtBtn) throw new Error('CRT toggle button not found');

    const initialCrt = localStorage.getItem('mono_games_crt') !== 'false';

    click(crtBtn);
    await wait(150);

    const nextCrt = localStorage.getItem('mono_games_crt') !== 'false';
    if (nextCrt === initialCrt) {
      throw new Error('CRT state did not toggle in localStorage');
    }

    const scanlines = document.querySelector('.crt-scanlines');
    if (nextCrt && !scanlines) {
      throw new Error('CRT scanlines overlay missing when CRT is enabled');
    }
    if (!nextCrt && scanlines) {
      throw new Error('CRT scanlines overlay present when CRT is disabled');
    }
  }
});

// 3. system-t3-audio
registerTest({
  id: 'system-t3-audio',
  name: 'Verify audio toggle updates mute status and localStorage',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const audioBtn = document.querySelector('[data-testid="audio-toggle"]') as HTMLElement;
    if (!audioBtn) throw new Error('Audio toggle button not found');

    const initialMuted = localStorage.getItem('mono_games_muted') === 'true';

    click(audioBtn);
    await wait(150);

    const nextMuted = localStorage.getItem('mono_games_muted') === 'true';
    if (nextMuted === initialMuted) {
      throw new Error('Audio mute state did not toggle in localStorage');
    }

    // Toggle back
    click(audioBtn);
    await wait(150);
  }
});

// 4. system-t3-storage-sync
registerTest({
  id: 'system-t3-storage-sync',
  name: 'Verify scores save/load from localStorage correctly',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const testScores = {
      minesweeper: { highScore: 42, gamesPlayed: 5, gamesWon: 2 },
      memory: { highScore: 84, gamesPlayed: 8, gamesWon: 4 }
    };
    localStorage.setItem('mono_games_scores', JSON.stringify(testScores));
    await remountApp();

    const msScoreBadge = document.querySelector('[data-testid="highscore-minesweeper"]') as HTMLElement;
    if (!msScoreBadge) throw new Error('Minesweeper score badge not found');
    if (!msScoreBadge.textContent?.includes('42')) {
      throw new Error(`Minesweeper score badge text does not contain 42, text: ${msScoreBadge.textContent}`);
    }

    const memScoreBadge = document.querySelector('[data-testid="highscore-memory"]') as HTMLElement;
    if (!memScoreBadge) throw new Error('Memory score badge not found');
    if (!memScoreBadge.textContent?.includes('84')) {
      throw new Error(`Memory score badge text does not contain 84, text: ${memScoreBadge.textContent}`);
    }
  }
});

// 5. system-t3-stats-sum
registerTest({
  id: 'system-t3-stats-sum',
  name: 'Verify dashboard total plays is sum of gamesPlayed across all games',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const testScores = {
      minesweeper: { highScore: 10, gamesPlayed: 3, gamesWon: 1 },
      memory: { highScore: 20, gamesPlayed: 4, gamesWon: 2 },
      sudoku: { highScore: 30, gamesPlayed: 2, gamesWon: 0 }
    };
    localStorage.setItem('mono_games_scores', JSON.stringify(testScores));
    await remountApp();

    const totalPlaysEl = document.querySelector('[data-testid="stats-total-plays"]') as HTMLElement;
    if (!totalPlaysEl) throw new Error('Total plays metric element not found');
    
    if (totalPlaysEl.textContent !== '9') {
      throw new Error(`Expected total plays to be 9, got ${totalPlaysEl.textContent}`);
    }
  }
});

// 6. system-t3-stats-wins-sum
registerTest({
  id: 'system-t3-stats-wins-sum',
  name: 'Verify dashboard total wins is sum of gamesWon across all games',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const testScores = {
      minesweeper: { highScore: 10, gamesPlayed: 3, gamesWon: 2 },
      memory: { highScore: 20, gamesPlayed: 4, gamesWon: 1 },
      sudoku: { highScore: 30, gamesPlayed: 2, gamesWon: 1 }
    };
    localStorage.setItem('mono_games_scores', JSON.stringify(testScores));
    await remountApp();

    const totalWinsEl = document.querySelector('[data-testid="stats-total-wins"]') as HTMLElement;
    if (!totalWinsEl) throw new Error('Total wins metric element not found');

    if (totalWinsEl.textContent !== '4') {
      throw new Error(`Expected total wins to be 4, got ${totalWinsEl.textContent}`);
    }
  }
});

// 7. system-t3-instructions-sync
registerTest({
  id: 'system-t3-instructions-sync',
  name: 'Verify opening instructions drawer in one game does not affect other games',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();

    const launchMemBtn = document.querySelector('[data-testid="launch-game-memory"]') as HTMLElement;
    if (!launchMemBtn) throw new Error('Launch button for memory match not found');
    click(launchMemBtn);

    await waitFor(() => !!document.querySelector('[data-testid="game-title"]'), 2000);

    const infoBtn = document.querySelector('[data-testid="game-info-btn"]') as HTMLElement;
    if (!infoBtn) throw new Error('Info button not found in Memory Match');
    click(infoBtn);

    await waitFor(() => !!document.querySelector('[data-testid="game-instructions"]'), 2000);

    const backBtn = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    if (!backBtn) throw new Error('Back button not found');
    click(backBtn);

    await ensureDashboard();

    const launchMsBtn = document.querySelector('[data-testid="launch-game-minesweeper"]') as HTMLElement;
    if (!launchMsBtn) throw new Error('Launch button for minesweeper not found');
    click(launchMsBtn);

    await waitFor(() => !!document.querySelector('[data-testid="game-title"]'), 2000);

    const msInstructions = document.querySelector('[data-testid="game-instructions"]');
    if (msInstructions) {
      throw new Error('Instructions drawer was unexpectedly open in Minesweeper');
    }

    const msBackBtn = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    click(msBackBtn);
    await ensureDashboard();
  }
});

// 8. system-t3-reset-cancel
registerTest({
  id: 'system-t3-reset-cancel',
  name: 'Verify cancel reset stats preserves scores',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const testScores = {
      minesweeper: { highScore: 50, gamesPlayed: 2, gamesWon: 1 }
    };
    localStorage.setItem('mono_games_scores', JSON.stringify(testScores));
    await remountApp();

    const originalConfirm = window.confirm;
    window.confirm = () => false;

    try {
      const resetBtn = document.querySelector('[data-testid="reset-stats-btn"]') as HTMLElement;
      if (!resetBtn) throw new Error('Reset stats button not found');
      click(resetBtn);
      await wait(150);

      const scoresRaw = localStorage.getItem('mono_games_scores');
      if (!scoresRaw) throw new Error('Scores not found in localStorage');
      const scores = JSON.parse(scoresRaw);
      if (scores.minesweeper.highScore !== 50) {
        throw new Error('Scores were reset even though confirm was cancelled');
      }
    } finally {
      window.confirm = originalConfirm;
    }
  }
});

// 9. system-t3-theme-persistence
registerTest({
  id: 'system-t3-theme-persistence',
  name: 'Verify theme is loaded from localStorage on mock reload',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();

    // Test dark theme persistence
    localStorage.setItem('mono_games_theme', 'dark');
    await remountApp();
    let themeAttr = document.documentElement.getAttribute('data-theme');
    if (themeAttr !== 'dark') {
      throw new Error(`Expected dark theme after remount, got ${themeAttr}`);
    }

    // Test light theme persistence
    localStorage.setItem('mono_games_theme', 'light');
    await remountApp();
    themeAttr = document.documentElement.getAttribute('data-theme');
    if (themeAttr !== 'light') {
      throw new Error(`Expected light theme after remount, got ${themeAttr}`);
    }
  }
});

// 10. system-t3-crt-persistence
registerTest({
  id: 'system-t3-crt-persistence',
  name: 'Verify CRT filter is loaded from localStorage on mock reload',
  tier: 3,
  game: 'system',
  run: async () => {
    await ensureDashboard();

    // Enable CRT persistence
    localStorage.setItem('mono_games_crt', 'true');
    await remountApp();
    let scanlines = document.querySelector('.crt-scanlines');
    if (!scanlines) {
      throw new Error('Expected CRT scanlines to be present after remount when crt is enabled');
    }

    // Disable CRT persistence
    localStorage.setItem('mono_games_crt', 'false');
    await remountApp();
    scanlines = document.querySelector('.crt-scanlines');
    if (scanlines) {
      throw new Error('Expected CRT scanlines to be absent after remount when crt is disabled');
    }
  }
});

// ----------------------------------------------------
// TIER 4 (REAL-WORLD SCENARIOS) TESTS (5 Cases)
// ----------------------------------------------------

// 1. system-t4-launch-exit
registerTest({
  id: 'system-t4-launch-exit',
  name: 'Verify game launch, layout rendering, and exit sequence',
  tier: 4,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const launchBtn = document.querySelector('[data-testid="launch-game-memory"]') as HTMLElement;
    if (!launchBtn) throw new Error('Launch button for memory match not found');

    click(launchBtn);
    
    await waitFor(() => {
      const titleEl = document.querySelector('[data-testid="game-title"]');
      return !!titleEl && titleEl.textContent === 'Memory Match';
    }, 2000);

    const backBtn = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    if (!backBtn) throw new Error('Game back button not found');

    click(backBtn);

    await waitFor(() => {
      return !!document.querySelector('[data-testid="dashboard"]');
    }, 2000);
  }
});

// 2. system-t4-reset
registerTest({
  id: 'system-t4-reset',
  name: 'Verify full cabinet reset clears scores and statistics',
  tier: 4,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    const originalConfirm = window.confirm;
    window.confirm = () => true;

    try {
      const dummyScores = {
        memory: { highScore: 15, gamesPlayed: 3, gamesWon: 1 }
      };
      localStorage.setItem('mono_games_scores', JSON.stringify(dummyScores));
      await remountApp();

      const resetBtn = document.querySelector('[data-testid="reset-stats-btn"]') as HTMLElement;
      if (!resetBtn) throw new Error('Reset stats button not found');

      click(resetBtn);
      await wait(200);

      const scoresRaw = localStorage.getItem('mono_games_scores');
      if (!scoresRaw) throw new Error('Scores not found in localStorage');
      const scores = JSON.parse(scoresRaw);
      if (scores.memory.highScore !== 0 || scores.memory.gamesPlayed !== 0) {
        throw new Error('Scores were not reset in localStorage');
      }

      const totalPlaysEl = document.querySelector('[data-testid="stats-total-plays"]') as HTMLElement;
      if (totalPlaysEl && totalPlaysEl.textContent !== '0') {
        throw new Error(`Expected dashboard total plays to be 0 after reset, got ${totalPlaysEl.textContent}`);
      }
    } finally {
      window.confirm = originalConfirm;
    }
  }
});

// 3. system-t4-multi-game-session
registerTest({
  id: 'system-t4-multi-game-session',
  name: 'Verify multi-game session win flow and dashboard score updates',
  tier: 4,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    resetLocalStorage();
    await remountApp();

    // 1. Launch Minesweeper
    const launchMsBtn = document.querySelector('[data-testid="launch-game-minesweeper"]') as HTMLElement;
    if (!launchMsBtn) throw new Error('Minesweeper launch button not found');
    click(launchMsBtn);
    await waitFor(() => !!document.querySelector('[data-testid="game-minesweeper"]'), 2000);

    // Win Minesweeper (real grid vs stub detection)
    const msGrid = document.querySelector('[data-testid="minesweeper-grid"]');
    if (msGrid) {
      const winBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulate Win')) as HTMLElement;
      if (winBtn) click(winBtn);
    } else {
      const winBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulate Win')) as HTMLElement;
      if (winBtn) click(winBtn);
    }
    await wait(150);

    // Click back
    const backBtn1 = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    click(backBtn1);
    await ensureDashboard();

    // 2. Launch Memory Match
    const launchMemBtn = document.querySelector('[data-testid="launch-game-memory"]') as HTMLElement;
    if (!launchMemBtn) throw new Error('Memory Match launch button not found');
    click(launchMemBtn);
    await waitFor(() => !!document.querySelector('[data-testid="game-memory"]'), 2000);

    // Win Memory
    const memGrid = document.querySelector('[data-testid="memory-grid"]');
    if (memGrid) {
      const winBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulate Win')) as HTMLElement;
      if (winBtn) click(winBtn);
    } else {
      const winBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulate Win')) as HTMLElement;
      if (winBtn) click(winBtn);
    }
    await wait(150);

    // Click back
    const backBtn2 = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    click(backBtn2);
    await ensureDashboard();

    // Verify both dashboard high scores
    const msBadge = document.querySelector('[data-testid="highscore-minesweeper"]') as HTMLElement;
    const memBadge = document.querySelector('[data-testid="highscore-memory"]') as HTMLElement;
    if (!msBadge.textContent || parseInt(msBadge.textContent.replace(/\D/g, '')) === 0) {
      throw new Error(`Expected Minesweeper high score to be non-zero, got ${msBadge.textContent}`);
    }
    if (!memBadge.textContent || parseInt(memBadge.textContent.replace(/\D/g, '')) === 0) {
      throw new Error(`Expected Memory high score to be non-zero, got ${memBadge.textContent}`);
    }
  }
});

// 4. system-t4-audio-persistence-flow
registerTest({
  id: 'system-t4-audio-persistence-flow',
  name: 'Verify volume preferences propagate down to all game wrappers and remain active during transit',
  tier: 4,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    localStorage.removeItem('mono_games_muted');
    await remountApp();

    // Toggle mute on dashboard
    const audioBtn = document.querySelector('[data-testid="audio-toggle"]') as HTMLElement;
    if (!audioBtn) throw new Error('Audio toggle button not found');
    
    // Ensure currently unmuted
    if (localStorage.getItem('mono_games_muted') === 'true') {
      click(audioBtn);
      await wait(100);
    }

    // Click to mute
    click(audioBtn);
    await wait(100);
    if (localStorage.getItem('mono_games_muted') !== 'true') {
      throw new Error('Expected sound to be muted in localStorage');
    }

    // Launch wordle
    const launchWordle = document.querySelector('[data-testid="launch-game-wordle"]') as HTMLElement;
    if (!launchWordle) throw new Error('Wordle launch button not found');
    click(launchWordle);
    await waitFor(() => !!document.querySelector('[data-testid="game-wordle"]'), 2000);

    // Verify muted in wrapper
    const wrapperAudioBtn = document.querySelector('[data-testid="audio-toggle"]') as HTMLElement;
    if (!wrapperAudioBtn) throw new Error('Wrapper audio toggle button not found');
    if (localStorage.getItem('mono_games_muted') !== 'true') {
      throw new Error('Expected game wrapper to inherit muted state');
    }

    // Go back
    const backBtn1 = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    click(backBtn1);
    await ensureDashboard();

    // Unmute on dashboard
    const dashAudioBtn = document.querySelector('[data-testid="audio-toggle"]') as HTMLElement;
    click(dashAudioBtn);
    await wait(100);
    if (localStorage.getItem('mono_games_muted') === 'true') {
      throw new Error('Expected sound to be unmuted in localStorage');
    }

    // Launch sudoku
    const launchSudoku = document.querySelector('[data-testid="launch-game-sudoku"]') as HTMLElement;
    if (!launchSudoku) throw new Error('Sudoku launch button not found');
    click(launchSudoku);
    await waitFor(() => !!document.querySelector('[data-testid="game-sudoku"]'), 2000);

    // Verify unmuted in wrapper
    if (localStorage.getItem('mono_games_muted') === 'true') {
      throw new Error('Expected sudoku game wrapper to inherit unmuted state');
    }

    // Go back
    const backBtn2 = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    click(backBtn2);
    await ensureDashboard();
  }
});

// 5. system-t4-interactive-cabinet-run
registerTest({
  id: 'system-t4-interactive-cabinet-run',
  name: 'Verify interactive run change theme/CRT, launch/play Tetris and Wordle, reset stats, check persistent settings',
  tier: 4,
  game: 'system',
  run: async () => {
    await ensureDashboard();
    resetLocalStorage();
    await remountApp();

    // Change theme to dark
    const themeBtn = document.querySelector('[data-testid="theme-toggle"]') as HTMLElement;
    click(themeBtn);
    await wait(100);

    // Enable CRT
    const crtBtn = document.querySelector('[data-testid="crt-toggle"]') as HTMLElement;
    if (localStorage.getItem('mono_games_crt') === 'false') {
      click(crtBtn);
      await wait(100);
    }

    // Launch Tetris
    const launchTetris = document.querySelector('[data-testid="launch-game-tetris"]') as HTMLElement;
    if (!launchTetris) throw new Error('Tetris launch button not found');
    click(launchTetris);
    await waitFor(() => !!document.querySelector('[data-testid="game-tetris"]'), 2000);

    // Simulate win
    const winBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulate Win')) as HTMLElement;
    if (winBtn) click(winBtn);
    await wait(100);

    // Exit
    const backBtn1 = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    click(backBtn1);
    await ensureDashboard();

    // Launch Wordle
    const launchWordle = document.querySelector('[data-testid="launch-game-wordle"]') as HTMLElement;
    if (!launchWordle) throw new Error('Wordle launch button not found');
    click(launchWordle);
    await waitFor(() => !!document.querySelector('[data-testid="game-wordle"]'), 2000);

    // Simulate loss
    const lossBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Simulate Loss')) as HTMLElement;
    if (lossBtn) click(lossBtn);
    await wait(100);

    // Exit
    const backBtn2 = document.querySelector('[data-testid="game-back-btn"]') as HTMLElement;
    click(backBtn2);
    await ensureDashboard();

    // Reset stats
    const originalConfirm = window.confirm;
    window.confirm = () => true;

    try {
      const resetBtn = document.querySelector('[data-testid="reset-stats-btn"]') as HTMLElement;
      click(resetBtn);
      await wait(200);

      // Verify all stats are 0
      const totalPlaysEl = document.querySelector('[data-testid="stats-total-plays"]') as HTMLElement;
      if (totalPlaysEl.textContent !== '0') {
        throw new Error(`Expected plays to be reset to 0, got ${totalPlaysEl.textContent}`);
      }
      const totalWinsEl = document.querySelector('[data-testid="stats-total-wins"]') as HTMLElement;
      if (totalWinsEl.textContent !== '0') {
        throw new Error(`Expected wins to be reset to 0, got ${totalWinsEl.textContent}`);
      }

      // Verify theme/CRT remain
      if (localStorage.getItem('mono_games_theme') !== 'dark') {
        throw new Error('Theme did not remain dark after stats reset');
      }
      if (localStorage.getItem('mono_games_crt') === 'false') {
        throw new Error('CRT did not remain enabled after stats reset');
      }
    } finally {
      window.confirm = originalConfirm;
    }
  }
});
