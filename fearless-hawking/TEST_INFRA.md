# E2E Test Infra: MONO.ARCADE Portal Expansion

This document outlines the testing strategy, specifications, architecture, and DOM-level interface contracts for the E2E verification of the MONO.ARCADE Game Portal Expansion. All implementations must align with these specs to ensure clean, automated, opaque-box validation.

---

## 1. Test Philosophy

The MONO.ARCADE test suite is built upon three core design pillars:

*   **Opaque-box Testing:** All E2E test cases must interact with the application solely through the public DOM interface. Tests simulate real user behaviors (e.g., clicking buttons, firing keyboard events, drawing coordinates, reading text content) and verify outputs through DOM assertions. Testing hooks that expose React internal state or force internal component updates are strictly prohibited.
*   **Requirement-driven Verification:** Tests map directly to product specifications, game rules, and styling behaviors defined in `ORIGINAL_REQUEST.md`. Every game must possess explicit tests verifying its rules, score triggers, theme compliance, and sound interactions.
*   **Zero External Dependencies:** Rather than introducing heavy external automation frameworks (such as Cypress, Playwright, or Puppeteer) which require system-level package dependencies, dedicated Node.js test servers, and can introduce flakiness in local/CI environments, MONO.ARCADE implements a lightweight, in-browser test runner. The test suite compiles directly as part of the React + TypeScript frontend bundle and executes in the live browser context.

---

## 2. Feature Inventory

The 10 new casual games added to the catalog are registered and mapped to the original requirements as follows:

| Game ID | Game Title | Genre / Type | ORIGINAL_REQUEST Section | T1 Cases | T2 Cases | T3 Checked | T4 Checked |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `minesweeper` | Minesweeper | Grid Logic Puzzle | R1.1 | 5 | 5 | Yes | Yes |
| `memory` | Memory Match | Card Pairs | R1.2 | 5 | 5 | Yes | Yes |
| `sudoku` | Sudoku | Number Placement | R1.3 | 5 | 5 | Yes | Yes |
| `wordle` | Wordle Clone | Word Guessing | R1.4 | 5 | 5 | Yes | Yes |
| `pong` | Pong | Retro Paddle vs AI | R1.5 | 5 | 5 | Yes | Yes |
| `breakout` | Breakout | Brick-Breaking Ball | R1.6 | 5 | 5 | Yes | Yes |
| `tetris` | Tetris | Falling Blocks | R1.7 | 5 | 5 | Yes | Yes |
| `blackjack` | Blackjack | Card Game vs Dealer | R1.8 | 5 | 5 | Yes | Yes |
| `connectfour`| Connect Four | Grid Dropper | R1.9 | 5 | 5 | Yes | Yes |
| `maze` | Maze Escape | Procedural Navigation | R1.10 | 5 | 5 | Yes | Yes |

*   **Tier 1 (Feature Coverage):** 5 happy-path test cases per game (50 total). Verifies game launching, layout rendering, basic controls, updating score, and clean exiting.
*   **Tier 2 (Boundary & Corner Cases):** 5 edge-case tests per game (50 total). Verifies boundary movements, game-over boundaries, victory limits, invalid controls/inputs, and AudioContext integration.
*   **Tier 3 (Cross-Feature Combinations):** System-wide settings tests (10 total) covering local storage sync, CRT filter toggles, theme changes, volume configurations, and routing stability.
*   **Tier 4 (Real-World Applications):** Multi-game sequential flows (5 total) simulating typical user arcade sessions.

---

## 3. Test Architecture

### 3.1 Test Runner Location & Invocation

The test runner operates inside the Vite application itself.
*   **Path:** Navigating to `/test` in the browser mounts the test runner interface.
*   **Invocation:** Simply load the `/test` URL on the active web server.
*   **UI Reporting:** The test runner interface presents a dedicated console with:
    *   **Overall Progress Panel:** Displays current progress, total cases, pass count, fail count, and total execution time.
    *   **Category Filters:** Allows running/filtering test cases by game ID, tier (T1–T4), or test state (passed, failed, pending, running).
    *   **Logs Console:** Displays step-by-step stdout-like logs for the currently running tests.
    *   **Stack Trace Inspector:** Shows verbose error descriptions, source file line references, and DOM snapshots at the time of failure for any failing test.

