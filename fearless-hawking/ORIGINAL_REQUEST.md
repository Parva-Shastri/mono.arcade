# Original User Request

## Initial Request — 2026-06-26T21:26:30Z

Add three new games (Sling shot, Puzzle, and top-down Car Racing) to the mono.arcade game portal.

Working directory: /Users/parva/Downloads/gh-parva-shastri/Personal/mono.arcade/fearless-hawking
Integrity mode: development

## Requirements

### R1. Git Branch and Integration
- Create and work in a new git branch named `agy/2026-jun-26-new-games-added`. Do not commit or merge anything to `main`.
- Integrate all three games into the existing React/TypeScript codebase inside `fearless-hawking/src`.
- Register the new game IDs (`slingshot`, `puzzle`, `carracing`) in `src/types.ts` and add metadata.
- Display cards for the new games on the main `Dashboard` page.

### R2. Sling Shot Game
- Build a React-based 2D physics slingshot target practice game.
- The player drags a projectile from a starting slingshot point, showing an elastic band/line.
- On release, simple 2D physics (gravity, wind, or straight trajectory) launches the projectile to hit stationary and moving target boards/bubbles.
- Features: project trajectory preview, score tracking, limited projectiles/lives, and game-over state.
- Integrated retro sound effects (launch, hit, game over).

### R3. Jigsaw Puzzle Game
- Build a photo puzzle game with 5 image categories: Nature, Wildlife, Cityscapes, Architecture, and Space.
- Use direct/pre-selected high-quality static Unsplash URLs for the categories.
- 4 difficulty modes: Easy (4x4), Mid (6x6), Hard (8x8), and Extreme (10x10).
- Chop the selected image into tiles, shuffle them, and let the player rearrange/swap them.
- Features: preview original image button, move counter, timer, win condition, and success sound.

### R4. Top-Down Car Racing Game
- Build a top-down traffic lane dodger game.
- Car options: Basic, Sports, Super cars with custom SVG designs.
- Allow color selection for the player car.
- Traffic cars (truck, car, SUV, van, ambulance) spawn randomly in lanes, drawn in outline style with random colors.
- Player steers left/right to dodge oncoming traffic. Speed and spawn frequency increase over time.
- Collision detection, scoring (distance/survival time), and crash sound effect.

### R5. UX and Audio Standards
- Wrap each game in the existing `<GameWrapper>` component to support the back button, instruction modal, mute, and reset features.
- Connect all audio triggers to `src/utils/audio.ts` (using Web Audio API synth sounds) and respect the global mute state.
- Persist high scores using `localStorage` through existing portal mechanics.

## Acceptance Criteria

### Project Build & Lint
- [ ] No compilation or TypeScript errors. Running `npm run build` succeeds.
- [ ] No lint errors. Running `npm run lint` succeeds.

### Dashboard Integration
- [ ] Sling Shot, Puzzle, and Car Racing appear as options on the Dashboard.
- [ ] Selecting a game opens it in `<GameWrapper>` with working instructions, back button, and score tracking.

### Game Requirements
- [ ] Sling Shot features drag release trajectory launch, collision detection with targets, and retro sounds.
- [ ] Puzzle game loads categories successfully, divides images into tiles according to the selected mode (4x4, 6x6, 8x8, 10x10), and tracks moves/time.
- [ ] Car Racing displays custom SVGs for the chosen car class, allows color selection, spawns outline traffic cars, detects collisions, and tracks scores.

## System Update — 2026-06-26T16:13:43Z
The user has switched to Turbo mode and requested to proceed without further interruptions or manual approvals. Execute tasks and commands directly as needed and minimize interruptions.

## System Update — 2026-06-26T16:36:40Z
Once the games are fully implemented and verified, push/publish the branch 'agy/2026-jun-26-new-games-added' to the remote repository. Do not merge or commit to main.


