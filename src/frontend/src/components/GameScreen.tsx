import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ObstacleBox, PlayerState } from "../types/game";
import { Scene } from "./game/Scene";
import { useGameLoopLogic } from "./game/useGameLoop";

const GAME_DURATION = 100;

interface GameScreenProps {
  initialPlayers: PlayerState[];
  obstacles: ObstacleBox[];
  onGameEnd: (players: PlayerState[], winners: string[]) => void;
  isHost?: boolean;
  onKickPlayer?: (id: string) => void;
  mapType?: "3d" | "2d-platformer";
}

export function GameScreen({
  initialPlayers,
  obstacles,
  onGameEnd,
  isHost = false,
  onKickPlayer,
  mapType = "3d",
}: GameScreenProps) {
  const [players, setPlayers] = useState<PlayerState[]>(initialPlayers);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [gameActive, setGameActive] = useState(true);

  const { playersRef, keysRef, obstaclesRef, updateFrame } =
    useGameLoopLogic(mapType);

  // Initialize refs
  useEffect(() => {
    playersRef.current = initialPlayers;
    obstaclesRef.current = obstacles;
  }, [initialPlayers, obstacles, playersRef, obstaclesRef]);

  // Sync players ref with state changes from frame updates
  const handlePlayersUpdate = useCallback((updatedPlayers: PlayerState[]) => {
    setPlayers([...updatedPlayers]);
  }, []);

  // Handle kick: remove from local state and ref
  const handleKick = useCallback(
    (id: string) => {
      playersRef.current = playersRef.current.filter((p) => p.id !== id);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      onKickPlayer?.(id);
    },
    [onKickPlayer, playersRef],
  );

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      // Prevent arrow key page scrolling
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keysRef]);

  // Game timer
  useEffect(() => {
    if (!gameActive) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setGameActive(false);
          // Determine winners: players who are NOT IT
          const finalPlayers = playersRef.current;
          const winners = finalPlayers.filter((p) => !p.isIT).map((p) => p.id);
          setTimeout(() => onGameEnd(finalPlayers, winners), 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameActive, onGameEnd, playersRef]);

  const localPlayer = players.find((p) => p.isLocal);
  const isLocalIT = localPlayer?.isIT ?? false;
  const itPlayer = players.find((p) => p.isIT);

  // Timer color
  const timeColor =
    timeRemaining > 30
      ? "oklch(0.82 0.18 195)"
      : timeRemaining > 10
        ? "oklch(0.85 0.18 85)"
        : "oklch(0.65 0.28 25)";

  const is2D = mapType === "2d-platformer";

  // Non-local players that can be kicked
  const kickablePlayers = players.filter((p) => !p.isLocal);

  const canvasProps = is2D
    ? {
        orthographic: true as const,
        camera: { position: [0, 5, 20] as [number, number, number], zoom: 50 },
      }
    : {
        camera: { position: [0, 10, 14] as [number, number, number], fov: 60 },
      };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-game-deep">
      {/* Map type badge */}
      {is2D && (
        <div
          className="absolute top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          style={{ marginTop: "3.5rem" }}
        >
          <div
            className="game-panel rounded-lg px-3 py-1 text-center"
            style={{
              border: "1px solid oklch(0.72 0.25 310 / 0.5)",
              boxShadow: "0 0 10px oklch(0.72 0.25 310 / 0.3)",
            }}
          >
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "oklch(0.72 0.25 310)" }}
            >
              2D JUMP MODE
            </span>
          </div>
        </div>
      )}

      {/* 3D / 2D Canvas */}
      <Canvas
        shadows
        {...canvasProps}
        style={{ position: "absolute", inset: 0 }}
        gl={{ antialias: true }}
      >
        <Scene
          players={players}
          obstacles={obstacles}
          keysRef={keysRef}
          onFrame={updateFrame}
          onPlayersUpdate={handlePlayersUpdate}
          mapType={mapType}
        />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Center - Timer */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <motion.div
            className="game-panel rounded-xl px-6 py-3 text-center"
            animate={{
              scale:
                timeRemaining <= 10 && timeRemaining > 0 ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 0.5,
              repeat: timeRemaining <= 10 ? Number.POSITIVE_INFINITY : 0,
            }}
          >
            <div className="text-xs tracking-widest uppercase text-muted-foreground mb-0.5">
              TIME
            </div>
            <div
              className="text-4xl font-display font-black tabular-nums"
              style={{ color: timeColor, textShadow: `0 0 15px ${timeColor}` }}
            >
              {String(timeRemaining).padStart(2, "0")}
            </div>
          </motion.div>
        </div>

        {/* Top Left - Status */}
        <div className="absolute top-5 left-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLocalIT ? "it" : "safe"}
              className="game-panel rounded-xl px-4 py-3"
              style={{
                border: `1px solid ${isLocalIT ? "oklch(0.65 0.28 25 / 0.6)" : "oklch(0.75 0.22 140 / 0.4)"}`,
                boxShadow: isLocalIT
                  ? "0 0 15px oklch(0.65 0.28 25 / 0.4)"
                  : "0 0 15px oklch(0.75 0.22 140 / 0.3)",
              }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isLocalIT ? (
                <div className="animate-pulse-it">
                  <div className="text-xs tracking-widest uppercase text-muted-foreground mb-0.5">
                    Status
                  </div>
                  <div
                    className="text-lg font-display font-black text-glow-it"
                    style={{ color: "oklch(0.65 0.28 25)" }}
                  >
                    YOU ARE IT! 🔴
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs tracking-widest uppercase text-muted-foreground mb-0.5">
                    Status
                  </div>
                  <div
                    className="text-lg font-display font-black text-glow-safe"
                    style={{ color: "oklch(0.75 0.22 140)" }}
                  >
                    SURVIVE! 💚
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* IT player indicator */}
          {!isLocalIT && itPlayer && (
            <motion.div
              className="game-panel rounded-lg px-3 py-1.5 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-xs text-muted-foreground">
                IT:{" "}
                <span
                  style={{ color: "oklch(0.65 0.28 25)" }}
                  className="font-bold"
                >
                  {itPlayer.name}
                </span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Top Right - Host Kick Panel */}
        {isHost && kickablePlayers.length > 0 && (
          <div className="absolute top-5 right-5 pointer-events-auto">
            <motion.div
              className="game-panel rounded-xl p-3 min-w-[160px]"
              style={{
                border: "1px solid oklch(0.65 0.28 25 / 0.4)",
              }}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">
                Host Controls
              </p>
              <div className="space-y-1.5">
                {kickablePlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        background: p.isIT ? "#ff3a1a" : p.color,
                        boxShadow: `0 0 4px ${p.isIT ? "#ff3a1a" : p.color}60`,
                      }}
                    />
                    <span className="text-xs text-foreground flex-1 truncate max-w-[70px]">
                      {p.name}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 px-2 text-xs font-bold"
                      onClick={() => handleKick(p.id)}
                    >
                      Kick
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Bottom - Scoreboard */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <div className="game-panel rounded-xl px-4 py-3 flex gap-3">
            {players.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <div
                  className="w-6 h-6 rounded-sm"
                  style={{
                    background: p.isIT ? "#ff3a1a" : p.color,
                    boxShadow: p.isIT
                      ? "0 0 8px #ff3a1a"
                      : `0 0 4px ${p.color}60`,
                    border: p.isLocal ? "2px solid white" : "none",
                  }}
                />
                <span className="text-xs text-muted-foreground max-w-[60px] truncate">
                  {p.name}
                </span>
                {p.isIT && (
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.28 25)" }}
                  >
                    IT
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Controls reminder - bottom right */}
        <div className="absolute bottom-5 right-5">
          <div className="game-panel rounded-lg px-3 py-2 opacity-60">
            {is2D ? (
              <p className="text-xs text-muted-foreground">
                A/D ←→ move · W/↑/Space to jump
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                WASD / ↑↓←→ to move
              </p>
            )}
          </div>
        </div>

        {/* Game Over overlay */}
        <AnimatePresence>
          {!gameActive && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "oklch(0.08 0.02 260 / 0.7)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <div
                  className="text-6xl font-display font-black"
                  style={{ color: "oklch(0.82 0.18 195)" }}
                >
                  TIME&apos;S UP!
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
