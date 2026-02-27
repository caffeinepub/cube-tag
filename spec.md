# Cube Tag

## Current State
First-person 3D/2D multiplayer tag game. Bots chase the nearest non-IT player when IT, flee from IT when not IT. IT bots move at speed 6.9 vs normal 6. Bots have basic wall-avoidance (8-angle sampling) and a stuck-detection random-direction escape. Tag immunity is 3 seconds.

## Requested Changes (Diff)

### Add
- Random target selection: IT bots pick a random non-immune target and stick with it for 2–4 seconds before re-evaluating, instead of always chasing the closest
- Target re-evaluation triggers: switch target when current target gains immunity, when current target is tagged, or when timer expires
- Complex AI behaviors: predictive lead (bot aims slightly ahead of where target is moving), flanking angle bias (bots don't all pile in from the same direction), patrol/wander state when no valid target is available
- IT bots respect immunity: bots skip immune targets when selecting who to chase
- Slightly faster IT speed (7.5 instead of 6.9) so bots can break the immunity-camping loop

### Modify
- `IT_SPEED_BONUS`: 6.9 → 7.5
- `findBestBotDirection`: add predictive offset to target position when chasing
- Bot target selection: replace nearest-target loop with weighted random selection, persisted per bot in a `botTargetId` map
- Bot state machine: add `botState` per bot (chasing | fleeing | wandering), stored in a ref map

### Remove
- Nothing removed

## Implementation Plan
1. Add `botTargetId` and `botTargetTimer` maps alongside existing `botJumpTimers`/`botLastPos`
2. Add `pickRandomTarget` helper that picks from non-immune, non-IT players with slight distance weighting (closer = slightly higher weight but not always picked)
3. Update IT bot chase logic: look up persisted target, validate it's still valid, refresh if timer expired or target immune/tagged, otherwise use it
4. Add predictive lead: offset targetPos by `target.velocity * lookAheadTime` when chasing (estimate velocity from pos delta)
5. Add per-bot velocity estimation: `botPrevPos` map → compute `(currentPos - prevPos) / delta` each frame
6. Raise `IT_SPEED_BONUS` to 7.5
7. Add wander state: if bot is IT and all targets are immune, bot wanders randomly near center rather than camping at last known position
