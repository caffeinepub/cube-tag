import { useCallback, useRef } from "react";
import type { ObstacleBox, PlayerState, Vec3 } from "../../types/game";
import { checkObstacleCollision } from "../../utils/mapGen";

const MAP_BOUND = 19.5;
const TAG_DISTANCE = 1.6;
const PLAYER_SPEED = 5;
const BOT_CHASE_SPEED = 4;
const BOT_FLEE_SPEED = 3.5;
const GRAVITY = 15;
const JUMP_VELOCITY = 9;
const PLAYER_HALF_HEIGHT = 0.5;

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
  // Check all platforms for landing
  for (const obs of obstacles) {
    const ledgeTop = obs.position.y + obs.size.y / 2;
    const halfWidth = obs.size.x / 2 + 0.3;

    // Player X must be within ledge bounds
    if (Math.abs(posX - obs.position.x) > halfWidth) continue;

    // Was above ledge top before, now at or below it
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

export function useGameLoopLogic(mapType: "3d" | "2d-platformer" = "3d") {
  const playersRef = useRef<PlayerState[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const obstaclesRef = useRef<ObstacleBox[]>([]);

  const updateFrame = useCallback(
    (delta: number, onStateUpdate: (players: PlayerState[]) => void) => {
      const players = playersRef.current;
      const keys = keysRef.current;
      const obstacles = obstaclesRef.current;

      if (!players.length) return;

      const localPlayer = players.find((p) => p.isLocal);
      if (!localPlayer) return;

      if (mapType === "2d-platformer") {
        // ── 2D PLATFORMER MODE ──────────────────────────────────────────────

        const updatedPlayers = players.map((player) => {
          const isLocal = player.isLocal;
          const isBot = player.isBot;

          let velY = player.velocityY ?? 0;
          let onGround = player.onGround ?? false;

          let moveX = 0;

          if (isLocal) {
            // Left / right movement
            if (keys.has("ArrowLeft") || keys.has("KeyA")) moveX -= 1;
            if (keys.has("ArrowRight") || keys.has("KeyD")) moveX += 1;

            // Jump
            if (
              (keys.has("Space") || keys.has("KeyW") || keys.has("ArrowUp")) &&
              onGround
            ) {
              velY = JUMP_VELOCITY;
              onGround = false;
            }
          } else if (isBot) {
            // Bot left/right chase/flee
            const itPlayer = players.find((p) => p.isIT);
            if (player.isIT) {
              // Chase nearest non-IT
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
                moveX =
                  nearest.position.x > player.position.x
                    ? BOT_CHASE_SPEED
                    : -BOT_CHASE_SPEED;
              }
            } else if (itPlayer) {
              // Flee from IT
              moveX =
                player.position.x > itPlayer.position.x
                  ? BOT_FLEE_SPEED
                  : -BOT_FLEE_SPEED;
            }

            // Bot random jump
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

          // Apply gravity
          velY -= GRAVITY * delta;

          // Compute new positions
          const newX = clamp(
            player.position.x + moveX * delta,
            -MAP_BOUND,
            MAP_BOUND,
          );
          const prevBottomY = player.position.y - PLAYER_HALF_HEIGHT;
          const newY = player.position.y + velY * delta;
          const newBottomY = newY - PLAYER_HALF_HEIGHT;

          // Platform landing
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
            // Ground floor safety
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

          return {
            ...player,
            position: { x: newX, y: finalY, z: 0 },
            velocityY: finalVelY,
            onGround: finalOnGround,
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
        const nonITPlayers = updatedPlayers.filter((p) => !p.isIT);
        for (const target of nonITPlayers) {
          if (distance2D(currentIT.position, target.position) < TAG_DISTANCE) {
            finalPlayers = updatedPlayers.map((p) => {
              if (p.id === currentIT.id) return { ...p, isIT: false };
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

      // ── 3D MODE (original) ───────────────────────────────────────────────

      // --- Move local player ---
      let moveX = 0;
      let moveZ = 0;

      if (keys.has("ArrowUp") || keys.has("KeyW")) moveZ -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) moveZ += 1;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) moveX -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) moveX += 1;

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

      // --- Move bots ---
      const itPlayer = players.find((p) => p.isIT);

      const updatedPlayers = players.map((player) => {
        if (player.isLocal) {
          return { ...player, position: localResolved };
        }

        if (!player.isBot) return player;

        let botMoveX = 0;
        let botMoveZ = 0;
        const speed = player.isIT ? BOT_CHASE_SPEED : BOT_FLEE_SPEED;

        if (player.isIT) {
          // Chase nearest non-IT player
          const targets = players.filter((p) => !p.isIT);
          if (targets.length > 0) {
            let nearest = targets[0];
            let nearestDist = distance(player.position, targets[0].position);
            for (const t of targets) {
              const d = distance(player.position, t.position);
              if (d < nearestDist) {
                nearestDist = d;
                nearest = t;
              }
            }
            botMoveX = nearest.position.x - player.position.x;
            botMoveZ = nearest.position.z - player.position.z;
          }
        } else {
          // Flee from IT
          if (itPlayer) {
            botMoveX = player.position.x - itPlayer.position.x;
            botMoveZ = player.position.z - itPlayer.position.z;

            // Add some randomness to avoid clustering
            const noise = (Math.random() - 0.5) * 2;
            botMoveX += noise;
            botMoveZ += noise;
          }
        }

        const { dx: bndx, dz: bndz } = normalize(botMoveX, botMoveZ);
        const newBotX = clamp(
          player.position.x + bndx * speed * delta,
          -MAP_BOUND,
          MAP_BOUND,
        );
        const newBotZ = clamp(
          player.position.z + bndz * speed * delta,
          -MAP_BOUND,
          MAP_BOUND,
        );

        const newBotPos: Vec3 = { x: newBotX, y: 0.5, z: newBotZ };
        const { resolvedPos: botResolved, blocked } = checkObstacleCollision(
          newBotPos,
          obstacles,
        );

        // Simple steering: if blocked, try perpendicular
        if (blocked) {
          const perpX = clamp(
            player.position.x + bndz * speed * delta,
            -MAP_BOUND,
            MAP_BOUND,
          );
          const perpZ = clamp(
            player.position.z - bndx * speed * delta,
            -MAP_BOUND,
            MAP_BOUND,
          );
          const { resolvedPos: perpResolved } = checkObstacleCollision(
            { x: perpX, y: 0.5, z: perpZ },
            obstacles,
          );
          perpResolved.y = 0.5;
          return { ...player, position: perpResolved };
        }

        botResolved.y = 0.5;
        return { ...player, position: botResolved };
      });

      // --- Tag detection ---
      const currentIT = updatedPlayers.find((p) => p.isIT);
      if (!currentIT) {
        onStateUpdate(updatedPlayers);
        return;
      }

      let finalPlayers = updatedPlayers;

      // Check if IT player (whether local or bot) tags a non-IT player
      const nonITPlayers = updatedPlayers.filter((p) => !p.isIT);
      for (const target of nonITPlayers) {
        if (distance(currentIT.position, target.position) < TAG_DISTANCE) {
          // Tag! currentIT becomes safe, target becomes IT
          finalPlayers = updatedPlayers.map((p) => {
            if (p.id === currentIT.id) return { ...p, isIT: false };
            if (p.id === target.id) return { ...p, isIT: true };
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

  return { playersRef, keysRef, obstaclesRef, updateFrame };
}
