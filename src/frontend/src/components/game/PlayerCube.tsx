import { Text } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";
import type { PlayerState } from "../../types/game";

interface PlayerCubeProps {
  player: PlayerState;
}

export function PlayerCube({ player }: PlayerCubeProps) {
  const meshRef = useRef<Mesh>(null);

  const isIT = player.isIT;
  const isLocal = player.isLocal;

  const color = isIT ? "#ff3a1a" : player.color;
  const emissive = isIT ? "#cc2200" : player.isLocal ? "#001133" : "#000000";
  const emissiveIntensity = isIT ? 0.8 : isLocal ? 0.3 : 0;
  const scale = isLocal ? 1.05 : 1;

  return (
    <group position={[player.position.x, player.position.y, player.position.z]}>
      {/* Name tag */}
      <Text
        position={[0, 1.4, 0]}
        fontSize={0.35}
        color={isIT ? "#ff6644" : "#ccffee"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {player.name}
        {isIT ? " 🔴" : ""}
      </Text>

      {/* Main cube */}
      <mesh ref={meshRef} scale={scale} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Local player indicator ring */}
      {isLocal && (
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial
            color={isIT ? "#ff4422" : "#00ffaa"}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* IT glow effect */}
      {isIT && (
        <pointLight color="#ff4422" intensity={3} distance={5} decay={2} />
      )}
    </group>
  );
}
