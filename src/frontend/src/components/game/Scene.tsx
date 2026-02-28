import { Billboard, Grid, PointerLockControls, Text } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, type ReactNode, Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";
import type { ObstacleBox, PlayerState } from "../../types/game";
import { ObstacleCubes } from "./ObstacleCubes";

// Bot face image paths — matches the uploaded photos
const BOT_FACE_TEXTURES = [
  "/assets/uploads/IMG_0963-1-1.jpeg", // Bot Alpha: muscle statue
  "/assets/uploads/IMG_0964-1-2.jpeg", // Bot Beta: monkey
  "/assets/uploads/IMG_0929-3.png", // Bot Gamma: kid in blanket
  "/assets/uploads/IMG_0471-4.png", // Bot Delta: teen on train
];

// Wanted poster photo paths (cycling through the 4 characters)
const WANTED_POSTER_PHOTO_PATHS = [
  "/assets/uploads/IMG_0963-1-1.jpeg",
  "/assets/uploads/IMG_0964-1-2.jpeg",
  "/assets/uploads/IMG_0929-3.png",
  "/assets/uploads/IMG_0471-4.png",
];

// Static floor ring decal positions (generated once, not per-frame)
const FLOOR_RING_DECALS: {
  id: string;
  pos: [number, number, number];
  radius: number;
  color: string;
}[] = [
  { id: "ring-0", pos: [-8, 0.02, -8], radius: 2.5, color: "#00ffcc" },
  { id: "ring-1", pos: [8, 0.02, 8], radius: 1.8, color: "#ff0088" },
  { id: "ring-2", pos: [-15, 0.02, 5], radius: 2.2, color: "#8800ff" },
  { id: "ring-3", pos: [10, 0.02, -12], radius: 1.5, color: "#00ccff" },
  { id: "ring-4", pos: [5, 0.02, 15], radius: 2.0, color: "#ff4400" },
  { id: "ring-5", pos: [-10, 0.02, -3], radius: 1.2, color: "#4400ff" },
  { id: "ring-6", pos: [18, 0.02, -6], radius: 1.8, color: "#ffcc00" },
  { id: "ring-7", pos: [-5, 0.02, 18], radius: 2.0, color: "#aa00ff" },
  { id: "ring-8", pos: [-22, 0.02, -18], radius: 2.3, color: "#00ffcc" },
  { id: "ring-9", pos: [22, 0.02, 15], radius: 1.9, color: "#ff0088" },
  { id: "ring-10", pos: [-5, 0.02, 25], radius: 2.1, color: "#ffcc00" },
  { id: "ring-11", pos: [20, 0.02, -22], radius: 1.6, color: "#aa00ff" },
];

// Static neon tube light positions
const NEON_TUBES: {
  id: string;
  pos: [number, number, number];
  color: string;
  rotY: number;
}[] = [
  { id: "tube-0", pos: [-12, 4.5, -10], color: "#00ffcc", rotY: 0.4 },
  { id: "tube-1", pos: [12, 4.5, 8], color: "#ff0088", rotY: -0.6 },
  { id: "tube-2", pos: [-6, 4.5, 14], color: "#8800ff", rotY: 1.1 },
  { id: "tube-3", pos: [8, 4.5, -16], color: "#00aaff", rotY: 0.2 },
  { id: "tube-4", pos: [20, 4.5, -20], color: "#ffcc00", rotY: 0.7 },
  { id: "tube-5", pos: [-20, 4.5, 20], color: "#ff4400", rotY: -0.3 },
  { id: "tube-6", pos: [25, 4.5, 5], color: "#00ffcc", rotY: 1.5 },
  { id: "tube-7", pos: [-25, 4.5, -5], color: "#aa00ff", rotY: -1.0 },
];

