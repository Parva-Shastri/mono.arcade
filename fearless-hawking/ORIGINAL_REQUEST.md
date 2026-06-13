# Original User Request

## Initial Request — 2026-06-13T15:35:57+05:30

Add 10 new unique casual games to the MONO.ARCADE portal. Each game must be fully playable, integrated into the dashboard, and strictly adhere to the project's monochrome theme, typography, and audio guidelines.

Working directory: `/home/staytuned/Documents/antigravity/fearless-hawking`
Integrity mode: `development`

## Requirements

### R1. 10 New Unique Games
- Add 10 additional playable games to the catalog without duplicating existing games (Tic-Tac-Toe, Snake, 2048).
- Proposed Games:
  1. Minesweeper (grid logic puzzle)
  2. Memory Match (card pairs)
  3. Sudoku (number placement)
  4. Wordle Clone (word guessing)
  5. Pong (retro vertical paddle vs AI)
  6. Breakout (brick-breaking ball)
  7. Tetris (falling tetromino blocks)
  8. Blackjack (cards vs dealer)
  9. Connect Four (vertical grid dropper)
  10. Maze Escape (procedurally generated maze navigation)
- Each game must have self-contained logic and be fully playable with keyboard controls and/or mobile D-pads.

### R2. Strict Monochrome Styling
- Games must support monochrome theme only. Use `var(--bg)`, `var(--fg)`, `var(--border)`, and gray variables.
- Use pattern hatching (stripes, dots, dashes, double borders) for differentiation of states/blocks where color would normally be used.
- Integrate the geometric Space Grotesk font for headers and JetBrains Mono for menus and buttons.

### R3. Architectural Standards
- Define metadata for each game and register it in `src/types.ts` and `src/App.tsx`.
- Wrap gameplay inside `<GameWrapper>` for standardized score layout, instructions drawer, back button, and mute indicators.
- Use LocalStorage to persist high scores and stats for all new games.

### R4. Synthesized Sound Integration
- Trigger synthesized 8-bit sound effects (bleeps, buzzes, wins, losses) using the existing Web Audio API controller `src/utils/audio.ts`.

## Acceptance Criteria

### Compilation & Build
- [ ] Running `npm run build` compiles without any TypeScript or Vite bundling errors or warnings.
- [ ] Static output assets are successfully written to `dist/`.

### Game Integration
- [ ] 10 new games are listed on the main dashboard cards with titles, descriptions, and high scores.
- [ ] Clicking "Launch Game" on any card opens the game board with instructions.
- [ ] Clicking "Back" returns to the dashboard, and mute toggles are respected.
