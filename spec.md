# Cube Tag

## Current State
- Map type is randomly selected each game (30% 2D platformer, 70% 3D arena) — player has no control
- Non-IT bots flee from IT in 3D mode but do it passively — they just move away
- In 2D mode bots jump randomly rather than navigating smartly
- In 3D mode the flee logic is a simple "move away from IT" with no avoidance radius awareness
- Lobby shows a static "Map: Random" tile that doesn't change

## Requested Changes (Diff)

### Add
- Map type selector in the lobby: host can pick "3D Arena", "2D Jump", or "Random" using a toggle/button group
- Non-IT bots now run AROUND the map in patrol/wander mode most of the time, only switching to active flee when IT comes within a flee-radius (~8 units in 3D, ~10 units in 2D)
- Flee radius constant exported so it can be tuned
- In 2D mode: non-IT bots patrol back and forth across platforms; when IT is within flee range they sprint away horizontally and jump if cornered

### Modify
- `App.tsx`: `handleStartGame` reads the host-selected `selectedMapType` instead of randomly picking. When selectedMapType is "random", keep existing random logic
- `LobbyScreen.tsx`: replace static "Map: Random" info tile with an interactive map picker (host only); non-hosts see the current selection
- `useGameLoop.ts`: rework non-IT bot logic — add patrol wander behaviour, and only flee when IT enters FLEE_RADIUS. IT bots retain existing smart chase + predictive lead logic
- `LobbyScreen` props: add `selectedMapType` and `onMapTypeChange` props

### Remove
- Nothing removed

## Implementation Plan
1. Add `selectedMapType: "3d" | "2d-platformer" | "random"` state to `App.tsx`; pass it as prop to `LobbyScreen` and use it in `handleStartGame`
2. Update `LobbyScreen` to show a map-type picker (3 buttons: 3D / 2D / Random) for host; display-only badge for non-host
3. Update `useGameLoop.ts`:
   - Add `FLEE_RADIUS` constant (8 for 3D, 10 for 2D)
   - Non-IT bots: if IT distance > FLEE_RADIUS → patrol wander (slow circle/random walk around arena); if IT distance ≤ FLEE_RADIUS → flee at full speed
   - 2D non-IT bots: patrol horizontally; flee when IT is close
4. Validate and build