// Static decorative crates
const DECO_CRATES: {
  id: string;
  pos: [number, number, number];
  size: number;
  rotY: number;
}[] = [
  { id: "crate-0", pos: [-18, 0.5, -3], size: 1.0, rotY: 0.3 },
  { id: "crate-1", pos: [17, 0.5, -9], size: 0.8, rotY: 0.8 },
  { id: "crate-2", pos: [-9, 0.5, 17], size: 1.0, rotY: -0.5 },
  { id: "crate-3", pos: [14, 0.5, 14], size: 0.8, rotY: 1.2 },
  { id: "crate-4", pos: [-17, 0.5, 10], size: 1.0, rotY: -0.2 },
  { id: "crate-5", pos: [3, 0.5, -18], size: 0.8, rotY: 0.6 },
  { id: "crate-6", pos: [-25, 0.5, -5], size: 1.1, rotY: 0.9 },
  { id: "crate-7", pos: [24, 0.5, -18], size: 0.9, rotY: -0.4 },
  { id: "crate-8", pos: [-8, 0.5, 25], size: 1.0, rotY: 1.3 },
  { id: "crate-9", pos: [18, 0.5, 22], size: 0.8, rotY: -0.7 },
];

// Wanted poster positions in 3D arena
const POSTER_POSITIONS_3D: {
  id: string;
  pos: [number, number, number];
  rotY: number;
  photoIdx: number;
}[] = [
  {
    id: "wp-0",
    pos: [-20, 1.8, -8] as [number, number, number],
    rotY: Math.PI / 2,
    photoIdx: 0,
  },
  {
    id: "wp-1",
    pos: [20, 1.8, 5] as [number, number, number],
    rotY: -Math.PI / 2,
    photoIdx: 1,
  },
  {
    id: "wp-2",
    pos: [8, 1.8, -20] as [number, number, number],
    rotY: 0,
    photoIdx: 2,
  },
  {
    id: "wp-3",
    pos: [-5, 1.8, 20] as [number, number, number],
    rotY: Math.PI,
    photoIdx: 3,
  },
  {
    id: "wp-4",
    pos: [-12, 1.8, 3] as [number, number, number],
    rotY: Math.PI / 4,
    photoIdx: 0,
  },
  {
    id: "wp-5",
    pos: [10, 1.8, -10] as [number, number, number],
    rotY: -Math.PI / 3,
    photoIdx: 2,
  },
  {
    id: "wp-6",
    pos: [-28, 1.8, -12] as [number, number, number],
    rotY: Math.PI / 2,
    photoIdx: 1,
  },
  {
    id: "wp-7",
    pos: [28, 1.8, 18] as [number, number, number],
    rotY: -Math.PI / 2,
    photoIdx: 3,
  },
];

// Wanted poster positions in 2D platformer (background layer)
const POSTER_POSITIONS_2D: {
  id: string;
  pos: [number, number, number];
  rotY: number;
  photoIdx: number;
}[] = [
  {
    id: "wp2d-0",
    pos: [-18, 4, -3] as [number, number, number],
    rotY: 0,
    photoIdx: 1,
  },
  {
    id: "wp2d-1",
    pos: [8, 6, -3] as [number, number, number],
    rotY: 0,
    photoIdx: 3,
  },
  {
    id: "wp2d-2",
    pos: [-5, 2, -3] as [number, number, number],
    rotY: 0,
    photoIdx: 0,
  },
  {
    id: "wp2d-3",
    pos: [15, 10, -3] as [number, number, number],
    rotY: 0,
    photoIdx: 2,
  },
];

// Static starfield positions (generated once)
const STAR_POSITIONS: { id: string; pos: [number, number, number] }[] =
  Array.from({ length: 200 }, (_, i) => {
    const r = 30 + (i % 15) * 2;
    const theta = (i * 137.508 * Math.PI) / 180;
    const phi = Math.acos(1 - 2 * ((i * 0.618033) % 1));
    return {
      id: `star3d-${i * 31337 + 7}`,
      pos: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 3 + 5,
        r * Math.sin(phi) * Math.sin(theta),
      ] as [number, number, number],
    };
  });

