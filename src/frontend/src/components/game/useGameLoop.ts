import { useCallback, useRef } from "react";
import type { ObstacleBox, PlayerState, Vec3 } from "../../types/game";
import { checkObstacleCollision } from "../../utils/mapGen";

const MAP_BOUND = 21;
const TAG_DISTANCE = 1.8;
const PLAYER_SPEED = 6;
const BOT_NORMAL_SPEED = 6;
const IT_SPEED_BONUS = 7.5; // Faster than before so IT can actually close the gap
const GRAVITY = 15;
const JUMP_VELOCITY = 9;
const BOT_JUMP_VELOCITY = 13;
const PLAYER_HALF_HEIGHT = 0.5;
const TAG_IMMUNITY_DURATION = 3.0;

// How long a bot sticks with the same target before randomly re-evaluating
const BOT_TARGET_SWITCH_MIN = 2.5;
const BOT_TARGET_SWITCH_MAX = 5.0;

// Predictive lead: how many seconds ahead to aim when chasing
const LEAD_TIME = 0.6;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function distance(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function distance2D(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(dx: number, dz: number): { dx: number; dz: number } {
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.0001) return { dx: 0, dz: 0 };
  return { dx: dx / len, dz: dz / len };
}

/** Resolve platformer landing: returns new Y and whether on ground */
function resolvePlatformerY(
  prevBottomY: number,
  newBottomY: number,
  posX: number,
  obstacles: ObstacleBox[],
): { landedY: number | null; onGround: boolean } {
  for (const obs of obstacles) {
    const ledgeTop = obs.position.y + obs.size.y / 2;
    const halfWidth = obs.size.x / 2 + 0.3;
    if (Math.abs(posX - obs.position.x) > halfWidth) continue;
    if (prevBottomY >= ledgeTop - 0.01 && newBottomY <= ledgeTop) {
      return { landedY: ledgeTop + PLAYER_HALF_HEIGHT, onGround: true };
    }
  }
  return { landedY: null, onGround: false };
}

export interface GameLoopRefs {
  playersRef: React.MutableRefObject<PlayerState[]>;
  keysRef: React.MutableRefObject<Set<string>>;
  obstaclesRef: React.MutableRefObject<ObstacleBox[]>;
}

// ── Per-bot persistent state maps ────────────────────────────────────────────
const botJumpTimers: Record<string, number> = {};
const botStuckTimers: Record<string, number> = {};
const botLastPos: Record<string, Vec3> = {};
const botRandomDirTimers: Record<string, number> = {};
const botRandomDirs: Record<string, { dx: number; dz: number }> = {};

// Smart AI state: which target each bot is chasing and for how long
const botTargetId: Record<string, string | null> = {};
const botTargetTimer: Record<string, number> = {};

// Per-player velocity for predictive lead when chasing them
const playerPrevPos: Record<string, Vec3> = {};
const playerVelocity: Record<string, { vx: number; vz: number }> = {};

/** Weighted-random target selection.
 *  Bots prefer closer targets slightly but randomise enough to spread.
 *  Ignores immune targets. Returns null if no valid target.
 */
function pickRandomTarget(
  botPos: Vec3,
  candidates: PlayerState[],
  currentTargetId: string | null,
): PlayerState | null {
  const valid = candidates.filter((p) => (p.tagImmunityTimer ?? 0) <= 0);
  if (valid.length === 0) return null;

  // Weight = 1 / (distance + 3) so near targets are slightly more likely
  // but not so overwhelmingly that it always picks the nearest
  const weights = valid.map((p) => {
    const d = distance(botPos, p.position);
    // Bias slightly away from the current target to encourage switching
    const samePenalty = p.id === currentTargetId ? 0.5 : 1.0;
    return (1 / (d + 3)) * samePenalty;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;
  for (let i = 0; i < valid.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return valid[i];
  }
  return valid[valid.length - 1];
}

/**
 * Improved bot navigation with predictive lead.
 * Tries 16 directions and picks the best navigable one.
 */
function findBestBotDirection(
  botPos: Vec3,
  targetPos: Vec3,
  speed: number,
  delta: number,
  obstacles: ObstacleBox[],
  isChasing: boolean,
): { dx: number; dz: number } {
  let desiredX = isChasing ? targetPos.x - botPos.x : botPos.x - targetPos.x;
  let desiredZ = isChasing ? targetPos.z - botPos.z : botPos.z - targetPos.z;

  const { dx: baseDx, dz: baseDz } = normalize(desiredX, desiredZ);

  const NUM_DIRS = 16;
  const candidates: { dx: number; dz: number; score: number }[] = [];

  for (let i = 0; i < NUM_DIRS; i++) {
    const angle = (i * Math.PI * 2) / NUM_DIRS;
    const rdx = baseDx * Math.cos(angle) - baseDz * Math.sin(angle);
    const rdz = baseDx * Math.sin(angle) + baseDz * Math.cos(angle);

    const nx = clamp(botPos.x + rdx * speed * delta, -MAP_BOUND, MAP_BOUND);
    const nz = clamp(botPos.z + rdz * speed * delta, -MAP_BOUND, MAP_BOUND);

    const { blocked, resolvedPos } = checkObstacleCollision(
      { x: nx, y: botPos.y, z: nz },
      obstacles,
    );

    if (blocked) continue;

    const newDist = distance(resolvedPos, targetPos);
    const score = isChasing ? -newDist : newDist;
    candidates.push({ dx: rdx, dz: rdz, score });
  }

  if (candidates.length === 0) {
    const angle = Math.random() * Math.PI * 2;
    return { dx: Math.cos(angle), dz: Math.sin(angle) };
  }

  candidates.sort((a, b) => b.score - a.score);
  return { dx: candidates[0].dx, dz: candidates[0].dz };
}

/** Returns a predicted future position for a target based on their velocity */
function predictTargetPos(target: PlayerState, leadTime: number): Vec3 {
  const vel = playerVelocity[target.id] ?? { vx: 0, vz: 0 };
  return {
    x: target.position.x + vel.vx * leadTime,
    y: target.position.y,
    z: target.position.z + vel.vz * leadTime,
  };
}

export function useGameLoopLogic(mapType: "3d" | "2d-platformer" = "3d") {
  const playersRef = useRef<PlayerState[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const obstaclesRef = useRef<ObstacleBox[]>([]);
  const cameraRef = useRef<{ rotation: { y: number } } | null>(null);
  const mouseDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const updateFrame = useCallback(
    (delta: number, onStateUpdate: (players: PlayerState[]) => void) => {
      const players = playersRef.current;
      const keys = keysRef.current;
      const obstacles = obstaclesRef.current;

      if (!players.length) return;

      const localPlayer = players.find((p) => p.isLocal);
      if (!localPlayer) return;

      // ── Update player velocity estimates for predictive lead ──────────────
      for (const p of players) {
        const prev = playerPrevPos[p.id];
        if (prev) {
          playerVelocity[p.id] = {
            vx: (p.position.x - prev.x) / delta,
            vz: (p.position.z - prev.z) / delta,
          };
        }
        playerPrevPos[p.id] = { ...p.position };
      }

      if (mapType === "2d-platformer") {
        // ── 2D PLATFORMER ────────────────────────────────────────────────────
        const currentYaw2D =
          cameraRef.current?.rotation.y ?? localPlayer.yaw ?? 0;

        const updatedPlayers = players.map((player) => {
          const isLocal = player.isLocal;
          const isBot = player.isBot;

          let velY = player.velocityY ?? 0;
          let onGround = player.onGround ?? false;
          let moveX = 0;
          let moveZ = 0;

          if (isLocal) {
            let strafeInput = 0;
            let forwardInput = 0;
            if (keys.has("ArrowLeft") || keys.has("KeyA")) strafeInput -= 1;
            if (keys.has("ArrowRight") || keys.has("KeyD")) strafeInput += 1;
            if (keys.has("ArrowDown") || keys.has("KeyS")) forwardInput -= 1;
            if (keys.has("ArrowUp") || keys.has("KeyW")) forwardInput += 1;

            const fwdX2 = -Math.sin(currentYaw2D);
            const fwdZ2 = -Math.cos(currentYaw2D);
            const srtX2 = Math.cos(currentYaw2D);
            const srtZ2 = -Math.sin(currentYaw2D);
            moveX = fwdX2 * forwardInput + srtX2 * strafeInput;
            moveZ = fwdZ2 * forwardInput + srtZ2 * strafeInput;

            if (keys.has("Space") && onGround) {
              velY = JUMP_VELOCITY;
              onGround = false;
            }
          } else if (isBot) {
            const itPlayer = players.find((p) => p.isIT);
            if (player.isIT) {
              // 2D chase: pick random target via weighted selection
              const targets = players.filter((p) => !p.isIT);
              const validTargets = targets.filter(
                (p) => (p.tagImmunityTimer ?? 0) <= 0,
              );
              if (validTargets.length > 0) {
                let chosen = validTargets[0];
                // Weighted random pick
                const weights = validTargets.map(
                  (p) => 1 / (Math.abs(p.position.x - player.position.x) + 2),
                );
                const total = weights.reduce((a, b) => a + b, 0);
                let r = Math.random() * total;
                for (let i = 0; i < validTargets.length; i++) {
                  r -= weights[i];
                  if (r <= 0) {
                    chosen = validTargets[i];
                    break;
                  }
                }
                moveX = chosen.position.x > player.position.x ? 1 : -1;
              } else {
                // All immune — wander
                moveX =
                  Math.sin(Date.now() * 0.001 + Number(player.id.slice(-1))) > 0
                    ? 1
                    : -1;
              }
            } else if (itPlayer) {
              moveX = player.position.x > itPlayer.position.x ? 1 : -1;
            }

            if (!botJumpTimers[player.id]) {
              botJumpTimers[player.id] = 1 + Math.random();
            }
            botJumpTimers[player.id] -= delta;
            if (botJumpTimers[player.id] <= 0 && onGround) {
              velY = BOT_JUMP_VELOCITY;
              onGround = false;
              botJumpTimers[player.id] = 1 + Math.random();
            }
          }

          const botSpeed = player.isIT ? IT_SPEED_BONUS : BOT_NORMAL_SPEED;
          velY -= GRAVITY * delta;

          const rawX =
            player.position.x +
            moveX * (isLocal ? PLAYER_SPEED : botSpeed) * delta;
          const rawZ =
            player.position.z +
            moveZ * (isLocal ? PLAYER_SPEED : botSpeed) * delta;
          const newX = clamp(rawX, -MAP_BOUND, MAP_BOUND);
          const newZ = clamp(rawZ, -MAP_BOUND, MAP_BOUND);
          const prevBottomY = player.position.y - PLAYER_HALF_HEIGHT;
          const newY = player.position.y + velY * delta;
          const newBottomY = newY - PLAYER_HALF_HEIGHT;

          const { landedY, onGround: landed } = resolvePlatformerY(
            prevBottomY,
            newBottomY,
            newX,
            obstacles,
          );

          let finalY: number;
          let finalVelY: number;
          let finalOnGround: boolean;

          if (landed && landedY !== null) {
            finalY = landedY;
            finalVelY = 0;
            finalOnGround = true;
          } else {
            const groundFloor = PLAYER_HALF_HEIGHT;
            if (newY < groundFloor) {
              finalY = groundFloor;
              finalVelY = 0;
              finalOnGround = true;
            } else {
              finalY = newY;
              finalVelY = velY;
              finalOnGround = false;
            }
          }

          const newImmunity = Math.max(
            0,
            (player.tagImmunityTimer ?? 0) - delta,
          );

          return {
            ...player,
            position: { x: newX, y: finalY, z: newZ },
            velocityY: finalVelY,
            onGround: finalOnGround,
            tagImmunityTimer: newImmunity,
          };
        });

        const currentIT = updatedPlayers.find((p) => p.isIT);
        if (!currentIT) {
          playersRef.current = updatedPlayers;
          onStateUpdate(updatedPlayers);
          return;
        }

        let finalPlayers = updatedPlayers;
        const nonITPlayers = updatedPlayers.filter(
          (p) => !p.isIT && (p.tagImmunityTimer ?? 0) <= 0,
        );
        for (const target of nonITPlayers) {
          if (distance2D(currentIT.position, target.position) < TAG_DISTANCE) {
            finalPlayers = updatedPlayers.map((p) => {
              if (p.id === currentIT.id)
                return {
                  ...p,
                  isIT: false,
                  tagImmunityTimer: TAG_IMMUNITY_DURATION,
                };
              if (p.id === target.id) return { ...p, isIT: true };
              return p;
            });
            break;
          }
        }

        playersRef.current = finalPlayers;
        onStateUpdate(finalPlayers);
        return;
      }

      // ── 3D FIRST-PERSON MODE ─────────────────────────────────────────────

      const currentYaw = cameraRef.current?.rotation.y ?? localPlayer.yaw ?? 0;

      let forwardInput = 0;
      let strafeInput = 0;

      if (keys.has("ArrowUp") || keys.has("KeyW")) forwardInput += 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) forwardInput -= 1;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) strafeInput -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) strafeInput += 1;

      const fwdX = -Math.sin(currentYaw);
      const fwdZ = -Math.cos(currentYaw);
      const strafeX = Math.cos(currentYaw);
      const strafeZ = -Math.sin(currentYaw);

      const moveX = fwdX * forwardInput + strafeX * strafeInput;
      const moveZ = fwdZ * forwardInput + strafeZ * strafeInput;

      const { dx: ndx, dz: ndz } = normalize(moveX, moveZ);
      const newLocalX = clamp(
        localPlayer.position.x + ndx * PLAYER_SPEED * delta,
        -MAP_BOUND,
        MAP_BOUND,
      );
      const newLocalZ = clamp(
        localPlayer.position.z + ndz * PLAYER_SPEED * delta,
        -MAP_BOUND,
        MAP_BOUND,
      );
      const newLocalPos: Vec3 = { x: newLocalX, y: 0.5, z: newLocalZ };

      const { resolvedPos: localResolved } = checkObstacleCollision(
        newLocalPos,
        obstacles,
      );
      localResolved.y = 0.5;

      const itPlayer = players.find((p) => p.isIT);

      const updatedPlayers = players.map((player) => {
        if (player.isLocal) {
          const newImmunity = Math.max(
            0,
            (player.tagImmunityTimer ?? 0) - delta,
          );
          return {
            ...player,
            position: localResolved,
            yaw: currentYaw,
            tagImmunityTimer: newImmunity,
          };
        }

        if (!player.isBot) {
          const newImmunity = Math.max(
            0,
            (player.tagImmunityTimer ?? 0) - delta,
          );
          return { ...player, tagImmunityTimer: newImmunity };
        }

        const speed = player.isIT ? IT_SPEED_BONUS : BOT_NORMAL_SPEED;
        const newImmunity = Math.max(0, (player.tagImmunityTimer ?? 0) - delta);

        // ── Determine target ────────────────────────────────────────────────
        let targetPos: Vec3;
        let isChasing: boolean;

        if (player.isIT) {
          // Non-IT targets that are not immune
          const chaseable = players.filter(
            (p) => !p.isIT && (p.tagImmunityTimer ?? 0) <= 0,
          );

          if (chaseable.length === 0) {
            // All targets immune — wander toward center with a slight random wobble
            const wanderAngle =
              Date.now() * 0.0008 + Number(player.id.replace(/\D/g, "")) * 1.3;
            const wanderRadius = 6;
            targetPos = {
              x: Math.cos(wanderAngle) * wanderRadius,
              y: 0.5,
              z: Math.sin(wanderAngle) * wanderRadius,
            };
            isChasing = true;
          } else {
            // Validate persisted target
            const persistedId = botTargetId[player.id];
            const persistedTarget = persistedId
              ? chaseable.find((p) => p.id === persistedId)
              : null;

            const timerExpired = (botTargetTimer[player.id] ?? 0) <= 0;
            const needNewTarget = !persistedTarget || timerExpired;

            if (needNewTarget) {
              // Pick a weighted-random new target
              const picked = pickRandomTarget(
                player.position,
                chaseable,
                persistedId ?? null,
              );
              if (picked) {
                botTargetId[player.id] = picked.id;
                botTargetTimer[player.id] =
                  BOT_TARGET_SWITCH_MIN +
                  Math.random() *
                    (BOT_TARGET_SWITCH_MAX - BOT_TARGET_SWITCH_MIN);
              }
            } else {
              // Tick down the timer
              botTargetTimer[player.id] -= delta;
            }

            const chosenTarget =
              chaseable.find((p) => p.id === botTargetId[player.id]) ??
              chaseable[0];

            // Predictive lead: aim slightly ahead of where target is moving
            targetPos = predictTargetPos(chosenTarget, LEAD_TIME);
            isChasing = true;
          }
        } else {
          // Flee from IT
          if (!itPlayer) {
            return { ...player, tagImmunityTimer: newImmunity };
          }
          targetPos = itPlayer.position;
          isChasing = false;

          // Clear stored chase target when not IT
          botTargetId[player.id] = null;
          botTargetTimer[player.id] = 0;
        }

        // ── Stuck detection ─────────────────────────────────────────────────
        const lastPos = botLastPos[player.id];
        if (!lastPos) {
          botLastPos[player.id] = { ...player.position };
          botStuckTimers[player.id] = 0;
        } else {
          const moved = distance(player.position, lastPos);
          if (moved < 0.05 * delta * 60) {
            botStuckTimers[player.id] =
              (botStuckTimers[player.id] ?? 0) + delta;
          } else {
            botStuckTimers[player.id] = 0;
          }
          botLastPos[player.id] = { ...player.position };
        }

        // Random direction escape when stuck
        if (botRandomDirTimers[player.id] > 0) {
          botRandomDirTimers[player.id] -= delta;
          const rd = botRandomDirs[player.id] ?? { dx: 1, dz: 0 };
          const nx = clamp(
            player.position.x + rd.dx * speed * delta,
            -MAP_BOUND,
            MAP_BOUND,
          );
          const nz = clamp(
            player.position.z + rd.dz * speed * delta,
            -MAP_BOUND,
            MAP_BOUND,
          );
          const { resolvedPos } = checkObstacleCollision(
            { x: nx, y: 0.5, z: nz },
            obstacles,
          );
          resolvedPos.y = 0.5;
          return {
            ...player,
            position: resolvedPos,
            tagImmunityTimer: newImmunity,
          };
        }

        if ((botStuckTimers[player.id] ?? 0) > 0.6) {
          botStuckTimers[player.id] = 0;
          botRandomDirTimers[player.id] = 0.6;
          // Force a new target pick next time
          botTargetTimer[player.id] = 0;
          const angle = Math.random() * Math.PI * 2;
          botRandomDirs[player.id] = {
            dx: Math.cos(angle),
            dz: Math.sin(angle),
          };
        }

        // ── Find best movement direction ─────────────────────────────────────
        const bestDir = findBestBotDirection(
          player.position,
          targetPos,
          speed,
          delta,
          obstacles,
          isChasing,
        );

        const nx = clamp(
          player.position.x + bestDir.dx * speed * delta,
          -MAP_BOUND,
          MAP_BOUND,
        );
        const nz = clamp(
          player.position.z + bestDir.dz * speed * delta,
          -MAP_BOUND,
          MAP_BOUND,
        );
        const { resolvedPos: botResolved } = checkObstacleCollision(
          { x: nx, y: 0.5, z: nz },
          obstacles,
        );
        botResolved.y = 0.5;

        return {
          ...player,
          position: botResolved,
          tagImmunityTimer: newImmunity,
        };
      });

      // ── Tag detection ─────────────────────────────────────────────────────
      const currentIT = updatedPlayers.find((p) => p.isIT);
      if (!currentIT) {
        playersRef.current = updatedPlayers;
        onStateUpdate(updatedPlayers);
        return;
      }

      let finalPlayers = updatedPlayers;

      const nonITPlayers = updatedPlayers.filter(
        (p) => !p.isIT && (p.tagImmunityTimer ?? 0) <= 0,
      );
      for (const target of nonITPlayers) {
        if (distance(currentIT.position, target.position) < TAG_DISTANCE) {
          // Invalidate the IT bot's target so it picks a new one next frame
          if (currentIT.isBot) {
            botTargetId[currentIT.id] = null;
            botTargetTimer[currentIT.id] = 0;
          }
          finalPlayers = updatedPlayers.map((p) => {
            if (p.id === currentIT.id) {
              return {
                ...p,
                isIT: false,
                tagImmunityTimer: TAG_IMMUNITY_DURATION,
              };
            }
            if (p.id === target.id) {
              return { ...p, isIT: true, tagImmunityTimer: 0 };
            }
            return p;
          });
          break;
        }
      }

      playersRef.current = finalPlayers;
      onStateUpdate(finalPlayers);
    },
    [mapType],
  );

  return {
    playersRef,
    keysRef,
    obstaclesRef,
    cameraRef,
    mouseDeltaRef,
    updateFrame,
  };
}
