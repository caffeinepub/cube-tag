# Cube Tag

## Current State
- Fully local/client-side game -- no real multiplayer. Room codes are generated but only exist in each browser tab's memory.
- Joining with a code creates a brand new local room with 3 bots rather than connecting to an existing room.
- Backend has only two read-only queries (getRoomState, getAllRooms) with no mutations.
- Lobby shows "Players (X/4)" hardcoded to 4 slots.
- 3 AI bots are always added alongside the 1 human player.

## Requested Changes (Diff)

### Add
- Backend mutations: `createRoom`, `joinRoom`, `leaveRoom`, `kickPlayer`, `startGame`, `syncRoomState` so rooms are stored server-side and shared across devices.
- Real join-by-code: when a player enters an existing room code, they join that room and see the host's lobby.
- Max 10 real players per room; lobby shows up to 10 human slots.
- AI slot logic: total slots shown = 4. Human players count toward those 4 slots. Missing slots are filled with AI bots (so 1 human = 3 bots, 2 humans = 2 bots, 3 humans = 1 bot, 4+ humans = 0 bots). Up to 10 real humans can join but only 4 entities play at a time (the rest wait or spectate -- simplest: cap play slots at 10 and let bots fill remaining up to 4 minimum visible entities).

### Modify
- `handleJoinRoom` in App.tsx: query backend for the room code; if found, join it and sync lobby state from backend. If not found, show error rather than creating a new room.
- `handleCreateRoom` in App.tsx: persist room to backend via `createRoom` mutation.
- LobbyScreen: poll backend room state every 2 seconds so joining players appear live.
- Player count display: show `Players (X/10)` for real human slots.
- Bot count: always fill remaining slots up to 4 total visible players with AI bots.

### Remove
- The behaviour where typing any code creates a brand new local-only room.

## Implementation Plan
1. Rewrite backend `main.mo` with createRoom, joinRoom, leaveRoom, kickPlayer, updateRoomState, startGame mutations plus improved getRoomState/getAllRooms queries.
2. Regenerate backend bindings (generate_motoko_code).
3. Update App.tsx to call backend createRoom on host create, call backend joinRoom on join (error if room not found), poll getRoomState every 2s in lobby.
4. Update LobbyScreen to show Players (X/10) and dynamically add bots to fill to 4 visible entities.
5. Validate, build, deploy.