// Decorative colored lights scattered around arena
const ARENA_LIGHTS: {
  id: string;
  pos: [number, number, number];
  color: string;
  intensity: number;
}[] = [
  { id: "alight-nw", pos: [-25, 3, -25], color: "#2244ff", intensity: 10 },
  { id: "alight-ne", pos: [25, 3, -25], color: "#8800ff", intensity: 10 },
  { id: "alight-sw", pos: [-25, 3, 25], color: "#00ccff", intensity: 10 },
  { id: "alight-se", pos: [25, 3, 25], color: "#ff0088", intensity: 8 },
  { id: "alight-n", pos: [0, 4, -28], color: "#4400ff", intensity: 6 },
  { id: "alight-s", pos: [0, 4, 28], color: "#00ffcc", intensity: 6 },
  { id: "alight-w", pos: [-28, 4, 0], color: "#ff4400", intensity: 6 },
  { id: "alight-e", pos: [28, 4, 0], color: "#aa00ff", intensity: 6 },
];

// Simple error boundary for Three.js components
class ThreeErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

// ─── Wanted Poster ────────────────────────────────────────────────────────────

interface WantedPosterProps {
  position: [number, number, number];
  rotationY: number;
  photoIndex: number;
}

function WantedPosterInner({
  position,
  rotationY,
  photoIndex,
}: WantedPosterProps) {
  const photoPath =
    WANTED_POSTER_PHOTO_PATHS[photoIndex % WANTED_POSTER_PHOTO_PATHS.length];
  const texture = useLoader(TextureLoader, photoPath);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Outer dark brown border frame */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[1.4, 2.0]} />
        <meshStandardMaterial color="#3d1f00" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Parchment background */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.28, 1.88]} />
        <meshStandardMaterial
          color="#c9a14a"
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* "DEAD OR ALIVE" header text */}
      <Text
        position={[0, 0.72, 0.01]}
        fontSize={0.18}
        color="#8b0000"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#3d0000"
        maxWidth={1.1}
      >
        DEAD OR ALIVE
      </Text>

      {/* Decorative line under header */}
      <mesh position={[0, 0.56, 0.01]}>
        <planeGeometry args={[1.1, 0.025]} />
        <meshBasicMaterial color="#8b0000" />
      </mesh>

      {/* Photo */}
      <mesh position={[0, -0.02, 0.01]}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshStandardMaterial map={texture} roughness={0.6} />
      </mesh>

      {/* Decorative line above reward */}
      <mesh position={[0, -0.56, 0.01]}>
        <planeGeometry args={[1.1, 0.025]} />
        <meshBasicMaterial color="#8b6914" />
      </mesh>

      {/* "REWARD $5,000" text */}
      <Text
        position={[0, -0.73, 0.01]}
        fontSize={0.14}
        color="#c8960c"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#5a3e00"
        maxWidth={1.1}
      >
        REWARD: $5,000
      </Text>

      {/* Subtle point light to illuminate poster */}
      <pointLight
        position={[0, 0, 0.5]}
        color="#ffe8a0"
        intensity={1.2}
        distance={3}
        decay={2}
      />
    </group>
  );
}

function WantedPosterFallback({
  position,
  rotationY,
}: Omit<WantedPosterProps, "photoIndex">) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={[1.2, 1.8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.95} />
      </mesh>
    </group>
  );
}

function WantedPoster({ position, rotationY, photoIndex }: WantedPosterProps) {
  return (
    <ThreeErrorBoundary
      fallback={
        <WantedPosterFallback position={position} rotationY={rotationY} />
      }
    >
      <Suspense
        fallback={
          <WantedPosterFallback position={position} rotationY={rotationY} />
        }
      >
        <WantedPosterInner
          position={position}
          rotationY={rotationY}
          photoIndex={photoIndex}
        />
      </Suspense>
    </ThreeErrorBoundary>
  );
}

// ─── Bot Characters ───────────────────────────────────────────────────────────

interface BotCharacterProps {
  player: PlayerState;
  botIndex: number;
}

