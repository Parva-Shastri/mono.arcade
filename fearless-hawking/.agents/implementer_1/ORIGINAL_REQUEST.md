## 2026-06-13T17:21:40Z
You are the code implementer worker. Your working directory is `/Users/parva/Downloads/gh-parva-shastri/Personal/mono.arcade/fearless-hawking/.agents/implementer_1/`.
Your task is to implement the fixes for Milestone 1 (Refactor & Fix Existing Games) and Milestone 2 (Catalog Cleanup: Remove Blackjack) as detailed below:

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

1. Fix Canvas rendering context style resolving issues in:
   - `src/games/pong/Pong.tsx`
   - `src/games/breakout/Breakout.tsx`
   - `src/games/maze/Maze.tsx`
   - `src/games/tetris/Tetris.tsx`
   How: Get the computed styles of the canvas (e.g. `window.getComputedStyle(canvas)`) and query the theme variables like `--bg`, `--fg`, `--border`, `--gray-light`, `--gray-mid`, `--gray-dark` to draw them, instead of directly assigning the string 'var(--bg)' to ctx.fillStyle / ctx.strokeStyle. Ensure this is done inside the draw function where the canvas context is accessed, and handle cases where canvas is not yet mounted.

2. Fix layout issues in 2048:
   - `src/games/2048/Game2048.tsx`
   How: Inside `getTileStyle(val)`, if the value is 0, make sure to return `{ background: 'var(--bg)', border: 'none' }` (or similar) to explicitly clear the shorthand background property. This prevents React from clearing the background property entirely to transparent, which reveals the black parent container.

3. Fix Memory Match card size stability:
   - `src/games/memory/Memory.tsx`
   How: Change the face-down state style to have a consistent `border: '2px solid transparent'` to match the 2px border of the face-up state, preventing the contents from shifting / jittering.

4. Fix Connect Four game-over clearing:
   - `src/games/connectfour/ConnectFour.tsx`
   How: Change the empty and player1 token styles to explicitly define `background: 'var(--bg)'` or `background: 'none'` (or similar) instead of only `backgroundColor: 'var(--bg)'` to clear any residual player 2 gradient styles.

5. Remove Blackjack from catalog, routing, and scores:
   - Modify `src/types.ts` to remove 'blackjack' from GameId type union, and update type mappings.
   - Modify `src/App.tsx` to remove import, games catalog entry, default scores entry, and routing condition for Blackjack.
   - Modify `src/components/Dashboard.tsx` (ensure it does not render Blackjack if there are references).
   - Delete `src/tests/blackjack.test.ts` or empty its contents (so it does not register any test).
   - Delete `src/games/blackjack/Blackjack.tsx` or empty its contents.

6. Run `npm run build` and `npm run lint` to verify compilation and static checks.
Write your completion handoff report to `/Users/parva/Downloads/gh-parva-shastri/Personal/mono.arcade/fearless-hawking/.agents/implementer_1/handoff.md` and report back.
