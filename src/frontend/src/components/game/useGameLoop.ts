import { useCallback, useRef } from "react";
import type { ObstacleBox, PlayerState, Vec3 } from "../../types/game";
import { checkObstacleCollision } from "../../utils/mapGen";

const MAP_BOUND = 21;
const TAG_DISTANCE = 1.8;
const PLAYER_SPEED = 6;
const BOT_NORMAL_SPEED = 6;
const IT_SPEED_BONUS = 6.9; // IT is ~15% faster than normal
const GRAVITY = 15;
const JUMP_VELOCITY = 9;
const PLAYER_HALF_HEIGHT = 0.5;
const TAG_IMMUNITY_DURATION = 3.0;

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

/** Bot jump timer ref: map of botId -> time until next jump */
const botJumpTimers: Record<string, number> = {};

/** Bot stuck timer: tracks how long each bot has been nearly stationary */
const botStuckTimers: Record<string, number> = {};
const botLastPos: Record<string, Vec3> = {};
const botRandomDirTimers: Record<string, number> = {};
const botRandomDirs: Record<string, { dx: number; dz: number }> = {};

/**
 * Improved bot navigation: try 8 directions and pick the one that
 * moves the bot most toward the target.
 */
function findBestBotDirection(
  botPos: Vec3,
  targetPos: Vec3,
  speed: number,
  delta: number,
  obstacles: ObstacleBox[],
  isChasing: boolean,
): { dx: number; dz: number } {
  // Desired direction toward (or away from) target
  let desiredX = isChasing ? targetPos.x - botPos.x : botPos.x - targetPos.x;
  let desiredZ = isChasing ? targetPos.z - botPos.z : botPos.z - targetPos.z;

  const { dx: baseDx, dz: baseDz } = normalize(desiredX, desiredZ);

  // Try 8 directions: start with desired direction, then rotate by 45° increments
  const candidates: { dx: number; dz: number; score: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    // Rotate the base direction by angle
    const rdx = baseDx * Math.cos(angle) - baseDz * Math.sin(angle);
    const rdz = baseDx * Math.sin(angle) + baseDz * Math.cos(angle);

    const nx = clamp(botPos.x + rdx * speed * delta, -MAP_BOUND, MAP_BOUND);
    const nz = clamp(botPos.z + rdz * speed * delta, -MAP_BOUND, MAP_BOUND);

    const { blocked, resolvedPos } = checkObstacleCollision(
      { x: nx, y: botPos.y, z: nz },
      obstacles,
    );

    if (blocked) continue;

    // Score = how close to target (or far from target if fleeing)
    const newDist = distance(resolvedPos, targetPos);
    const score = isChasing ? -newDist : newDist;

    candidates.push({ dx: rdx, dz: rdz, score });
  }

  if (candidates.length === 0) {
    // Completely stuck — return a random direction
    const angle = Math.random() * Math.PI * 2;
    return { dx: Math.cos(angle), dz: Math.sin(angle) };
  }

  // Pick the best scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  return { dx: candidates[0].dx, dz: candidates[0].dz };
}