function BotCharacterInner({ player, botIndex }: BotCharacterProps) {
  const texturePath = BOT_FACE_TEXTURES[botIndex % BOT_FACE_TEXTURES.length];
  // useLoader with TextureLoader — Suspense-friendly
  const texture = useLoader(TextureLoader, texturePath);

  const isIT = player.isIT;
  const hasImmunity = (player.tagImmunityTimer ?? 0) > 0;
  const scale = isIT ? 1.3 : 1.0;

  const flashRef = useRef(0);
  useFrame((_, delta) => {
    flashRef.current += delta * 10;
  });

  const flashOpacity = hasImmunity
    ? 0.5 + 0.5 * Math.sin(flashRef.current * 5)
    : 1;

  return (
    <group position={[player.position.x, player.position.y, player.position.z]}>
      {/* IT red glow */}
      {isIT && (
        <pointLight color="#ff2200" intensity={15} distance={8} decay={2} />
      )}

      {/* Photo-in-a-box: frame (slightly larger dark back plane) + photo front plane */}
      <Billboard position={[0, 0.6, 0]}>
        {/* Frame / border plane */}
        <mesh scale={[1.15 * scale, 1.15 * scale, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={isIT ? "#ff2200" : "#111111"}
            emissive={isIT ? "#cc1100" : "#000000"}
            emissiveIntensity={isIT ? 0.6 : 0}
            roughness={0.5}
            metalness={0.6}
            transparent={hasImmunity}
            opacity={flashOpacity}
          />
        </mesh>
        {/* Photo plane */}
        <mesh scale={[1.0 * scale, 1.0 * scale, 1]} position={[0, 0, 0.01]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            map={texture}
            transparent
            opacity={flashOpacity}
            roughness={0.5}
            emissive={isIT ? "#ff0000" : "#000000"}
            emissiveIntensity={isIT ? 0.3 : 0}
            side={2}
          />
        </mesh>
      </Billboard>

      {/* Name tag */}
      <Billboard position={[0, 1.3, 0]}>
        <Text
          fontSize={0.3}
          color={isIT ? "#ff6644" : "#ccffee"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000000"
        >
          {player.name}
          {isIT ? " IT" : ""}
        </Text>
      </Billboard>

      {/* IT status ring on ground */}
      {isIT && (
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.1, 32]} />
          <meshBasicMaterial color="#ff2200" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Immunity ring */}
      {hasImmunity && (
        <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.75, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

// Fallback bot (simple colored box) when texture fails or suspends
function BotFallback({ player }: { player: PlayerState }) {
  const isIT = player.isIT;
  const color = isIT ? "#ff2200" : "#00ccff";
  return (
    <group position={[player.position.x, player.position.y, player.position.z]}>
      {isIT && (
        <pointLight color="#ff2200" intensity={15} distance={8} decay={2} />
      )}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1.0, 0.8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      {isIT && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.1, 32]} />
          <meshBasicMaterial color="#ff2200" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

function BotCharacter({ player, botIndex }: BotCharacterProps) {
  return (
    <ThreeErrorBoundary fallback={<BotFallback player={player} />}>
      <Suspense fallback={<BotFallback player={player} />}>
        <BotCharacterInner player={player} botIndex={botIndex} />
      </Suspense>
    </ThreeErrorBoundary>
  );
}

interface SceneProps {
  players: PlayerState[];
  obstacles: ObstacleBox[];
  keysRef: React.MutableRefObject<Set<string>>;
  onFrame: (delta: number, onUpdate: (players: PlayerState[]) => void) => void;
  onPlayersUpdate: (players: PlayerState[]) => void;
  mapType?: "3d" | "2d-platformer";
  cameraRef?: React.MutableRefObject<{ rotation: { y: number } } | null>;
  onPointerLockChange?: (locked: boolean) => void;
  controlMode?: "pc" | "mobile";
  sensitivity?: number;
}

// Static 2D stars
const STAR_POSITIONS_2D = Array.from({ length: 60 }, (_, i) => ({
  id: `star-${i * 7919 + 1}`,
  pos: [((i * 137.5) % 50) - 25, (i * 73) % 16, -5 - (i % 5) * 3] as [
    number,
    number,
    number,
  ],
}));

// Track bot indices by player id
const botIndexMap: Record<string, number> = {};

export function Scene({
  players,
  obstacles,
  onFrame,
  onPlayersUpdate,
  mapType = "3d",
  cameraRef,
  onPointerLockChange,
  controlMode = "pc",
  sensitivity = 1,
}: SceneProps) {
  const { camera } = useThree();
  const is2D = mapType === "2d-platformer";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const isLockedRef = useRef(false);

  // Assign bot indices on first render
  const botPlayers = players.filter((p) => p.isBot);
  for (let i = 0; i < botPlayers.length; i++) {
    const p = botPlayers[i];
    if (botIndexMap[p.id] === undefined) {
      botIndexMap[p.id] = i;
    }
  }

  // Initialize camera position on mount
  useEffect(() => {
    camera.position.set(0, 0.9, 0);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = "YXZ";
  }, [camera]);

  // Sync camera ref for game loop to read yaw
  useEffect(() => {
    if (cameraRef) {
      cameraRef.current = camera as unknown as { rotation: { y: number } };
    }
  }, [camera, cameraRef]);

  // Pointer lock change handler (PC only — mobile never acquires pointer lock)
  useEffect(() => {
    if (controlMode === "mobile") return;

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement !== null;
      isLockedRef.current = locked;
      onPointerLockChange?.(locked);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange,
      );
    };
  }, [onPointerLockChange, controlMode]);

  // PC mouse sensitivity: apply extra delta when sensitivity differs from 1.0
  useEffect(() => {
    if (controlMode === "mobile") return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isLockedRef.current) return;
      // PointerLockControls already applies 1x sensitivity (0.002 per pixel)
      // Apply the extra multiplier on top of that
      const extraScale = sensitivity - 1;
      if (Math.abs(extraScale) < 0.001) return;

      const dx = e.movementX * 0.002 * extraScale;
      const dy = e.movementY * 0.002 * extraScale;

      camera.rotation.order = "YXZ";
      camera.rotation.y -= dx;
      camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, camera.rotation.x - dy),
      );
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [controlMode, sensitivity, camera]);

  // Mobile touch-drag camera look
  const mobileLookRef = useRef<{ id: number; x: number; y: number } | null>(
    null,
  );
  const mobileYawRef = useRef(0);
  const mobilePitchRef = useRef(0);

  useEffect(() => {
    if (controlMode !== "mobile") return;

    const SENSITIVITY = 0.004 * sensitivity;

    const onTouchStart = (e: TouchEvent) => {
      const touch = Array.from(e.changedTouches).find(
        (t) => t.clientX > window.innerWidth / 2,
      );
      if (!touch) return;
      mobileLookRef.current = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!mobileLookRef.current) return;
      const touch = Array.from(e.changedTouches).find(
        (t) => t.identifier === mobileLookRef.current!.id,
      );
      if (!touch) return;

      const dx = touch.clientX - mobileLookRef.current.x;
      const dy = touch.clientY - mobileLookRef.current.y;
      mobileLookRef.current = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      };

      mobileYawRef.current -= dx * SENSITIVITY;
      mobilePitchRef.current = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, mobilePitchRef.current - dy * SENSITIVITY),
      );

      camera.rotation.order = "YXZ";
      camera.rotation.y = mobileYawRef.current;
      camera.rotation.x = mobilePitchRef.current;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!mobileLookRef.current) return;
      const ended = Array.from(e.changedTouches).find(
        (t) => t.identifier === mobileLookRef.current!.id,
      );
      if (ended) mobileLookRef.current = null;
    };

    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [controlMode, camera, sensitivity]);

  useFrame((_, delta) => {
    onFrame(delta, onPlayersUpdate);

    const localPlayer = players.find((p) => p.isLocal);
    if (localPlayer) {
      camera.position.x = localPlayer.position.x;
      camera.position.y = localPlayer.position.y + 0.4;
      camera.position.z = localPlayer.position.z;
    }
  });

  if (is2D) {
    return (
      <>
        <color attach="background" args={["#0a0020"]} />
        <ambientLight intensity={0.7} color="#ccaaff" />
        <directionalLight
          position={[0, 10, 10]}
          intensity={1.4}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[0, 8, 5]} intensity={0.5} color="#ff44cc" />

        {/* PointerLockControls for first-person mouse look in 2D mode (PC only) */}
        {controlMode !== "mobile" && (
          <PointerLockControls
            ref={controlsRef}
            onLock={() => {
              isLockedRef.current = true;
              onPointerLockChange?.(true);
            }}
            onUnlock={() => {
              isLockedRef.current = false;
              onPointerLockChange?.(false);
            }}
          />
        )}

        {STAR_POSITIONS_2D.map((star) => (
          <mesh key={star.id} position={star.pos}>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}

        <ObstacleCubes obstacles={obstacles} />

        {/* Wanted Posters in background */}
        {POSTER_POSITIONS_2D.map((p) => (
          <WantedPoster
            key={p.id}
            position={p.pos}
            rotationY={p.rotY}
            photoIndex={p.photoIdx}
          />
        ))}

        {/* Only render non-local players (first-person: no body for local player) */}
        {players
          .filter((p) => !p.isLocal)
          .map((player) => {
            if (player.isBot) {
              return (
                <BotCharacter
                  key={player.id}
                  player={player}
                  botIndex={botIndexMap[player.id] ?? 0}
                />
              );
            }
            // Non-local human players in 2D — photo-in-a-box style with color front
            return (
              <group
                key={player.id}
                position={[
                  player.position.x,
                  player.position.y,
                  player.position.z,
                ]}
              >
                <Billboard position={[0, 0.6, 0]}>
                  <mesh scale={[1.15, 1.15, 1]}>
                    <planeGeometry args={[1, 1]} />
                    <meshStandardMaterial
                      color={player.isIT ? "#ff2200" : "#111111"}
                      emissive={player.isIT ? "#cc1100" : "#000000"}
                      emissiveIntensity={player.isIT ? 0.6 : 0}
                      roughness={0.5}
                      metalness={0.6}
                    />
                  </mesh>
                  <mesh scale={[1.0, 1.0, 1]} position={[0, 0, 0.01]}>
                    <planeGeometry args={[1, 1]} />
                    <meshStandardMaterial
                      color={player.isIT ? "#ff3a1a" : player.color}
                      emissive={player.isIT ? "#cc2200" : player.color}
                      emissiveIntensity={0.3}
                      roughness={0.5}
                    />
                  </mesh>
                </Billboard>
                <Billboard position={[0, 1.3, 0]}>
                  <Text
                    fontSize={0.3}
                    color={player.isIT ? "#ff6644" : "#ccffee"}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.04}
                    outlineColor="#000000"
                  >
                    {player.name}
                    {player.isIT ? " IT" : ""}
                  </Text>
                </Billboard>
              </group>
            );
          })}
      </>
    );
  }

  // ── 3D FIRST-PERSON MODE ─────────────────────────────────────────────────
  return (
    <>
      {/* Fog — dense and moody */}
      <fog attach="fog" args={["#06040f", 18, 65]} />

      {/* Dark void background */}
      <color attach="background" args={["#06040f"]} />

      {/* Lighting */}
      <ambientLight intensity={0.15} color="#1a0a3a" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        color="#aaaaff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Colored arena accent lights */}
      {ARENA_LIGHTS.map((light) => (
        <pointLight
          key={light.id}
          position={light.pos}
          color={light.color}
          intensity={light.intensity}
          distance={18}
          decay={2}
        />
      ))}

      {/* Starfield */}
      {STAR_POSITIONS.map((star) => (
        <mesh key={star.id} position={star.pos}>
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}

      {/* Ground — dark glossy with grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial
          color="#080614"
          roughness={0.1}
          metalness={0.8}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Grid lines */}
      <Grid
        position={[0, 0.01, 0]}
        args={[70, 70]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#1a0a3a"
        sectionSize={10}
        sectionThickness={0.6}
        sectionColor="#3a0a6a"
        fadeDistance={55}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      {/* PointerLockControls for first-person mouse look (PC only) */}
      {controlMode !== "mobile" && (
        <PointerLockControls
          ref={controlsRef}
          onLock={() => {
            isLockedRef.current = true;
            onPointerLockChange?.(true);
          }}
          onUnlock={() => {
            isLockedRef.current = false;
            onPointerLockChange?.(false);
          }}
        />
      )}

      {/* Obstacles */}
      <ObstacleCubes obstacles={obstacles} />

      {/* Wanted Posters */}
      {POSTER_POSITIONS_3D.map((p) => (
        <WantedPoster
          key={p.id}
          position={p.pos}
          rotationY={p.rotY}
          photoIndex={p.photoIdx}
        />
      ))}

      {/* Floor ring decals */}
      {FLOOR_RING_DECALS.map((ring) => (
        <mesh key={ring.id} position={ring.pos} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring.radius * 0.7, ring.radius, 48]} />
          <meshBasicMaterial color={ring.color} transparent opacity={0.35} />
        </mesh>
      ))}

      {/* Neon tube lights */}
      {NEON_TUBES.map((tube) => (
        <group key={tube.id} position={tube.pos} rotation={[0, tube.rotY, 0]}>
          <mesh>
            <boxGeometry args={[0.1, 0.15, 6]} />
            <meshStandardMaterial
              color={tube.color}
              emissive={tube.color}
              emissiveIntensity={2.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          <pointLight color={tube.color} intensity={4} distance={8} decay={2} />
        </group>
      ))}

      {/* Decorative crates */}
      {DECO_CRATES.map((crate) => (
        <mesh
          key={crate.id}
          position={crate.pos}
          rotation={[0, crate.rotY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[crate.size, crate.size, crate.size]} />
          <meshStandardMaterial
            color="#1a1010"
            roughness={0.4}
            metalness={0.75}
            emissive="#220a00"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Bot characters (NOT local player — first-person) */}
      {players
        .filter((p) => !p.isLocal)
        .map((player) => {
          if (player.isBot) {
            return (
              <BotCharacter
                key={player.id}
                player={player}
                botIndex={botIndexMap[player.id] ?? 0}
              />
            );
          }
          // Non-local human players
          return (
            <group
              key={player.id}
              position={[
                player.position.x,
                player.position.y,
                player.position.z,
              ]}
            >
              <Billboard position={[0, 0.6, 0]}>
                <mesh scale={[1.15, 1.15, 1]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial
                    color={player.isIT ? "#ff2200" : "#111111"}
                    emissive={player.isIT ? "#cc1100" : "#000000"}
                    emissiveIntensity={player.isIT ? 0.6 : 0}
                    roughness={0.5}
                    metalness={0.6}
                  />
                </mesh>
                <mesh scale={[1.0, 1.0, 1]} position={[0, 0, 0.01]}>
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial
                    color={player.isIT ? "#ff3a1a" : player.color}
                    emissive={player.isIT ? "#cc2200" : player.color}
                    emissiveIntensity={0.3}
                    roughness={0.5}
                  />
                </mesh>
              </Billboard>
              <Billboard position={[0, 1.3, 0]}>
                <Text
                  fontSize={0.3}
                  color={player.isIT ? "#ff6644" : "#ccffee"}
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.04}
                  outlineColor="#000000"
                >
                  {player.name}
                  {player.isIT ? " IT" : ""}
                </Text>
              </Billboard>
            </group>
          );
        })}
    </>
  );
}
