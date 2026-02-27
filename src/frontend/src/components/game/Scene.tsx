import { Grid, Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { ObstacleBox, PlayerState } from "../../types/game";
import { ObstacleCubes } from "./ObstacleCubes";
import { PlayerCube } from "./PlayerCube";

// Static star positions for 2D mode backdrop (generated once)
const STAR_POSITIONS = Array.from({ length: 30 }, (_, i) => ({
  id: `star-${i * 7919 + 1}`,
  pos: [((i * 137.5) % 40) - 20, (i * 73) % 14, -5 - (i % 5) * 3] as [
    number,
    number,
    number,
  ],
}));

interface SceneProps {
  players: PlayerState[];
  obstacles: ObstacleBox[];
  keysRef: React.MutableRefObject<Set<string>>;
  onFrame: (delta: number, onUpdate: (players: PlayerState[]) => void) => void;
  onPlayersUpdate: (players: PlayerState[]) => void;
  mapType?: "3d" | "2d-platformer";
}

export function Scene({
  players,
  obstacles,
  onFrame,
  onPlayersUpdate,
  mapType = "3d",
}: SceneProps) {
  const { camera } = useThree();
  const is2D = mapType === "2d-platformer";

  useFrame((_, delta) => {
    onFrame(delta, onPlayersUpdate);

    const localPlayer = players.find((p) => p.isLocal);
    if (localPlayer) {
      if (is2D) {
        // Side-scroll: follow X only, fixed Y and Z
        camera.position.x += (localPlayer.position.x - camera.position.x) * 0.1;
        camera.position.y +=
          (localPlayer.position.y + 3 - camera.position.y) * 0.08;
        camera.position.z = 20;
        camera.lookAt(camera.position.x, camera.position.y - 3, 0);
      } else {
        // 3D follow camera
        const targetX = localPlayer.position.x;
        const targetZ = localPlayer.position.z;
        camera.position.x += (targetX - camera.position.x + 0) * 0.08;
        camera.position.z += (targetZ + 14 - camera.position.z) * 0.08;
        camera.position.y += (10 - camera.position.y) * 0.08;
        camera.lookAt(targetX, 0, targetZ);
      }
    }
  });

  // Initialize camera
  useEffect(() => {
    if (is2D) {
      camera.position.set(0, 5, 20);
      camera.lookAt(0, 5, 0);
    } else {
      camera.position.set(0, 10, 14);
      camera.lookAt(0, 0, 0);
    }
  }, [camera, is2D]);

  if (is2D) {
    return (
      <>
        {/* Dark space background */}
        <color attach="background" args={["#0a0020"]} />

        {/* Lighting for 2D */}
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

        {/* Decorative star particles (static distant points) */}
        {STAR_POSITIONS.map((pos) => (
          <mesh key={pos.id} position={pos.pos}>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}

        {/* Platforms / Obstacles */}
        <ObstacleCubes obstacles={obstacles} />

        {/* Players */}
        {players.map((player) => (
          <PlayerCube key={player.id} player={player} />
        ))}
      </>
    );
  }

  // ── 3D mode ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} color="#8899cc" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight
        position={[-10, 8, -10]}
        intensity={0.3}
        color="#4466aa"
      />

      {/* Fog */}
      <fog attach="fog" args={["#0a0d1a", 30, 80]} />

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[0, 0.1, -1]}
        inclination={0}
        azimuth={0.25}
        rayleigh={3}
        mieCoefficient={0.005}
        mieDirectionalG={0.7}
        turbidity={10}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#1a1f2e" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Grid lines on ground */}
      <Grid
        position={[0, 0.01, 0]}
        args={[42, 42]}
        cellSize={2}
        cellThickness={0.4}
        cellColor="#1e2d4a"
        sectionSize={10}
        sectionThickness={0.8}
        sectionColor="#2a3d6a"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Boundary walls */}
      {[-20, 20].map((x) => (
        <mesh key={`wx-${x}`} position={[x, 1, 0]}>
          <boxGeometry args={[0.2, 2, 42]} />
          <meshBasicMaterial color="#1a2a4a" transparent opacity={0.5} />
        </mesh>
      ))}
      {[-20, 20].map((z) => (
        <mesh key={`wz-${z}`} position={[0, 1, z]}>
          <boxGeometry args={[42, 2, 0.2]} />
          <meshBasicMaterial color="#1a2a4a" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Obstacles */}
      <ObstacleCubes obstacles={obstacles} />

      {/* Players */}
      {players.map((player) => (
        <PlayerCube key={player.id} player={player} />
      ))}
    </>
  );
}
