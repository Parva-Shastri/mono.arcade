# Project Expansion & Bugfix Plan: MONO.ARCADE

## Objective
Enhance visual consistency and fix rendering bugs in existing games, remove Blackjack, and introduce 6 new games conforming strictly to high-contrast monochrome branding, layout architectures, and test patterns.

## Milestones

### Milestone 1: Refactor & Fix Existing Games (Pong, Breakout, Maze, 2048, Memory Match, Connect Four, Tetris)
- **Pong, Breakout, Maze**: Fix Canvas 2D contexts to dynamically query theme CSS variables (`--bg`, `--fg`, `--border`) from the DOM instead of static parsing/caching, ensuring visibility in light/dark themes.
- **2048**: Resolve the grid/move styling bug that results in black boxes appearing.
- **Memory Match**: Ensure grid sizes and card boxes are stable, fixed-size, and constrained inside grid boundaries.
- **Connect Four**: Fix coin grid game-over states to clean residual coins cleanly.
- **Tetris**: Keep light gray board background, borders on tetromino shapes, and high contrast.

### Milestone 2: Catalog Cleanup (Remove Blackjack)
- Completely excise `blackjack` from:
  - `src/types.ts` (GameId, default record keys)
  - `src/App.tsx` (imports, mapping table, rendering branches)
  - `src/components/Dashboard.tsx`
  - `src/tests/blackjack.test.ts` (delete or disable this test file)

### Milestone 3: Implement 6 New Monochrome Games
- Add the following 6 playable games inside `src/games/`:
  - **Solitaire** (`src/games/solitaire/Solitaire.tsx`): Klondike Solitaire rules, high-contrast monochrome layout, card stacks representation.
  - **Hangman** (`src/games/hangman/Hangman.tsx`): Gallows/stage visual drawer, letter keyboard input, secret word pool, word status.
  - **Chess** (`src/games/chess/Chess.tsx`): Basic two-player layout, move validation (or simplified player vs random AI), high-contrast board/pieces.
  - **Mario (Mini)** (`src/games/mario/Mario.tsx`): Side-scrolling 2D obstacles jumping canvas, simple physics collision, platform graphics.
  - **Carrom** (`src/games/carrom/Carrom.tsx`): Striker control, simplified disk-flicking simulator physics, pockets, points.
  - **Space Shooter** (`src/games/spaceshooter/SpaceShooter.tsx`): Spaceship, shooting laser controls, scrolling background or spawn list of incoming asteroids/aliens.
- Ensure all 6 games:
  - Adhere to the monochrome typography (Space Grotesk, JetBrains Mono) and variables (`var(--bg)`, `var(--fg)`, `var(--border)`).
  - Use `var(--font-sans)` for game-title headers and `var(--font-mono)` for button interfaces.
  - Wrap components in `<GameWrapper>` with instructions, reset handlers, and score records.
  - Sound effects hook up with `src/utils/audio.ts`.
  - Feature standard "Simulate Win" and "Simulate Loss" buttons.

### Milestone 4: Add New Game Test Suites
- Create test files:
  - `src/tests/solitaire.test.ts`
  - `src/tests/hangman.test.ts`
  - `src/tests/chess.test.ts`
  - `src/tests/mario.test.ts`
  - `src/tests/carrom.test.ts`
  - `src/tests/spaceshooter.test.ts`
- Implement Tier 1 (launch, title, instructions, reset, back) and Tier 2 (win, loss, reset-score, audio-win, audio-loss) checks for all 6 new games.
- Ensure the total test count meets target guidelines.

### Milestone 5: Verification & Quality Audit
- Ensure production build (`npm run build`) runs cleanly without TypeScript compile warnings or Vite packaging errors.
- Ensure the live test suite (visiting `/test`) runs and returns 100% passing tests for all games.
- Confirm Forensic Auditor runs and attests full integrity.