### 3.2 Test Case Format

All tests are written in TypeScript and conform to the following contracts:

```typescript
export type TestTier = 1 | 2 | 3 | 4;

export interface TestCase {
  id: string;                // e.g. "minesweeper-t1-launch"
  name: string;              // e.g. "Verify Minesweeper mounts with correct grid size"
  tier: TestTier;            // 1 | 2 | 3 | 4
  game: string;              // e.g. "minesweeper" or "system" (for cross-feature)
  run: () => Promise<void>;  // Async execution function. Fails by throwing an Error
}

export interface TestResult {
  id: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  durationMs?: number;
  error?: string;
  logs: string[];
}
```

### 3.3 Directory Layout

All testing code must be co-located under the `src/tests/` directory:

```
src/
├── tests/
│   ├── runner.ts           // Test runner core and registry engine
│   ├── utils.ts            // DOM interaction helpers (clicks, keys, delays)
│   ├── system.test.ts      // Tier 3 and Tier 4 cross-game integration tests
│   ├── tictactoe.test.ts   // Tests for Tic-Tac-Toe (Tier 1 & 2)
│   ├── snake.test.ts       // Tests for Snake (Tier 1 & 2)
│   ├── 2048.test.ts        // Tests for 2048 (Tier 1 & 2)
│   ├── minesweeper.test.ts // Tests for Minesweeper (Tier 1 & 2)
│   ├── memory.test.ts      // Tests for Memory Match (Tier 1 & 2)
│   ├── sudoku.test.ts      // Tests for Sudoku (Tier 1 & 2)
│   ├── wordle.test.ts      // Tests for Wordle Clone (Tier 1 & 2)
│   ├── pong.test.ts        // Tests for Pong (Tier 1 & 2)
│   ├── breakout.test.ts    // Tests for Breakout (Tier 1 & 2)
│   ├── tetris.test.ts      // Tests for Tetris (Tier 1 & 2)
│   ├── blackjack.test.ts   // Tests for Blackjack (Tier 1 & 2)
│   ├── connectfour.test.ts // Tests for Connect Four (Tier 1 & 2)
│   └── maze.test.ts        // Tests for Maze Escape (Tier 1 & 2)
```

---

## 4. DOM Interface Contracts

To enable automated testing, all interactive elements, wrapper elements, and game boards must be tagged with explicit `data-testid` attributes.

### 4.1 Dashboard and Global Portal Controls

| Element Description | Selector / testid | Attributes |
| :--- | :--- | :--- |
| Main Dashboard Container | `[data-testid="dashboard"]` | |
| Light/Dark Theme Button | `[data-testid="theme-toggle"]` | |
| CRT Filter Toggle Button | `[data-testid="crt-toggle"]` | |
| Reset Stats Button | `[data-testid="reset-stats-btn"]` | |
| Audio Volume Button | `[data-testid="audio-toggle"]` | |
| Game Launch Button | `[data-testid="launch-game-${gameId}"]` | e.g. `[data-testid="launch-game-minesweeper"]` |
| Dashboard High Score Badge | `[data-testid="highscore-${gameId}"]` | Text contains numeric value |
| Total Plays Metric | `[data-testid="stats-total-plays"]` | |
| Total Wins Metric | `[data-testid="stats-total-wins"]` | |

### 4.2 Game Wrapper Elements

| Element Description | Selector / testid | Attributes |
| :--- | :--- | :--- |
| Game Wrapper Container | `[data-testid="game-wrapper"]` | |
| Exit / Back to Dashboard | `[data-testid="game-back-btn"]` | |
| View Instructions (Info) | `[data-testid="game-info-btn"]` | |
| Collapsible Help Card | `[data-testid="game-instructions"]` | Present when instructions visible |
| Specific Instruction Step | `[data-testid="game-instruction-step-${idx}"]` | 0-indexed instruction strings |
| Active Game Title Heading | `[data-testid="game-title"]` | |
| Reset Board Action Button | `[data-testid="game-reset-btn"]` | |
| Game High Score Display | `[data-testid="game-high-score"]` | |

