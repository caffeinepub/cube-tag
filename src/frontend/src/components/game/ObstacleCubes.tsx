import * as THREE from "three";
import type { GraphicsQuality, ObstacleBox } from "../../types/game";

interface ObstacleCubesProps {
  obstacles: ObstacleBox[];
  graphicsQuality?: GraphicsQuality;
}

/**
 * Compute an emissive glow color from the base color.
 * We parse the hex and brighten it significantly for a neon glow.
 */
function hexToEmissive(hex: string): string {
  // Parse hex color and create a brighter emissive version
  try {
    const color = new THREE.Color(hex);
    // Boost the color for emissive
    color.multiplyScalar(2.5);
    return `#${color.getHexString()}`;
  } catch {
    return "#112255";
  }
}

export function ObstacleCubes({
  obstacles,
  graphicsQuality = "medium",
}: ObstacleCubesProps) {
  return (
    <>
      {obstacles.map((obs) => {
        if (graphicsQuality === "fast") {
          // Fast mode: meshBasicMaterial — no lighting calculation
          return (
            <mesh
              key={obs.id}
              position={[obs.position.x, obs.position.y, obs.position.z]}
              rotation={
                obs.rotation
                  ? [obs.rotation.x, obs.rotation.y, obs.rotation.z]
                  : [0, 0, 0]
              }
            >
              <boxGeometry args={[obs.size.x, obs.size.y, obs.size.z]} />
              <meshBasicMaterial color={obs.color} />
            </mesh>
          );
        }

        const emissiveColor = hexToEmissive(obs.color);
        return (
          <mesh
            key={obs.id}
            position={[obs.position.x, obs.position.y, obs.position.z]}
            rotation={
              obs.rotation
                ? [obs.rotation.x, obs.rotation.y, obs.rotation.z]
                : [0, 0, 0]
            }
            castShadow={graphicsQuality === "high"}
            receiveShadow={graphicsQuality === "high"}
          >
            <boxGeometry args={[obs.size.x, obs.size.y, obs.size.z]} />
            <meshStandardMaterial
              color={obs.color}
              emissive={emissiveColor}
              emissiveIntensity={0.6}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
        );
      })}
    </>
  );
}
