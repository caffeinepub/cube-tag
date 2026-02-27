# Cube Tag

## Current State
- 3D tag game with WASD/arrow controls, room codes, 100s timer
- Randomly generated 3D maps (flat ground, obstacle cubes at ground level)
- 3 AI bots (chase/flee logic)
- Lobby screen shows players; host can start game
- No kick functionality in lobby or during game
- All maps are 3D top-down perspective with flat ground obstacles
- No jumping or vertical movement

## Requested Changes (Diff)

### Add
- **Host kick feature (lobby)**: In the lobby, show a "Kick" button next to each bot and non-host player when `isHost === true`. Clicking it removes that player/bot from `lobbyPlayers`. Host cannot kick themselves.
- **Host kick feature (in-game)**: Show a small kick panel on the HUD (host only) listing all players/bots with a "Kick" button. Kicking removes that entity from the active game players list immediately.
- **2D platformer map type**: Add a second map type ("platformer") that renders as a side-scrolling 2D view. In this mode, the Canvas camera is fixed orthographic side view (looking along Z axis). The map consists of floating horizontal ledge platforms at various heights. The player can jump (Space/W/Up) and is affected by gravity. Left/right movement only (A/D or Left/Right arrows). Player lands on top of ledges and the ground. Map type is randomly selected each game (50/50 between "3d" and "2d-platformer").
- **Map type indicator**: Show "MAP: 3D ARENA" or "MAP: 2D PLATFORMER" in the lobby stats row and in the game HUD.

### Modify
- `types/game.ts`: Add `mapType: "3d" | "2d-platformer"` to `GameState`, add `velocityY?: number` and `onGround?: boolean` to `PlayerState`
- `App.tsx`: Track `mapType` in state; randomly pick on `handleStartGame`; pass to `LobbyScreen`, `GameScreen`
- `LobbyScreen.tsx`: Accept `onKickPlayer(id: string)` prop and `isHost`; show kick buttons; show map type stat
- `GameScreen.tsx`: Accept `mapType` and `isHost`; render `PlatformerGameScreen` or existing 3D screen based on type; show kick HUD panel for host
- `mapGen.ts`: Add `generatePlatformerMap()` that returns floating ledge platforms (ObstacleBox with elevated Y positions representing ledge tops)
- `useGameLoop.ts`: Support 2D mode: gravity, jump, Y-axis collision with ledge tops; in 2D mode ignore Z movement (Z is fixed)

### Remove
- Nothing removed

## Implementation Plan
1. Update `types/game.ts` to add `mapType`, `velocityY`, `onGround` fields
2. Update `mapGen.ts` to add `generatePlatformerMap()` with floating ledges
3. Update `useGameLoop.ts` to handle 2D platformer physics (gravity, jump, land-on-top logic)
4. Update `App.tsx` to pick map type on start, pass kick handler and mapType to screens
5. Update `LobbyScreen.tsx` with kick buttons (host only) and map type display
6. Update `GameScreen.tsx` with host kick HUD and platformer 2D rendering mode (orthographic side camera, no Z movement)
7. Update `Scene.tsx` to support 2D platformer camera mode