### 4.3 Game-Specific Components

#### Minesweeper (`minesweeper`)
*   Game container: `[data-testid="game-minesweeper"]`
*   Grid board: `[data-testid="minesweeper-grid"]`
*   Individual Cell: `[data-testid="minesweeper-cell-${row}-${col}"]`
    *   State attribute: `data-state="hidden" | "revealed" | "flagged"`
    *   Mines attribute: `data-mines="${num}"` (where `${num}` is 0 for empty, or 1–8)
    *   Mine indicator: `data-has-mine="true"` (revealed mine)
*   Remaining Mine Count: `[data-testid="minesweeper-mine-count"]`
*   Smiley Face Status Indicator: `[data-testid="minesweeper-status-face"]`
*   Game Status: `[data-testid="minesweeper-status-text"]` (contains "playing", "won", or "lost")

#### Memory Match (`memory`)
*   Game container: `[data-testid="game-memory"]`
*   Card grid: `[data-testid="memory-grid"]`
*   Individual Card: `[data-testid="memory-card-${idx}"]` (0-indexed card position)
    *   State attribute: `data-state="face-down" | "face-up" | "matched"`
    *   Visual representation: `data-glyph="${symbol}"` (the character/icon of the card face)
*   Move Counter: `[data-testid="memory-moves-count"]`
*   Remaining Pairs: `[data-testid="memory-pairs-left"]`
*   Game Status: `[data-testid="memory-status-text"]`

#### Sudoku (`sudoku`)
*   Game container: `[data-testid="game-sudoku"]`
*   Sudoku board: `[data-testid="sudoku-grid"]`
*   Grid Cell: `[data-testid="sudoku-cell-${row}-${col}"]`
    *   State attribute: `data-state="given" | "user-entered" | "incorrect" | "empty"`
    *   Value attribute: `data-value="${num}"` (digit 1–9 or empty)
*   Number Pad Keyboard: `[data-testid="sudoku-num-pad"]`
*   Number Pad Digit Key: `[data-testid="sudoku-num-${num}"]` (buttons 1–9)
*   Eraser / Clear Button: `[data-testid="sudoku-clear-btn"]`
*   Mistake Counter: `[data-testid="sudoku-errors"]`
*   Game Status: `[data-testid="sudoku-status-text"]`

#### Wordle Clone (`wordle`)
*   Game container: `[data-testid="game-wordle"]`
*   Word Grid: `[data-testid="wordle-grid"]`
*   Row Container: `[data-testid="wordle-row-${row}"]` (0–5)
*   Character Tile: `[data-testid="wordle-tile-${row}-${col}"]` (0-indexed)
    *   Letter: `data-char="${char}"`
    *   Evaluation state: `data-state="empty" | "tbd" | "absent" | "present" | "correct"`
*   On-Screen Key: `[data-testid="wordle-key-${char}"]` (uppercase characters A–Z, plus "ENTER" and "BACKSPACE")
*   Status Notification Overlay: `[data-testid="wordle-message"]`
*   Game Status: `[data-testid="wordle-status-text"]`

#### Pong (`pong`)
*   Game container: `[data-testid="game-pong"]`
*   Game Canvas: `[data-testid="pong-canvas"]`
*   Player Score: `[data-testid="pong-player-score"]`
*   AI Score: `[data-testid="pong-ai-score"]`
*   Game Status: `[data-testid="pong-status-text"]`
*   Start Paddle Action Button: `[data-testid="pong-start-btn"]`

#### Breakout (`breakout`)
*   Game container: `[data-testid="game-breakout"]`
*   Game Canvas: `[data-testid="breakout-canvas"]`
*   Game Score: `[data-testid="breakout-score"]`
*   Remaining Lives: `[data-testid="breakout-lives"]`
*   Game Status: `[data-testid="breakout-status-text"]`
*   Start Game Action Button: `[data-testid="breakout-start-btn"]`

