# Handoff Report: Codebase Analysis (MONO.ARCADE Game Portal)

## 1. Observation
The following observations were made after examining the source code:

*   **Pong (`src/games/pong/Pong.tsx`):**
    *   Line 252: `ctx.fillStyle = 'var(--bg)';`
    *   Line 256: `ctx.strokeStyle = 'var(--border)';`
    *   Line 266: `ctx.fillStyle = 'var(--fg)';`
    *   Line 268: `ctx.strokeStyle = 'var(--border)';`
*   **Breakout (`src/games/breakout/Breakout.tsx`):**
    *   Line 267: `ctx.fillStyle = 'var(--bg)';`
    *   Line 275-281: `ctx.fillStyle = brick.rowType === 0 ? 'var(--fg)' : brick.rowType === 1 ? 'var(--gray-dark)' ...`
*   **Maze (`src/games/maze/Maze.tsx`):**
    *   Line 198: `ctx.fillStyle = 'var(--bg)';`
    *   Line 205: `ctx.fillStyle = 'var(--fg)';`
    *   Line 207: `ctx.strokeStyle = 'var(--border)';`
*   **Tetris (`src/games/tetris/Tetris.tsx`):**
    *   Line 332: `ctx.fillStyle = 'var(--bg)';`
    *   Line 336: `ctx.strokeStyle = 'var(--gray-light)';`
    *   Line 405-410: `ctx.fillStyle = getBlockPattern(colorId); ctx.strokeStyle = 'var(--border)';`
*   **2048 (`src/games/2048/Game2048.tsx`):**
    *   Line 299: `background: 'repeating-linear-gradient(45deg, var(--bg), var(--bg) 4px, var(--gray-light) 4px, var(--gray-light) 8px)'` (used for block 8)
    *   Line 313: `background: 'repeating-linear-gradient(-45deg, var(--fg), var(--fg) 3px, var(--gray-mid) 3px, var(--gray-mid) 6px)'` (used for block 32)
    *   Line 439-450: The tile wrapper has:
        ```typescript
        style={{
          backgroundColor: 'var(--bg)',
          display: 'flex',
          ...
          ...getTileStyle(cell),
        }}
        ```
    *   Line 431: Parent container has `backgroundColor: 'var(--border)'` (resolves to black `#000000` in light theme).
*   **Memory Match (`src/games/memory/Memory.tsx`):**
    *   Line 218-230: Base `cardStyle` defines `border: 'none'`.
    *   Line 232-239: Under `isFlipped === true` state:
        ```typescript
        cardStyle = {
          ...cardStyle,
          backgroundColor: 'var(--bg)',
          color: 'var(--fg)',
          border: '2px solid var(--border)',
        };
        ```
*   **Connect Four (`src/games/connectfour/ConnectFour.tsx`):**
    *   Line 451: Parent wrapper has `backgroundColor: 'var(--fg)'` (resolves to `#000000` in light theme).
    *   Line 482-489: Base `tokenStyle` defines `backgroundColor: 'var(--bg)'`.
    *   Line 497-503: Under `player === 'player2'` state:
        ```typescript
        tokenStyle = {
          ...tokenStyle,
          background: 'repeating-linear-gradient(45deg, var(--bg), var(--bg) 4px, var(--fg) 4px, var(--fg) 8px)',
        };
        ```
*   **Blackjack:**
    *   `src/types.ts` (line 12): `'blackjack'`
    *   `src/App.tsx` (lines 14, 29, 45, 218-223)
    *   `src/games/blackjack/Blackjack.tsx` (all)
    *   `src/tests/blackjack.test.ts` (all)
    *   `src/tests/TestRunner.tsx` (line 9): `import.meta.glob('./**/*.test.ts', { eager: true });`

---

## 2. Logic Chain
1. **Canvas Issues:** The assignments in Pong, Breakout, Maze, and Tetris assign `'var(--bg)'` or other CSS variable names directly to Canvas 2D context color properties. Because HTML5 Canvas does not interpret CSS variables natively, the browser rejects this color assignment and falls back to default black (`#000000`). This results in incorrect/black drawings.
2. **2048 & Connect Four Issues:** Both games use the shorthand `background` style containing gradients for specific values (`8`/`32` in 2048; `player2` checkers in Connect Four) and longhand `backgroundColor` for empty cells. When a cell transitions back to empty, the shorthand `background` property is omitted from the style object. React's virtual DOM reconciliation unsets this omitted shorthand property by executing `element.style.background = ""`. Setting the shorthand `background` to `""` resets all background properties (including `background-color`) to transparent. This reveals the parent container's solid black background, resulting in black boxes (2048) and residual black coins (Connect Four).
3. **Memory Match Issue:** The cards toggle between `border: 'none'` (when face-down) and `border: '2px solid var(--border)'` (when face-up). This dynamic change changes the inner dimensions of the card box. Because default margins and paddings are not reset, it triggers layout recalculations that shift/jitter the card contents.
4. **Blackjack Integration:** A filesystem-wide search reveals that Blackjack is integrated across five files.

---

## 3. Caveats
*   The investigation was conducted in read-only mode, and no fixes were implemented.
*   Assumes a standard React 18+ and modern browser environment where React's inline style diffing resets omitted shorthand properties.

---

## 4. Conclusion
*   **Canvas Games:** Need computed styles resolved from the DOM (e.g. `window.getComputedStyle(canvas)`) before passing values to `ctx.fillStyle` / `ctx.strokeStyle`.
*   **2048 & Connect Four:** Need empty cell states to explicitly overwrite the shorthand `background` property (e.g. `background: 'none'` or `background: 'var(--bg)'`) to prevent React from unsetting the background color to transparent.
*   **Memory Match:** Needs a consistent border size (e.g. `border: '2px solid transparent'`) in the face-down state.
*   **Blackjack:** Cleanly registered in 5 locations across types, router, game components, tests, and test runner.

---

## 5. Verification Method
To verify these issues independently:
1. Open the arcade application in a browser and switch to **Light Theme**.
2. Run any canvas game (Pong, Breakout, Maze, Tetris) and observe that the board background and borders are rendered solid black instead of the theme colors.
3. Play 2048 or Connect Four in light theme. Slide tiles in 2048 until an 8 or 32 tile is formed, then slide/merge it; observe that a solid black block appears in its place. In Connect Four, drop a Player 2 (striped) coin, then reset the game; observe that a solid black circle remains.
4. Flip cards in Memory Match and observe the slight size/position shifting (jitter) of the card contents.
5. Inspect the Blackjack integration code locations listed in this report.
