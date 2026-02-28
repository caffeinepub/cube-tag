# Cube Tag

## Current State
- Players join rooms by entering a 6-character room code
- Backend stores rooms keyed by code; `getAllRooms()` query already exists but is unused
- `createRoom` takes a room code but no display name
- HomeScreen has a "Join Room" mode with a code input field
- LobbyScreen shows the room code prominently

## Requested Changes (Diff)

### Add
- `roomName` field to the `Room` and `RoomView` backend types
- `listOpenRooms()` query that returns all rooms currently in "lobby" status (joinable)
- Room browser UI in the Join flow: shows a live-refreshing list of open rooms globally with room name, player count, and map type
- Host can enter a custom room name when creating a room (shown as a text input before the controls picker)
- Each room card in the browser has a "Join" button; clicking it joins directly without typing a code
- Error feedback: if join fails for any reason, show "Unable to join room" clearly (not silent failure)

### Modify
- `createRoom` backend function: add `roomName: Text` parameter
- HomeScreen `onCreateRoom` prop: add `roomName: string` parameter
- App `handleCreateRoom`: accept and pass `roomName` to `createRoom`
- Join flow: replace the code-entry input with a room browser that lists open rooms; keep code input as a fallback secondary option ("have a code?")
- LobbyScreen: show room name instead of (or alongside) the room code display
- All join error messages simplified to "Unable to join room" (no technical details exposed to user)

### Remove
- Primary room-code-only join flow (code input becomes secondary/fallback)

## Implementation Plan
1. Backend: add `roomName` field to `Room`/`RoomView` types; update `createRoom` signature; add `listOpenRooms` query
2. Frontend HomeScreen: add room name input to the create flow; replace join mode with a room browser that polls `listOpenRooms` every 3s; add a small "have a code?" toggle for fallback code entry
3. Frontend App.tsx: pass `roomName` through `handleCreateRoom`; simplify all join error messages to "Unable to join room"
4. Frontend LobbyScreen: show room name in the header panel (alongside or instead of the bare code)