#### Tetris (`tetris`)
*   Game container: `[data-testid="game-tetris"]`
*   Matrix Canvas: `[data-testid="tetris-canvas"]`
*   Score Counter: `[data-testid="tetris-score"]`
*   Line Clears Counter: `[data-testid="tetris-lines"]`
*   Next Piece Preview Panel: `[data-testid="tetris-next-piece"]`
*   Game Status: `[data-testid="tetris-status-text"]`
*   Start / Pause Action Button: `[data-testid="tetris-start-btn"]`

#### Blackjack (`blackjack`)
*   Game container: `[data-testid="game-blackjack"]`
*   Dealer Cards Area: `[data-testid="blackjack-dealer-hand"]`
    *   Card item: `[data-testid="blackjack-dealer-card-${idx}"]`
    *   Dealer score sum: `[data-testid="blackjack-dealer-total"]`
*   Player Cards Area: `[data-testid="blackjack-player-hand"]`
    *   Card item: `[data-testid="blackjack-player-card-${idx}"]`
    *   Player score sum: `[data-testid="blackjack-player-total"]`
*   Hit action button: `[data-testid="blackjack-btn-hit"]`
*   Stand action button: `[data-testid="blackjack-btn-stand"]`
*   Double Down action button: `[data-testid="blackjack-btn-double"]`
*   Player Chip Wallet Balance: `[data-testid="blackjack-chips"]`
*   Bet Amount Display: `[data-testid="blackjack-bet"]`
*   Game Status: `[data-testid="blackjack-status-text"]`

#### Connect Four (`connectfour`)
*   Game container: `[data-testid="game-connectfour"]`
*   Column Selector / Drop Action Zone: `[data-testid="connectfour-col-${col}"]` (columns 0–6)
*   Board Cell: `[data-testid="connectfour-cell-${row}-${col}"]`
    *   Owner status: `data-player="none" | "player1" | "player2"`
*   Turn Indicator: `[data-testid="connectfour-turn"]`
*   Game Status: `[data-testid="connectfour-status-text"]`

#### Maze Escape (`maze`)
*   Game container: `[data-testid="game-maze"]`
*   Maze Canvas or Grid: `[data-testid="maze-canvas"]`
*   Level Indicator: `[data-testid="maze-level"]`
*   Step Count Counter: `[data-testid="maze-steps"]`
*   Current position tracking: `[data-testid="maze-position"]` (represented as `data-pos="${row}-${col}"`)
*   Game Status: `[data-testid="maze-status-text"]`

---

## 5. Real-World Application Scenarios (Tier 4)

Tier 4 tests execute multi-game application lifecycles in sequence to verify state preservation, UI integration, and settings persistence.

### Scenario 1: Multi-Game High Score Run and Persistence
*   **Goal:** Verify game launch, high score tracking, wrapper update, and localStorage persistence.
*   **Execution Flow:**
    1.  Test verifies that all high scores are set to 0 initially on the dashboard.
    2.  Test clicks the memory match launch button `[data-testid="launch-game-memory"]`.
    3.  Programmatically match all cards in `[data-testid="game-memory"]` to finish the game.
    4.  Assert that `[data-testid="game-high-score"]` updates with the new score.
    5.  Click the exit button `[data-testid="game-back-btn"]` to return to the dashboard.
    6.  Assert that the high score on the dashboard's Memory Match card `[data-testid="highscore-memory"]` matches the value recorded.
    7.  Click the minesweeper launch button `[data-testid="launch-game-minesweeper"]`.
    8.  Uncover safe squares in the minesweeper board until game is won.
    9.  Assert that Minesweeper's score has saved correctly.
    10. Return to dashboard; assert both scores are preserved and read correctly from localStorage `mono_games_scores`.

