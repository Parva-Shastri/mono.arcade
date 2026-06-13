# Original User Request

## Follow-up — 2026-06-13T17:12:23Z

Fix rendering bugs and visual consistency in existing MONO.ARCADE games (Pong, Breakout, Maze, 2048, Memory Match, Connect Four, Tetris), remove Blackjack, and add 6 new games (Solitaire, Hangman, Chess, Mario, Carrom, Space Shooter) styled in high-contrast monochrome.

Working directory: /Users/parva/Downloads/gh-parva-shastri/Personal/mono.arcade/fearless-hawking
Integrity mode: development

## Requirements

### R1. Fix Rendering and Visibility in Existing Games
*   **Pong, Breakout, Maze**: Fix the canvas rendering context style resolving issues so that all games are visible and fully playable. (HTML5 Canvas 2D contexts must dynamically query and parse theme CSS variables like `--bg`, `--fg`, and `--border` from the DOM rather than passing them directly).
*   **2048**: Fix the layout issue where black boxes appear after a few moves.
*   **Memory Match**: Fix card sizes so they remain stable, fixed, and fit within the grid bounds.
*   **Connect Four**: Fix the game-over state rendering so that coin spaces clear correctly and do not leave residual black coins.
*   **Tetris**: Keep the board background very light gray, improve block visibility, and render blocks with distinct borders.

### R2. Catalog Updates (Removal & Additions)
*   **Remove Blackjack**: Remove the Blackjack game from the routing, dashboard catalog, and scores state.
*   **Add Solitaire**: Implement a fully playable Klondike Solitaire game.
*   **Add Hangman**: Implement a word-guessing Hangman game with a visual gallows/state drawing.
*   **Add Chess**: Implement a basic two-player Chess game (or player vs basic AI/random opponent).
*   **Add Mario (Mini)**: Implement a basic 2D platformer (like jumping over obstacles/gaps).
*   **Add Carrom**: Implement a simplified disk-flicking Carrom game.
*   **Add Space Shooter**: Implement a 2D space shooter game where the player controls a ship and shoots incoming asteroids/aliens.

### R3. Premium Styling & Design Rules
*   All new games must follow the strict monochrome theme, using local CSS variables, Space Grotesk/JetBrains Mono typography, 8-bit sound effects via Web Audio API, and custom simulation win/loss buttons to support automated test infrastructure.

## Acceptance Criteria

### Existing Games Refinement
- [ ] Pong, Breakout, and Maze render perfectly in both light and dark themes.
- [ ] 2048 does not render black boxes after multiple moves.
- [ ] Memory Match card sizes remain fixed within the grid.
- [ ] Connect Four game-over state renders correctly.
- [ ] Tetris uses a light gray background with well-bordered blocks.

### Catalog Management
- [ ] Blackjack is removed from dashboard and build bundle.
- [ ] 6 new games are successfully added to the dashboard.
- [ ] All 6 new games are fully playable and support reset/dashboard-exit functions.

### Tests and Build
- [ ] Production build (`npm run build`) runs successfully with zero warnings/errors.
- [ ] The entire test suite passes successfully.
