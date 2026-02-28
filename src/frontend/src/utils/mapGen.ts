import type { ObstacleBox, PosterAnchor, Vec3 } from "../types/game";
import {
  createSeededRandom,
  randomInRange,
  randomIntInRange,
} from "./seededRandom";

// Neon colors for 3D arena obstacles
const OBSTACLE_COLORS = [
  "#0a1f6e", // deep blue
  "#1a0a5e", // deep purple
  "#0a3a6e", // dark teal-blue
  "#2a0a5e", // violet
  "#0a4a5e", // dark cyan
  "#3a0a6e", // indigo
  "#0a2a4e", // navy
  "#1a3a5e", // slate blue
  "#0a5a6e", // dark teal
  "#2a1a6e", // dark blue-purple
];

const MAP_SIZE = 32; // -32 to 32
const CLEAR_ZONE = 6; // Center clear zone radius

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

export function generateMap(seed: number): {
  obstacles: ObstacleBox[];
  posterAnchors: PosterAnchor[];
} {
  const rng = createSeededRandom(seed);
  const obstacles: ObstacleBox[] = [];

  const colorPick = () =>
    OBSTACLE_COLORS[Math.floor(rng() * OBSTACLE_COLORS.length)];

  // ─── Long corridor walls ──────────────────────────────────────────────────
  const corridorCount = randomIntInRange(rng, 10, 16);
  for (
    let i = 0;
    i < corridorCount * 6 &&
    obstacles.filter((o) => o.id.startsWith("corridor")).length < corridorCount;
    i++
  ) {
    const isHorizontal = rng() > 0.5;
    const length = randomInRange(rng, 6, 14);
    const height = randomInRange(rng, 3, 5);
    const width = randomInRange(rng, 0.5, 1.2);

    const sizeX = isHorizontal ? length : width;
    const sizeZ = isHorizontal ? width : length;
    const sizeY = height;

    const posX = randomInRange(rng, -(MAP_SIZE - 3), MAP_SIZE - 3);
    const posZ = randomInRange(rng, -(MAP_SIZE - 3), MAP_SIZE - 3);
    const posY = sizeY / 2;

    const size: Vec3 = { x: sizeX, y: sizeY, z: sizeZ };
    const pos: Vec3 = { x: posX, y: posY, z: posZ };

    if (Math.abs(posX) < CLEAR_ZONE && Math.abs(posZ) < CLEAR_ZONE) continue;

    let overlaps = false;
    for (const obs of obstacles) {
      if (boxesOverlap(pos, size, obs.position, obs.size, 1.0)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    obstacles.push({
      id: `corridor-${i}`,
      position: pos,
      size,
      color: colorPick(),
    });
  }

  // ─── Pillar clusters ──────────────────────────────────────────────────────
  const pillarGroupCount = randomIntInRange(rng, 4, 8);
  for (let g = 0; g < pillarGroupCount; g++) {
    const centerX = randomInRange(rng, -26, 26);
    const centerZ = randomInRange(rng, -26, 26);
    if (Math.abs(centerX) < CLEAR_ZONE && Math.abs(centerZ) < CLEAR_ZONE)
      continue;

    const pillarCount = randomIntInRange(rng, 3, 6);
    for (let p = 0; p < pillarCount; p++) {
      const px = centerX + randomInRange(rng, -4, 4);
      const pz = centerZ + randomInRange(rng, -4, 4);
      const height = randomInRange(rng, 2.5, 5);
      const w = randomInRange(rng, 0.8, 1.8);

      const size: Vec3 = { x: w, y: height, z: w };
      const pos: Vec3 = { x: px, y: height / 2, z: pz };

      if (Math.abs(px) < CLEAR_ZONE && Math.abs(pz) < CLEAR_ZONE) continue;

      let overlaps = false;
      for (const obs of obstacles) {
        if (boxesOverlap(pos, size, obs.position, obs.size, 0.5)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      obstacles.push({
        id: `pillar-${g}-${p}`,
        position: pos,
        size,
        color: colorPick(),
      });
    }
  }

  // ─── L-shaped walls (two boxes forming an L) ─────────────────────────────
  const lWallCount = randomIntInRange(rng, 6, 10);
  for (let l = 0; l < lWallCount; l++) {
    const baseX = randomInRange(rng, -(MAP_SIZE - 4), MAP_SIZE - 4);
    const baseZ = randomInRange(rng, -(MAP_SIZE - 4), MAP_SIZE - 4);
    if (Math.abs(baseX) < CLEAR_ZONE && Math.abs(baseZ) < CLEAR_ZONE) continue;

    const height = randomInRange(rng, 3, 5);
    const armLen = randomInRange(rng, 4, 8);
    const thickness = randomInRange(rng, 0.6, 1.2);
    const col = colorPick();

    // Arm 1 (horizontal)
    const s1: Vec3 = { x: armLen, y: height, z: thickness };
    const p1: Vec3 = { x: baseX, y: height / 2, z: baseZ };

    // Arm 2 (vertical, attached at end)
    const arm2Len = randomInRange(rng, 3, 6);
    const s2: Vec3 = { x: thickness, y: height, z: arm2Len };
    const p2: Vec3 = {
      x: baseX + armLen / 2,
      y: height / 2,
      z: baseZ + arm2Len / 2,
    };

    let ok = true;
    for (const obs of obstacles) {
      if (
        boxesOverlap(p1, s1, obs.position, obs.size, 0.5) ||
        boxesOverlap(p2, s2, obs.position, obs.size, 0.5)
      ) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    obstacles.push({ id: `lwall-${l}-a`, position: p1, size: s1, color: col });
    obstacles.push({ id: `lwall-${l}-b`, position: p2, size: s2, color: col });
  }

  // ─── Wonky tilted blocks ──────────────────────────────────────────────────
  const wonkyCount = randomIntInRange(rng, 8, 14);
  for (
    let w = 0;
    w < wonkyCount * 4 &&
    obstacles.filter((o) => o.id.startsWith("wonky")).length < wonkyCount;
    w++
  ) {
    const sizeX = randomInRange(rng, 1.5, 4);
    const sizeY = randomInRange(rng, 1.5, 4);
    const sizeZ = randomInRange(rng, 1.5, 4);
    const posX = randomInRange(rng, -(MAP_SIZE - 3), MAP_SIZE - 3);
    const posZ = randomInRange(rng, -(MAP_SIZE - 3), MAP_SIZE - 3);
    const posY = sizeY / 2;

    // Random tilt angle (wonky)
    const rotY = randomInRange(rng, 0, Math.PI * 2);
    const rotX = randomInRange(rng, -0.3, 0.3); // slight tilt
    const rotZ = randomInRange(rng, -0.3, 0.3);

    const size: Vec3 = { x: sizeX, y: sizeY, z: sizeZ };
    const pos: Vec3 = { x: posX, y: posY, z: posZ };

    if (Math.abs(posX) < CLEAR_ZONE && Math.abs(posZ) < CLEAR_ZONE) continue;

    let overlaps = false;
    for (const obs of obstacles) {
      if (boxesOverlap(pos, size, obs.position, obs.size, 0.8)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    obstacles.push({
      id: `wonky-${w}`,
      position: pos,
      size,
      color: colorPick(),
      rotation: { x: rotX, y: rotY, z: rotZ },
    });
  }

  // ─── Boundary walls ───────────────────────────────────────────────────────
  // Add thick boundary walls at the edges for a real arena feel
  const boundaryHeight = 5;
  const boundaryThickness = 1.5;
  [
    {
      id: "bound-n",
      pos: { x: 0, y: boundaryHeight / 2, z: -MAP_SIZE },
      size: { x: MAP_SIZE * 2, y: boundaryHeight, z: boundaryThickness },
      col: colorPick(),
    },
    {
      id: "bound-s",
      pos: { x: 0, y: boundaryHeight / 2, z: MAP_SIZE },
      size: { x: MAP_SIZE * 2, y: boundaryHeight, z: boundaryThickness },
      col: colorPick(),
    },
    {
      id: "bound-w",
      pos: { x: -MAP_SIZE, y: boundaryHeight / 2, z: 0 },
      size: { x: boundaryThickness, y: boundaryHeight, z: MAP_SIZE * 2 },
      col: colorPick(),
    },
    {
      id: "bound-e",
      pos: { x: MAP_SIZE, y: boundaryHeight / 2, z: 0 },
      size: { x: boundaryThickness, y: boundaryHeight, z: MAP_SIZE * 2 },
      col: colorPick(),
    },
  ].map(({ id, pos, size, col }) => {
    obstacles.push({ id, position: pos, size, color: col });
  });

  // ─── Poster anchors from boundary walls ──────────────────────────────────
  const posterAnchors: PosterAnchor[] = [];
  const POSTER_INSET = 0.8; // how far inward from wall center

  // Boundary wall poster positions — one spread position per wall
  const boundaryPosters: PosterAnchor[] = [
    // bound-n: z = -MAP_SIZE, faces south (+z direction), rotY = 0
    {
      pos: [
        randomInRange(rng, -MAP_SIZE * 0.6, MAP_SIZE * 0.6),
        1.8,
        -MAP_SIZE + POSTER_INSET,
      ],
      rotY: 0,
      photoIdx: 0,
    },
    // bound-s: z = +MAP_SIZE, faces north (-z direction), rotY = Math.PI
    {
      pos: [
        randomInRange(rng, -MAP_SIZE * 0.6, MAP_SIZE * 0.6),
        1.8,
        MAP_SIZE - POSTER_INSET,
      ],
      rotY: Math.PI,
      photoIdx: 1,
    },
    // bound-w: x = -MAP_SIZE, faces east (+x direction), rotY = Math.PI / 2
    {
      pos: [
        -MAP_SIZE + POSTER_INSET,
        1.8,
        randomInRange(rng, -MAP_SIZE * 0.6, MAP_SIZE * 0.6),
      ],
      rotY: Math.PI / 2,
      photoIdx: 2,
    },
    // bound-e: x = +MAP_SIZE, faces west (-x direction), rotY = -Math.PI / 2
    {
      pos: [
        MAP_SIZE - POSTER_INSET,
        1.8,
        randomInRange(rng, -MAP_SIZE * 0.6, MAP_SIZE * 0.6),
      ],
      rotY: -Math.PI / 2,
      photoIdx: 3,
    },
  ];
  posterAnchors.push(...boundaryPosters);

  // ─── Corridor wall posters (up to 4 more) ────────────────────────────────
  const longWalls = obstacles.filter(
    (o) => o.id.startsWith("corridor") && (o.size.x > 6 || o.size.z > 6),
  );

  let corridorPosterCount = 0;
  for (const wall of longWalls) {
    if (corridorPosterCount >= 4) break;
    // Place poster on the longer face, midpoint, facing inward
    const isLongX = wall.size.x >= wall.size.z;
    let rotY: number;
    let pos: [number, number, number];
    if (isLongX) {
      // Wall extends in X — poster on one of the Z faces
      const faceZ =
        rng() > 0.5
          ? wall.position.z + wall.size.z / 2
          : wall.position.z - wall.size.z / 2;
      const facingIn = faceZ > wall.position.z ? Math.PI : 0;
      pos = [wall.position.x, 1.8, faceZ];
      rotY = facingIn;
    } else {
      // Wall extends in Z — poster on one of the X faces
      const faceX =
        rng() > 0.5
          ? wall.position.x + wall.size.x / 2
          : wall.position.x - wall.size.x / 2;
      const facingIn = faceX > wall.position.x ? -Math.PI / 2 : Math.PI / 2;
      pos = [faceX, 1.8, wall.position.z];
      rotY = facingIn;
    }
    posterAnchors.push({
      pos,
      rotY,
      photoIdx: corridorPosterCount % 4,
    });
    corridorPosterCount++;
  }

  return { obstacles, posterAnchors };
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

  // Wide ground floor platform
  obstacles.push({
    id: "platform-ground",
    position: { x: 0, y: 0.2, z: 0 },
    size: { x: 45, y: 0.4, z: 2 },
    color: "#2a1f4a",
  });

  // Structured column-based layout: 9 columns spanning x = -22 to 22
  const COLUMNS = 9;
  const X_MIN = -22;
  const X_MAX = 22;
  const COL_WIDTH = (X_MAX - X_MIN) / COLUMNS; // ~4.89 units wide
  const LEDGE_HEIGHT = 0.4;
  const LEDGE_DEPTH = 2;
  const HEIGHT_MIN = 1.5;
  // Max safe vertical gap: BOT_JUMP_VELOCITY^2 / (2*GRAVITY) ≈ 5.6, use 4.5 for safety
  const MAX_VERTICAL_GAP = 4.5;
  const HEIGHT_MAX = 10; // Reduced from 14 for reachability

  let platformIdx = 0;

  for (let col = 0; col < COLUMNS; col++) {
    const centerX = X_MIN + col * COL_WIDTH + COL_WIDTH / 2;

    // Place 3 ledges per column with controlled stairstepping heights
    // First ledge: 1.5–3.0
    // Second ledge: first + 2.5–4.5
    // Third ledge: second + 2.5–4.5
    const firstTopY = randomInRange(rng, HEIGHT_MIN, 3.0);
    const secondTopY = Math.min(
      firstTopY + randomInRange(rng, 2.5, MAX_VERTICAL_GAP),
      HEIGHT_MAX,
    );
    const thirdTopY = Math.min(
      secondTopY + randomInRange(rng, 2.5, MAX_VERTICAL_GAP),
      HEIGHT_MAX,
    );

    const ledgeTops = [firstTopY, secondTopY, thirdTopY];

    for (let ledge = 0; ledge < 3; ledge++) {
      const topY = ledgeTops[ledge];

      // Width based on height tier: lower = wider, higher = narrower
      let width: number;
      if (topY < 4) {
        width = randomInRange(rng, 4, 8);
      } else if (topY > 7) {
        width = randomInRange(rng, 2, 4.5);
      } else {
        width = randomInRange(rng, 3, 6);
      }

      // X offset within column: up to ±30% of column width
      const xOffset = randomInRange(rng, -COL_WIDTH * 0.3, COL_WIDTH * 0.3);
      const posX = centerX + xOffset;

      // Center Y = topY - half the ledge height
      const posY = topY - LEDGE_HEIGHT / 2;

      const colorIdx = Math.floor(rng() * PLATFORMER_COLORS.length);

      obstacles.push({
        id: `platform-${platformIdx++}`,
        position: { x: posX, y: posY, z: 0 },
        size: { x: width, y: LEDGE_HEIGHT, z: LEDGE_DEPTH },
        color: PLATFORMER_COLORS[colorIdx],
      });
    }
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
