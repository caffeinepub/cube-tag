import { Billboard, Grid, PointerLockControls, Text } from "@react-three/drei";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Component, type ReactNode, Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";
import type { ObstacleBox, PlayerState } from "../../types/game";
import { ObstacleCubes } from "./ObstacleCubes";

// Bot face image paths — matches the uploaded photos
const BOT_FACE_TEXTURES = [
  "/assets/uploads/IMG_0965-1.jpeg", // Bot Alpha: chubby fries guy
  "/assets/uploads/IMG_0963-2.jpeg", // Bot Beta: muscular statue
  "/assets/uploads/IMG_0964-3.jpeg", // Bot Gamma: monkey
  "/assets/uploads/IMG_0451-4.jpeg", // Bot 3: kid
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
  { id: "alight-nw", pos: [-15, 3, -15], color: "#2244ff", intensity: 8 },
  { id: "alight-ne", pos: [15, 3, -15], color: "#8800ff", intensity: 8 },
  { id: "alight-sw", pos: [-15, 3, 15], color: "#00ccff", intensity: 8 },
  { id: "alight-se", pos: [15, 3, 15], color: "#ff0088", intensity: 6 },
  { id: "alight-n", pos: [0, 4, -18], color: "#4400ff", intensity: 5 },
  { id: "alight-s", pos: [0, 4, 18], color: "#00ffcc", intensity: 5 },
  { id: "alight-w", pos: [-18, 4, 0], color: "#ff4400", intensity: 5 },
  { id: "alight-e", pos: [18, 4, 0], color: "#aa00ff", intensity: 5 },
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
}

// Static 2D stars
const STAR_POSITIONS_2D = Array.from({ length: 30 }, (_, i) => ({
  id: `star-${i * 7919 + 1}`,
  pos: [((i * 137.5) % 40) - 20, (i * 73) % 14, -5 - (i % 5) * 3] as [
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

  // Mobile touch-drag camera look
  const mobileLookRef = useRef<{ id: number; x: number; y: number } | null>(
    null,
  );
  const mobileYawRef = useRef(0);
  const mobilePitchRef = useRef(0);

  useEffect(() => {
    if (controlMode !== "mobile") return;

    const SENSITIVITY = 0.004;

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
  }, [controlMode, camera]);

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
      <fog attach="fog" args={["#06040f", 15, 45]} />

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
        <planeGeometry args={[50, 50]} />
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
        args={[50, 50]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#1a0a3a"
        sectionSize={10}
        sectionThickness={0.6}
        sectionColor="#3a0a6a"
        fadeDistance={40}
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
