# Cube Tag

## Current State
Full-stack first-person cube tag game with 3D and 2D platformer modes. The HomeScreen has name input + room create/join flow + a control picker (PC/Mobile). The 3D arena uses MAP_SIZE=22 with corridors, pillars, L-walls, and wonky blocks. The 2D platformer generates a ground floor + 10-16 random floating ledges placed with `posX` from -14 to 14 and `posY` from 1.5 to 10. The scene is rendered via React Three Fiber. Sensitivity is hardcoded at 0.004 for mobile touch-look and is not user-configurable.

## Requested Changes (Diff)

### Add
- Sensitivity slider in the main menu (HomeScreen) — a single labeled slider (range 0.5x to 3x, default 1x) stored in state and passed to GameScreen → Scene so both PC mouse look (PointerLockControls mouse movement multiplier) and mobile touch-drag use it
- Broader 2D platformer map: wider x-range (-22 to 22), taller height range (1.5 to 14), better ledge spacing using a staggered column-based algorithm so ledges don't pile on top of each other, minimum horizontal gap between adjacent ledges, distinct ledge widths per height tier (wide near ground, narrow high up)

### Modify
- `generatePlatformerMap` in mapGen.ts: replace the fully random placement with a structured layout — divide the map into columns (x zones), place 1-2 ledges per column at staggered heights, ensure no two ledges in the same column are within 2 units vertically, expand x range to -22/+22 and y range to 1.5-14
- `generateMap` (3D arena): expand MAP_SIZE from 22 to 32, increase boundary walls accordingly, add more obstacles (raise corridorCount max to 16, pillarGroupCount max to 8, lWallCount max to 10, wonkyCount max to 14), spread ARENA_LIGHTS and NEON_TUBES to cover the larger area, widen fog far plane from 45 to 65
- `Scene.tsx`: accept a `sensitivity` prop and apply it as a multiplier to the mobile touch sensitivity constant; for PC, sensitivity is handled via PointerLockControls which uses the browser mouse sensitivity natively — expose a `mouseSensitivity` prop that Scene stores in a ref and uses in a `mousemove` override if needed (or simply pass it through to the PointerLockControls)
- `HomeScreen.tsx`: add a Settings section on the main screen with a horizontal sensitivity slider (label "Look Sensitivity", values 0.5–3.0, step 0.1, default 1.0), display current value next to label; pass sensitivity up via callback or store in App state
- `App.tsx`: add `sensitivity` state (default 1.0), pass to HomeScreen (callback), and pass down to GameScreen
- `GameScreen.tsx`: accept and forward `sensitivity` prop to Scene
- STAR_POSITIONS_2D: expand to 60 stars to fill the larger map
- POSTER_POSITIONS_2D: spread posters across new wider range

### Remove
- Nothing removed

## Implementation Plan
1. Update `mapGen.ts` — `generatePlatformerMap`: structured column-based layout with wider x/y range
2. Update `mapGen.ts` — `generateMap` (3D): expand MAP_SIZE to 32, raise obstacle counts
3. Update `Scene.tsx`: accept `sensitivity` prop, apply to mobile touch look, spread lights/tubes/stars for larger 3D map, expand 2D stars and poster positions
4. Update `HomeScreen.tsx`: add sensitivity slider, emit value via `onSensitivityChange` callback prop
5. Update `App.tsx`: add `sensitivity` state, wire HomeScreen callback and pass to GameScreen
6. Update `GameScreen.tsx`: accept and forward `sensitivity` prop to Scene
7. Update `useGameLoop.ts` (if needed): no changes needed — sensitivity is a rendering/camera concern only
8. Update fog in `Scene.tsx` 3D mode to match expanded map
