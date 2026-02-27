import type { ObstacleBox, Vec3 } from "../types/game";
import {
  createSeededRandom,
  randomInRange,
  randomIntInRange,
} from "./seededRandom";

const OBSTACLE_COLORS = [
  "#4a3728", // dark brown
  "#5a4a3a", // medium brown
  "#3d4a2e", // dark olive
  "#4a5040", // muted green
  "#5a5260", // slate gray
  "#4a4a55", // blue-gray
  "#6a5a4a", // tan
  "#3a4a4a", // teal-gray
];

const MAP_SIZE = 20; // -20 to 20
const CLEAR_ZONE = 4; // Center clear zone radius

function boxesOverlap(
  pos1: Vec3,
  size1: Vec3,
  pos2: Vec3,
  size2: Vec3,
  padding = 0.5,
): boolean {
  return (
    Math.abs(pos1.x - pos2.x) < (size1.x + size2.x) / 2 + padding &&
    Math.abs(pos1.z - pos2.z) < (size1.z + size2.z) / 2 + padding
  );
}

export function generateMap(seed: number): ObstacleBox[] {
  const rng = createSeededRandom(seed);
  const obstacles: ObstacleBox[] = [];
  const count = randomIntInRange(rng, 35, 50);

  for (let i = 0; i < count * 5 && obstacles.length < count; i++) {
    const sizeX = randomInRange(rng, 1, 3.5);
    const sizeY = randomInRange(rng, 0.8, 3);
    const sizeZ = randomInRange(rng, 1, 3.5);

    const posX = randomInRange(rng, -(MAP_SIZE - 2), MAP_SIZE - 2);
    const posZ = randomInRange(rng, -(MAP_SIZE - 2), MAP_SIZE - 2);
    const posY = sizeY / 2;

    const size: Vec3 = { x: sizeX, y: sizeY, z: sizeZ };
    const pos: Vec3 = { x: posX, y: posY, z: posZ };

    // Skip if in clear zone
    if (Math.abs(posX) < CLEAR_ZONE && Math.abs(posZ) < CLEAR_ZONE) continue;

    // Check overlaps with existing obstacles
    let overlaps = false;
    for (const obs of obstacles) {
      if (boxesOverlap(pos, size, obs.position, obs.size)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    obstacles.push({
      id: `obs-${i}`,
      position: pos,
      size,
      color: OBSTACLE_COLORS[Math.floor(rng() * OBSTACLE_COLORS.length)],
    });
  }

  return obstacles;
}

const PLATFORMER_COLORS = [
  "#00ffcc", // neon teal
  "#ff44aa", // neon pink
  "#ffee00", // neon yellow
  "#44aaff", // neon blue
  "#ff6600", // neon orange
  "#cc44ff", // neon purple
  "#00ff66", // neon green
  "#ff2255", // neon red
];

export function generatePlatformerMap(seed: number): ObstacleBox[] {
  const rng = createSeededRandom(seed);
  const obstacles: ObstacleBox[] = [];

  // Ground floor platform
  obstacles.push({
    id: "platform-ground",
    position: { x: 0, y: 0.2, z: 0 },
    size: { x: 40, y: 0.4, z: 2 },
    color: "#2a1f4a",
  });

  // Generate floating ledges
  const count = randomIntInRange(rng, 10, 16);
  for (let i = 0; i < count; i++) {
    const width = randomInRange(rng, 3, 8);
    const height = 0.4;
    const depth = 2;

    const posX = randomInRange(rng, -14, 14);
    // Top surface Y ranges from 1.5 to 10
    const topY = randomInRange(rng, 1.5, 10);
    // Center Y = topY - height/2
    const posY = topY - height / 2;

    const colorIdx = Math.floor(rng() * PLATFORMER_COLORS.length);

    obstacles.push({
      id: `platform-${i}`,
      position: { x: posX, y: posY, z: 0 },
      size: { x: width, y: height, z: depth },
      color: PLATFORMER_COLORS[colorIdx],
    });
  }

  return obstacles;
}

export function checkObstacleCollision(
  newPos: Vec3,
  obstacles: ObstacleBox[],
  playerRadius = 0.5,
): { blocked: boolean; resolvedPos: Vec3 } {
  let resolvedPos = { ...newPos };
  let blocked = false;

  for (const obs of obstacles) {
    const halfX = obs.size.x / 2 + playerRadius;
    const halfZ = obs.size.z / 2 + playerRadius;

    const dx = resolvedPos.x - obs.position.x;
    const dz = resolvedPos.z - obs.position.z;

    if (Math.abs(dx) < halfX && Math.abs(dz) < halfZ) {
      blocked = true;
      // Push out on the axis with least penetration
      const penX = halfX - Math.abs(dx);
      const penZ = halfZ - Math.abs(dz);

      if (penX < penZ) {
        resolvedPos.x += dx > 0 ? penX : -penX;
      } else {
        resolvedPos.z += dz > 0 ? penZ : -penZ;
      }
    }
  }

  return { blocked, resolvedPos };
}
