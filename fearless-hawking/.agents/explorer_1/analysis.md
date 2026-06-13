# Codebase Analysis Report: MONO.ARCADE Game Portal

This report details the analysis of rendering, layout, styling, and integration issues discovered during the exploration of the MONO.ARCADE game portal codebase.

---

## Executive Summary
A comprehensive investigation was conducted into six specified issues across the casual game catalog in the MONO.ARCADE portal. 
* The **canvas-based games** (Pong, Breakout, Maze, Tetris) fail to draw correct styles in light theme because HTML5 Canvas context properties (`fillStyle`, `strokeStyle`) are directly assigned CSS variables (e.g., `var(--bg)`), which the Canvas API cannot native resolve.
* The **grid-based games** (2048, Connect Four) suffer from visual regressions (black boxes/coins appearing after moves or resets) due to a React inline styling quirk where transitioning from shorthand `background` properties (using gradients) to longhand `backgroundColor` properties resets background color to transparent, exposing the parent container's solid black background.
* The **Memory Match** card sizing is unstable due to layout reflows triggered by changing the card border property from `none` to `2px` dynamically when flipped.
* **Blackjack** is integrated cleanly across 5 distinct code locations including type definitions, metadata registries, main router rendering, test suites, and test runners.

---

## 1. Canvas Style Resolving Issues (Pong, Breakout, Maze)

### Observation & Code References
In `src/games/pong/Pong.tsx`, `src/games/breakout/Breakout.tsx`, and `src/games/maze/Maze.tsx`, the canvas rendering loops directly assign CSS variable strings to `ctx.fillStyle` and `ctx.strokeStyle`:

* **Pong (`src/games/pong/Pong.tsx`):**
  * Line 252: `ctx.fillStyle = 'var(--bg)';` (background)
  * Line 256: `ctx.strokeStyle = 'var(--border)';` (center dashed line)
  * Line 266: `ctx.fillStyle = 'var(--fg)';` (player paddle)
  * Line 268: `ctx.strokeStyle = 'var(--border)';` (player paddle border)

* **Breakout (`src/games/breakout/Breakout.tsx`):**
  * Line 267: `ctx.fillStyle = 'var(--bg)';` (background)
  * Lines 275-281: Dynamic assignment of row colors:
    ```typescript
    ctx.fillStyle = brick.rowType === 0
      ? 'var(--fg)'
      : brick.rowType === 1
        ? 'var(--gray-dark)'
        : brick.rowType === 2
          ? 'var(--gray-mid)'
          : 'var(--gray-light)';
    ```
  * Line 284: `ctx.strokeStyle = 'var(--border)';` (brick borders)
  * Line 291: `ctx.strokeStyle = 'var(--border)';` (paddle border)

* **Maze (`src/games/maze/Maze.tsx`):**
  * Line 198: `ctx.fillStyle = 'var(--bg)';` (background)
  * Line 205: `ctx.fillStyle = 'var(--fg)';` (wall cell)
  * Line 207: `ctx.strokeStyle = 'var(--border)';` (wall border)
  * Line 214: `ctx.fillStyle = 'var(--gray-mid)';` (exit point)
  * Line 220: `ctx.fillStyle = 'var(--bg)';` (player circle)
  * Line 224: `ctx.strokeStyle = 'var(--border)';` (player circle border)

### Root Cause Analysis
Assigning a CSS custom property (e.g. `'var(--bg)'`) directly to a Canvas 2D context drawing property is invalid CSS-in-Canvas. The HTML5 Canvas API does not parse or resolve CSS custom properties. Because these strings are invalid CSS color values in the context of the Canvas API, the browser rejects the assignment and falls back to its default drawing color (typically solid `#000000` / black).
* In **dark mode**, the default black color happens to align with the background color (`#000000`), making the game appear somewhat correct.
* In **light mode**, the background, borders, and shapes all resolve to solid black, rendering the canvas completely illegible.

### Actionable Fix Proposal
Read the computed style of the canvas element or the document body prior to rendering and use the resolved hex/RGB value:
```typescript
const computedStyle = window.getComputedStyle(canvas);
const bgColor = computedStyle.getPropertyValue('--bg').trim() || '#ffffff';
const fgColor = computedStyle.getPropertyValue('--fg').trim() || '#000000';
const borderColor = computedStyle.getPropertyValue('--border').trim() || '#000000';

ctx.fillStyle = bgColor;
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
```

---

## 2. Layout Issues in 2048 (Black Boxes)