### Scenario 2: Global Mute settings and Game transition
*   **Goal:** Verify volume preferences propagate down to all game wrappers and remain active during transit.
*   **Execution Flow:**
    1.  Test clicks global volume button `[data-testid="audio-toggle"]` on the main dashboard to mute sounds.
    2.  Assert that the volume state is saved to `mono_games_muted` as `true` in localStorage.
    3.  Launch Blackjack (`blackjack`) by clicking `[data-testid="launch-game-blackjack"]`.
    4.  Verify that the audio control element in the game wrapper is set to the muted state.
    5.  Perform card actions (clicks to "HIT" or "STAND"). Spy on `AudioContext` / audio node creation to assert no sound tones are played.
    6.  Click back to dashboard `[data-testid="game-back-btn"]`.
    7.  Unmute the volume globally `[data-testid="audio-toggle"]`.
    8.  Launch Connect Four (`connectfour`) by clicking `[data-testid="launch-game-connectfour"]`.
    9.  Verify game wrapper audio reflects unmuted state and triggers a tone upon dropping a token.

### Scenario 3: Theme Styles & CRT Filter propagation
*   **Goal:** Verify visual theme settings and screen shaders are dynamically applied to game layouts.
*   **Execution Flow:**
    1.  Verify from dashboard that CRT styling is disabled.
    2.  Click `[data-testid="crt-toggle"]` to enable the scanline overlay.
    3.  Assert that the CRT container class `.crt` or active overlay div is injected into the DOM.
    4.  Launch Sudoku (`sudoku`) by clicking `[data-testid="launch-game-sudoku"]`.
    5.  Verify that the `.crt` class remains present and that the Sudoku container styling inherits scanline visual properties.
    6.  Perform game moves (enter digits in Sudoku).
    7.  Go back to the dashboard, and assert that the CRT filter class remains active on the main dashboard interface.

### Scenario 4: Focus and Keyboard Navigation Transfer
*   **Goal:** Verify accessibility compliance and keyboard event listeners are correctly focused.
*   **Execution Flow:**
    1.  Using the keyboard, trigger `Tab` or directional `Arrow` keys on the dashboard to move focus to the Wordle Clone button `[data-testid="launch-game-wordle"]`.
    2.  Simulate an `Enter` keydown event.
    3.  Assert that Wordle mounts and document focus shifts immediately to the Wordle board.
    4.  Simulate keyboard input events (`W`, `O`, `R`, `D`, `S` followed by `Enter`).
    5.  Assert that letters populate the word container and submit successfully.
    6.  Simulate keying focus to the exit button and press `Enter`.
    7.  Confirm focus is returned cleanly to the Wordle launch button on the dashboard card.

### Scenario 5: Full Portal Reset Cycle
*   **Goal:** Ensure complete data destruction works reliably from the global reset trigger.
*   **Execution Flow:**
    1.  Launch Pong and score 5 points to record a high score of 5. Return to the dashboard.
    2.  Launch Tetris, trigger line clears, and record a high score. Return to the dashboard.
    3.  Assert both best scores on the cards are non-zero.
    4.  Trigger click event on `[data-testid="reset-stats-btn"]`.
    5.  Mock/override window confirmation dialog (`window.confirm`) to return `true`.
    6.  Verify that high scores for all games are instantly reset to `0` on the dashboard.
    7.  Assert that `stats-total-plays` and `stats-total-wins` metrics are cleared.
    8.  Verify that `localStorage.getItem('mono_games_scores')` maps all keys to zero score structures.

---

## 6. Coverage Thresholds

To pass verification, the test suite must execute and verify the following minimum case volumes:

*   **Tier 1: Feature Coverage (50 test cases):** 5 cases per game across 10 games.
*   **Tier 2: Boundary & Corner Cases (50 test cases):** 5 cases per game across 10 games.
*   **Tier 3: Cross-Feature Combinations (10 test cases):** Portal-wide feature configurations.
*   **Tier 4: Real-World Applications (5 test cases):** Sequential application-level flows.
*   **Total Target Case Count: 115 test cases minimum.**
