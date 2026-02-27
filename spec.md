# Cube Tag

## Current State
A 3D first-person tag game with rooms, bots with uploaded face photos, randomly generated maps (3D arena or 2D platformer), WASD + mouse controls, mobile D-pad support, and a configurable timer (100–500s).

## Requested Changes (Diff)

### Add
- Error boundary (`ThreeErrorBoundary`) wrapping each `BotCharacter` so texture load failures don't crash the whole scene
- `Suspense` fallback per bot: a simple colored box renders while the photo texture loads
- `BotFallback` component — shows a colored/glowing cube when a bot photo can't load

### Modify
- `BotCharacterInner`: switched from `useTexture` (drei) to `useLoader(TextureLoader, path)` (R3F) for more reliable texture loading with Suspense
- `BotCharacter`: now wraps inner in both `ThreeErrorBoundary` and `Suspense` with `BotFallback` as fallback
- `Canvas` in `GameScreen`: added explicit `near/far`, `frameloop="always"`, `powerPreference`, and explicit size style to ensure the renderer initializes correctly
- `PointerLockControls`: removed `makeDefault` prop (caused camera control conflicts in drei v10 / R3F v9)
- Camera `useEffect`: now also resets rotation and sets `rotation.order = "YXZ"` on mount

### Remove
- Nothing removed

## Implementation Plan
1. Rewrite `Scene.tsx` with error boundary + suspense per bot, use `useLoader` instead of `useTexture`, remove `makeDefault` from PointerLockControls, fix camera init
2. Update `Canvas` props in `GameScreen.tsx` for robust initialization
3. Typecheck and build verify