### Observation & Code References
In `src/games/2048/Game2048.tsx`, the tile container has a solid black background in light mode (specified by the parent border color):
```typescript
// Grid Container (lines 430-431)
border: '4px solid var(--border)',
backgroundColor: 'var(--border)', // In light mode, var(--border) is #000000 (black)
```
The tiles are mapped and styled dynamically using `getTileStyle(cell)`:
```typescript
// Tile mapper (lines 439-450)
<div
  key={idx}
  style={{
    backgroundColor: 'var(--bg)', // Longhand
    display: 'flex',
    ...
    ...getTileStyle(cell),
  }}
>
```
In `getTileStyle` (lines 281-368):
* Tile `8` (line 299) and Tile `32` (line 313) are styled using the **shorthand** `background` property:
  * `background: 'repeating-linear-gradient(45deg, var(--bg), var(--bg) 4px, ...)'`
* Empty cell `0` (line 269) returns `{}` (empty object), resulting in only `backgroundColor: 'var(--bg)'` (longhand) being applied.

### Root Cause Analysis
This is a virtual DOM style reconciliation bug in React:
1. When a tile has the value `8` or `32`, React applies the shorthand `background` style containing the gradient. This overrides any longhand `backgroundColor` style.
2. When the tile slides or merges and its value becomes `0`, `getTileStyle(0)` returns `{}`. The new style object passed to React contains `backgroundColor: 'var(--bg)'` but omits the shorthand `background` key.
3. React diffs the style objects, detects that the shorthand `background` property has been omitted, and unsets it by executing `element.style.background = ""`.
4. In CSS, setting `background = ""` clears all background sub-properties, including `background-color`. Therefore, the `backgroundColor: 'var(--bg)'` longhand property is cleared/ignored.
5. The cell becomes completely transparent, revealing the parent grid container's background color (`var(--border)`), which is solid black (`#000000`) in light mode. This appears to the user as a "black box" after a few moves.

### Actionable Fix Proposal
Ensure the shorthand `background` property is explicitly cleared or set to a solid color in the empty tile state:
```typescript
const getTileStyle = (val: number): React.CSSProperties => {
  if (val === 0) return {
    background: 'var(--bg)', // Explicitly overwrite shorthand
    border: 'none',
  };
  ...
}
```

---

## 3. Memory Match Card Sizing Instability

### Observation & Code References
In `src/games/memory/Memory.tsx` (lines 218-247):
* Base `cardStyle` defines: `border: 'none'` (line 221)
* When a card is flipped (`isFlipped === true`):
  ```typescript
  cardStyle = {
    ...cardStyle,
    backgroundColor: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--border)', // Dynamic border application
  };
  ```
* When a card is face-down:
  ```typescript
  cardStyle = {
    ...cardStyle,
    backgroundColor: 'var(--fg)',
    color: 'var(--bg)',
    background: 'repeating-linear-gradient(...)',
    // border is inherited as 'none'
  };
  ```

### Root Cause Analysis
The cards are button elements inside a CSS grid layout.
1. When a card transitions from face-down to face-up (or vice versa), the `border` property switches between `none` (0px) and `2px solid var(--border)` (2px).
2. Even with `box-sizing: border-box`, changing the border size changes the bounds of the inner content box by 4px in width and height.
3. Because the button does not have standard paddings or margins reset, this causes the layout engine to recalculate the content dimensions dynamically on click, resulting in a visible "jump" or shifting (jitter) of the card glyphs.

### Actionable Fix Proposal
Maintain a consistent border thickness across all states to guarantee layout stability. Use `border: '2px solid transparent'` (or matching border colors) in the face-down state:
```typescript
// For face-down cards:
cardStyle = {
  ...cardStyle,
  backgroundColor: 'var(--fg)',
  color: 'var(--bg)',
  background: 'repeating-linear-gradient(...)',
  border: '2px solid transparent', // Matches 2px thickness of face-up cards
};
```

---

## 4. Connect Four Game-Over Clearing Issue

### Observation & Code References
In `src/games/connectfour/ConnectFour.tsx` (lines 482-503):
* The grid wrapper has a solid black background (line 451): `backgroundColor: 'var(--fg)'`
* Cell tokens are rendered dynamically based on the owner:
  * `player === 'none'`: `backgroundColor: 'var(--bg)'` (longhand)
  * `player === 'player1'`: `backgroundColor: 'var(--fg)'` (longhand)
  * `player === 'player2'`: `background: 'repeating-linear-gradient(...)'` (shorthand)

