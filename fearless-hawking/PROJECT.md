# Project: MONO.ARCADE Game Portal Expansion

## Architecture
- React + TypeScript + Vite single-page application.
- Main dashboard listing game cards with Title, Description, and High Score.
- Individual games wrapped in `<GameWrapper>` for standard layout, instructions, and audio toggling.
- High scores and stats persisted using LocalStorage.
- Sound effects triggered via `src/utils/audio.ts`.

## Code Layout
- `src/types.ts`: Type definitions for `GameId`, `GameMetadata`, `ScoresState`.
- `src/App.tsx`: Routing, layout theme/CRT filters, score state persistence.
- `src/components/Dashboard.tsx`: Main UI portal for starting games and viewing stats.
- `src/components/GameWrapper.tsx`: Standard wrapper for games (Back button, Instructions, Mute, Reset).
- `src/utils/audio.ts`: Web Audio API 8-bit sound effects.
- `src/games/`: Directory for game components.
  - `src/games/tictactoe/`
  - `src/games/snake/`
  - `src/games/2048/`
  - `src/games/minesweeper/`
  - `src/games/memory/`
  - `src/games/sudoku/`
  - `src/games/wordle/`
  - `src/games/pong/`
  - `src/games/breakout/`
  - `src/games/tetris/`
  - `src/games/connectfour/`
  - `src/games/maze/`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | System Integration Prep | Extend `src/types.ts`, `src/App.tsx`, `src/components/Dashboard.tsx` with all 9 new game IDs, and create stub components. | None | DONE |
| 2 | Board & Puzzle Games | Implement Minesweeper, Sudoku, and Connect Four games with full logic, styling, and audio. | M1 | DONE |
| 3 | Card & Word Games | Implement Memory Match and Wordle Clone games with full logic, styling, and audio. | M1 | PLANNED |
| 4 | Real-time & Action Games | Implement Pong, Breakout, Tetris, and Maze Escape games with full logic, styling, and audio. | M1 | PLANNED |
| 5 | Dual Track Validation & Hardening | Opaque-box E2E test verification, bug fixing, and adversarial testing. | M2, M3, M4 | PLANNED |

## Interface Contracts
### Game Components ↔ App.tsx / GameWrapper
- Each game component must export:
  - `export const metadata: GameMetadata`
  - `export default const GameComponent: React.FC<{ onBack: () => void; record: ScoreRecord; onUpdateRecord: (id: GameId, record: ScoreRecord) => void; }>`
- Must wrap content in `<GameWrapper>` with instructions, reset handler, high score, and back button.
- Must play audio cues for clicks/moves, scoring/success (wins), and failure/game-over (losses).
- CSS classes and DOM structure must use semantic custom data attributes or IDs (e.g. `data-testid="game-minesweeper"`) to facilitate E2E opaque-box testing.
