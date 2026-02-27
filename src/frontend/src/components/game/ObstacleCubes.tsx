import type { ObstacleBox } from "../../types/game";

interface ObstacleCubesProps {
  obstacles: ObstacleBox[];
}

export function ObstacleCubes({ obstacles }: ObstacleCubesProps) {
  return (
    <>
      {obstacles.map((obs) => (
        <mesh
          key={obs.id}
          position={[obs.position.x, obs.position.y, obs.position.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[obs.size.x, obs.size.y, obs.size.z]} />
          <meshStandardMaterial
            color={obs.color}
            roughness={0.85}
            metalness={0.1}
          />
        </mesh>
      ))}
    </>
  );
}