### Root Cause Analysis
This is the exact same React inline style reconciliation bug as the 2048 game:
1. When a cell belongs to Player 2, the shorthand `background` style is applied with the striped gradient texture.
2. When the game ends and the board is reset, all cells are cleared and set to `player = 'none'`. The style object for `'none'` contains `backgroundColor: 'var(--bg)'` but omits the shorthand `background` key.
3. React detects that `background` is omitted and clears it (`element.style.background = ""`).
4. This clears the cell's `background-color` as well, making the cell transparent.
5. The parent grid container's black background (`var(--fg)`) shows through the transparent cell, making it look as though a "residual black coin" remains in the slot.

### Actionable Fix Proposal
Provide an explicit `background: 'none'` or `background: 'var(--bg)'` for the empty and Player 1 cells to force React to clear the shorthand gradient structure:
```typescript
let tokenStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  border: '2px solid var(--border)',
  background: 'var(--bg)', // Use shorthand background for all states
  boxShadow: 'inset 0 3px 3px rgba(0,0,0,0.2)',
};
```

---

## 5. Tetris Board Styling

### Observation & Code References
In `src/games/tetris/Tetris.tsx`, the rendering of the Tetris board relies entirely on the Canvas API:
* **Background Clearing (line 332, 381):**
  * `ctx.fillStyle = 'var(--bg)';`
* **Grid Lines (line 336):**
  * `ctx.strokeStyle = 'var(--gray-light)';`
* **Block Fills & Borders (lines 405-407):**
  * `ctx.fillStyle = getBlockPattern(colorId);`
  * `ctx.strokeStyle = 'var(--border)';`
* **Pattern Mapping (`getBlockPattern` lines 412-424):**
  ```typescript
  const getBlockPattern = (id: number): string => {
    const patterns = [
      'var(--bg)',
      'var(--fg)',
      'var(--gray-dark)',
      'var(--gray-mid)',
      'var(--gray-light)',
      ...
    ];
    return patterns[id] || 'var(--fg)';
  };
  ```

### Root Cause Analysis
Like Pong, Breakout, and Maze, the Tetris game assigns CSS custom variables (such as `'var(--bg)'`, `'var(--fg)'`, `'var(--border)'`, `'var(--gray-light)'`, `'var(--gray-mid)'`, and `'var(--gray-dark)'`) directly to HTML5 Canvas context properties (`fillStyle`, `strokeStyle`). Because the Canvas context cannot resolve CSS variables natively, all drawings default to solid black (`#000000`).
* In light theme, this results in a solid black game board where the grid lines and falling blocks are invisible, rendering the game unplayable.

### Actionable Fix Proposal
Define a helper function to resolve CSS variable values by scanning the computed styles of the canvas:
```typescript
const getResolvedColor = (canvas: HTMLCanvasElement, cssVar: string): string => {
  const computed = window.getComputedStyle(canvas);
  return computed.getPropertyValue(cssVar).trim() || '#000000';
};

// Use it during draw operations:
ctx.fillStyle = getResolvedColor(canvas, '--bg');
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
```

---

## 6. Blackjack Integration Map

Blackjack is successfully integrated into the MONO.ARCADE portal system across the following **5 locations**:

1. **`src/types.ts`:**
   * Line 12: Registers `'blackjack'` as one of the members of the union type `GameId`.
2. **`src/App.tsx`:**
   * Line 14: Imports the component and metadata: `import Blackjack, { metadata as blackjackMeta } from './games/blackjack/Blackjack';`
   * Line 29: Registers `blackjackMeta` in the global `GAMES` registry array.
   * Line 45: Sets up the default score tracking record: `blackjack: { highScore: 0, gamesPlayed: 0, gamesWon: 0 }` inside `DEFAULT_SCORES`.
   * Lines 218-223: Integrates the component in the main routing switch:
     ```typescript
     {activeGame === 'blackjack' && (
       <Blackjack
         onBack={() => setActiveGame(null)}
         record={scores.blackjack}
         onUpdateRecord={handleUpdateRecord}
       />
     )}
     ```
3. **`src/games/blackjack/Blackjack.tsx`:**
   * The source file containing the game logic (dealer rules, scoring, cards hand management, and local storage chip balance save logic) and UI.
4. **`src/tests/blackjack.test.ts`:**
   * Contains the E2E/integration tests verifying mounting, instructions, game resets, game simulation overrides (win/loss), and volume muting.
5. **`src/tests/TestRunner.tsx`:**
   * Line 9: Auto-discovers and registers the test module using `import.meta.glob('./**/*.test.ts', { eager: true })`.

---

*Report compiled by the Codebase Analyst Explorer.*
