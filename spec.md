# Cube Tag

## Current State
- Bots use a `BotCharacter` component with a cylinder body + legs + billboard face (portrait photo)
- Human players (non-local, non-bot) use plain colored cubes (boxGeometry)
- The scoreboard at the bottom of the HUD shows small colored squares for each player
- `GAME_DURATION` is hardcoded at 200 in GameScreen.tsx
- LobbyScreen shows a static "100s" label in the game info panel (stale value)
- `handleStartGame` in App.tsx passes no duration; GameScreen uses its own constant

## Requested Changes (Diff)

### Add
- Timer duration picker in the Lobby (host only), range 100–500 seconds in steps of 50 (or free input clamped to that range)
- `gameDuration` prop on `GameScreen` so the host-chosen time drives the countdown
- Photo-in-a-box display for ALL players (bots and human non-local): each bot keeps its unique assigned photo displayed inside a square box/frame (not a portrait bleed, not a plain cube — a framed square panel with the photo texture inside it)
- Scoreboard HUD tiles: replace the small color squares with the player's photo (for bots) or a color-coded square with their initial (for human players)

### Modify
- `LobbyScreen`: add a timer slider/stepper (host only) and pass chosen duration up; show chosen duration in the "Time" info tile instead of hardcoded "100s"
- `App.tsx`: thread `gameDuration` state from lobby → `handleStartGame` → `GameScreen`
- `GameScreen`: replace `const GAME_DURATION = 200` with the `gameDuration` prop (default 100); fix the timer so it actually starts at the passed-in value
- `Scene.tsx` `BotCharacter`: render the photo in a visible square box (a flat plane with a visible border/frame mesh around it, billboard-facing), not an unframed bleed portrait
- Non-local human players in Scene.tsx: render the same photo-in-a-box style using the local player's assigned color as a fallback solid texture/color if no photo is assigned

### Remove
- The hardcoded `GAME_DURATION = 200` constant (replaced by prop)
- The hardcoded "100s" string in the LobbyScreen info tiles

## Implementation Plan
1. **LobbyScreen.tsx** — Add `gameDuration` prop (controlled by parent), `onDurationChange` callback. Host sees a row with – / + buttons or a slider (100–500, step 50). Non-host sees the value read-only. "Time" tile now shows `${gameDuration}s`.
2. **App.tsx** — Add `gameDuration` state (default 100). Pass `onDurationChange` to `LobbyScreen`. Pass `gameDuration` to `GameScreen`.
3. **GameScreen.tsx** — Accept `gameDuration?: number` prop (default 100). Replace `const GAME_DURATION = 200` with this prop. Initialize `timeRemaining` from it.
4. **Scene.tsx `BotCharacter`** — Change rendering to photo-in-a-box: a square flat plane (1×1) with the photo texture, wrapped by a thin border frame mesh (slightly larger plane with a solid color, rendered behind the photo plane). Keep billboard. Remove the cylinder body/legs — just show the framed photo box standing on the ground.
5. **Scene.tsx human players** — Apply the same framed-square-photo style. Since they have no uploaded photo, show a colored square with the player's color as the box fill, with their name above.
6. **GameScreen.tsx HUD scoreboard** — For bot players, load their photo as an `<img>` inside the scoreboard tile instead of a colored square.
