## 2026-06-13T22:58:45Z
You are the code implementer worker. Your working directory is `/Users/parva/Downloads/gh-parva-shastri/Personal/mono.arcade/fearless-hawking/.agents/implementer_2/`.
Your mission is to implement Milestone 3 (Implement 6 New Monochrome Games) and Milestone 4 (Add New Game Test Suites) for the MONO.ARCADE portal.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Here are the requirements for the 6 new games:
All 6 new games must:
1. Use `GameWrapper` to wrap gameplay, passing the metadata title and instructions, handling exit (`onBack`), reset (`onReset`), and scores (`record.highScore`, `onUpdateRecord`).
2. Adhere to strict monochrome layout, typography (Space Grotesk, JetBrains Mono) and theme styles.
3. Play sound effects using `audio.playClick()`, `audio.playScore()`, `audio.playMerge()`, `audio.playWin()`, `audio.playLose()` from `../../utils/audio`.
4. Render canvas drawings by dynamically querying computed colors using `window.getComputedStyle(canvas)` for `--bg`, `--fg`, `--border`, and gray colors (so they are visible in both light and dark themes).
5. Include hidden Simulate Win and Simulate Loss buttons:
   `<button onClick={handleSimulateWin} className="brutalist-button" style={{ display: 'none' }}>Simulate Win</button>`
   `<button onClick={handleSimulateLoss} className="brutalist-button" style={{ display: 'none' }}>Simulate Loss</button>`
   These buttons must update the score state (gamesPlayed + 1, gamesWon + 1, highScore) and trigger win/loss audio.

The 6 new games to create:
1. **Solitaire** (`src/games/solitaire/Solitaire.tsx`):
   - Card games logic (Klondike Solitaire): display deck, waste pile, 4 foundation piles, 7 tableau columns.
   - Support clicking cards to move them.
2. **Hangman** (`src/games/hangman/Hangman.tsx`):
   - Word guessing with an SVG gallows illustration. On-screen letter keys and/or keyboard entry.
3. **Chess** (`src/games/chess/Chess.tsx`):
   - Basic player vs random AI opponent chessboard. Piece selection, move validation, visual chess pieces.
4. **Mario (Mini)** (`src/games/mario/Mario.tsx`):
   - 2D Canvas side-scrolling platformer. A simple character jumps over obstacles with spacebar/click. Survivability score.
5. **Carrom** (`src/games/carrom/Carrom.tsx`):
   - Canvas-based Carrom board game. Striker dragging/flicking physics simulation to pocket pieces in corners.
6. **Space Shooter** (`src/games/spaceshooter/SpaceShooter.tsx`):
   - Canvas-based space shooter. Player controls a ship (left/right, spacebar to shoot) destroying incoming obstacles.

Code Integration:
- Register all 6 new games in `src/types.ts` (GameId union, ScoresState default scores).
- Register all 6 new games in `src/App.tsx` (import components and metadata, add to GAMES array, add to default scores, add routing conditions).

E2E Tests:
Create 6 test files under `src/tests/`:
- `src/tests/solitaire.test.ts`
- `src/tests/hangman.test.ts`
- `src/tests/chess.test.ts`
- `src/tests/mario.test.ts`
- `src/tests/carrom.test.ts`
- `src/tests/spaceshooter.test.ts`
Each test file must register the following 10 tests (patterned after `pong.test.ts` or `connectfour.test.ts`):
1. `Verify <Game> mounts correctly` (id: `${gameId}-t1-mount`)
2. `Verify <Game> title is displayed correctly` (id: `${gameId}-t1-title`)
3. `Verify <Game> instructions open and close correctly` (id: `${gameId}-t1-instructions`)
4. `Verify <Game> has reset button in wrapper` (id: `${gameId}-t1-reset`)
5. `Verify returning to dashboard from <Game>` (id: `${gameId}-t1-back`)
6. `Verify simulating win in <Game> updates metrics` (id: `${gameId}-t2-win`)
7. `Verify simulating loss in <Game> updates metrics` (id: `${gameId}-t2-loss`)
8. `Verify reset board in <Game> resets intermediate state` (id: `${gameId}-t2-reset-score`)
9. `Verify win audio plays in <Game>` (id: `${gameId}-t2-audio-win`)
10. `Verify loss audio plays in <Game>` (id: `${gameId}-t2-audio-loss`)

Run `npm run build` and `npm run lint` to verify that everything compiles without errors and passes static checks.
Write your completion handoff report to `/Users/parva/Downloads/gh-parva-shastri/Personal/mono.arcade/fearless-hawking/.agents/implementer_2/handoff.md` and report back.