export function useGameLoopLogic(mapType: "3d" | "2d-platformer" = "3d") {
  const playersRef = useRef<PlayerState[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const obstaclesRef = useRef<ObstacleBox[]>([]);
  // cameraRef: will be set by Scene to the Three.js camera for reading yaw
  const cameraRef = useRef<{ rotation: { y: number } } | null>(null);
  // mouseDeltaRef: Scene writes mouse movement, game loop reads it
  const mouseDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const updateFrame = useCallback(
    (delta: number, onStateUpdate: (players: PlayerState[]) => void) => {
      const players = playersRef.current;
      const keys = keysRef.current;
      const obstacles = obstaclesRef.current;

      if (!players.length) return;

      const localPlayer = players.find((p) => p.isLocal);
      if (!localPlayer) return;

      if (mapType === "2d-platformer") {
        // ── 2D PLATFORMER FIRST-PERSON MODE ─────────────────────────────────
        // Local player moves left/right (A/D) relative to their yaw, plus jump (Space/W)
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

            // Yaw-relative horizontal movement
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
              const targets = players.filter((p) => !p.isIT);
              if (targets.length > 0) {
                let nearest = targets[0];
                let nearestDist = distance2D(
                  player.position,
                  targets[0].position,
                );
                for (const t of targets) {
                  const d = distance2D(player.position, t.position);
                  if (d < nearestDist) {
                    nearestDist = d;
                    nearest = t;
                  }
                }
                // chase: move toward nearest target on X axis
                moveX = nearest.position.x > player.position.x ? 1 : -1;
              }
            } else if (itPlayer) {
              // flee: move away from IT on X axis
              moveX = player.position.x > itPlayer.position.x ? 1 : -1;
            }

            if (!botJumpTimers[player.id]) {
              botJumpTimers[player.id] = 1 + Math.random();
            }
            botJumpTimers[player.id] -= delta;
            if (botJumpTimers[player.id] <= 0 && onGround) {
              velY = JUMP_VELOCITY;
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

          // Countdown tag immunity
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

        // Tag detection (2D distance)
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

      // Get yaw from camera (set by Scene's PointerLockControls)
      const currentYaw = cameraRef.current?.rotation.y ?? localPlayer.yaw ?? 0;

      // First-person WASD movement relative to yaw
      let forwardInput = 0;
      let strafeInput = 0;

      if (keys.has("ArrowUp") || keys.has("KeyW")) forwardInput += 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) forwardInput -= 1;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) strafeInput -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) strafeInput += 1;

      // Convert to world-space movement using yaw
      // Forward direction: (-sin(yaw), 0, -cos(yaw)) in Three.js coords
      const fwdX = -Math.sin(currentYaw);
      const fwdZ = -Math.cos(currentYaw);
      // Strafe right: perpendicular
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

      // --- Move bots with improved wall avoidance ---
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

        // Determine target position
        let targetPos: Vec3;
        let isChasing: boolean;

        if (player.isIT) {
          // Chase nearest non-IT player
          const targets = players.filter((p) => !p.isIT);
          if (targets.length === 0) {
            return { ...player, tagImmunityTimer: newImmunity };
          }
          let nearest = targets[0];
          let nearestDist = distance(player.position, targets[0].position);
          for (const t of targets) {
            const d = distance(player.position, t.position);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = t;
            }
          }
          targetPos = nearest.position;
          isChasing = true;
        } else {
          // Flee from IT
          if (!itPlayer) {
            return { ...player, tagImmunityTimer: newImmunity };
          }
          targetPos = itPlayer.position;
          isChasing = false;
        }

        // Check if bot is stuck
        const lastPos = botLastPos[player.id];
        if (!lastPos) {
          botLastPos[player.id] = { ...player.position };
          botStuckTimers[player.id] = 0;
        } else {
          const moved = distance(player.position, lastPos);
          if (moved < 0.05 * delta * 60) {
            // Barely moved
            botStuckTimers[player.id] =
              (botStuckTimers[player.id] ?? 0) + delta;
          } else {
            botStuckTimers[player.id] = 0;
          }
          botLastPos[player.id] = { ...player.position };
        }

        // Check if in random direction mode (unstuck)
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

        // If stuck for > 0.8s, start random direction for 0.5s
        if ((botStuckTimers[player.id] ?? 0) > 0.8) {
          botStuckTimers[player.id] = 0;
          botRandomDirTimers[player.id] = 0.5;
          const angle = Math.random() * Math.PI * 2;
          botRandomDirs[player.id] = {
            dx: Math.cos(angle),
            dz: Math.sin(angle),
          };
        }

        // Find best direction navigating around walls
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

      // --- Tag detection ---
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
