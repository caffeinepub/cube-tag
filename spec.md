# Cube Tag

## Current State
- 3D first-person tag game with random arena maps and 2D platformer mode
- Maps have corridor walls, pillars, L-shapes, wonky blocks, boundary walls
- Bots use photo-in-a-box billboard style with 4 uploaded face photos
- Scene.tsx renders the 3D/2D environments
- ObstacleCubes.tsx renders obstacle geometry
- mapGen.ts generates obstacle layouts

## Requested Changes (Diff)

### Add
- "DEAD OR ALIVE" wanted poster props scattered throughout both 3D and 2D maps
  - Each poster features one of the 4 uploaded photos: IMG_0963-1-1.jpeg, IMG_0964-1-2.jpeg, IMG_0929-3.png, IMG_0471-4.png
  - Poster style: old western sepia/parchment-style billboard plane with "DEAD OR ALIVE" text above the photo and a reward amount below
  - Posters appear on walls and as standalone standing boards
  - 4-8 posters per map, each using a different photo cycling through all 4
- Decorative map detail: floor decals (glowing circles/symbols), ceiling/overhead light rigs, scattered crates/barrels, broken pillars, dust/fog particles near the ground
- 2D platformer: wanted posters hanging in the background layer, plus decorative background buildings/structures

### Modify
- mapGen.ts: add a `generateWantedPosters()` helper that returns poster position data (billboard planes with "DEAD OR ALIVE" text, not ObstacleBox)
- Scene.tsx: render WantedPoster components using Billboard or flat mesh planes at specific positions, using the 4 new uploaded photo paths
- ObstacleCubes.tsx: add variation — some obstacles get a graffiti/worn texture look via emissive color patterns, floor obstacles get a different roughness

### Remove
- Nothing removed

## Implementation Plan
1. Add WantedPoster component in Scene.tsx using Billboard + Text + useLoader for the photo texture
   - Poster layout: dark parchment background plane, photo in center, "DEAD OR ALIVE" text above, "REWARD" text below
   - Use the new uploaded photo paths: /assets/uploads/IMG_0963-1-1.jpeg, /assets/uploads/IMG_0964-1-2.jpeg, /assets/uploads/IMG_0929-3.png, /assets/uploads/IMG_0471-4.png
2. Update bot face texture references in Scene.tsx from old paths to new uploaded paths (current code still references old paths that don't exist)
3. Add poster placement data to mapGen.ts — export `generatePosterPositions(seed)` returning array of {id, position, photoIndex, rotation}
4. In Scene.tsx 3D mode: render 4-8 WantedPoster components at generated positions (mounted on walls or as standing boards)
5. In Scene.tsx 2D mode: render 2-4 WantedPoster components in background layer (z slightly behind platforms)
6. Enhance map visuals: add decorative floor ring decals, overhead neon tube lights between walls, scattered small crate boxes
7. Update GameScreen.tsx BOT_PHOTO_MAP to use new uploaded photo paths
