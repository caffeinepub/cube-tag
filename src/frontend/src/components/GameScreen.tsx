import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ObstacleBox, PlayerState } from "../types/game";
import { Scene } from "./game/Scene";
import { useGameLoopLogic } from "./game/useGameLoop";

// Bot photo thumbnails for scoreboard HUD
const BOT_PHOTO_MAP: Record<string, string> = {
  "bot-0": "/assets/uploads/IMG_0965-1.jpeg",
  "bot-1": "/assets/uploads/IMG_0963-2.jpeg",
  "bot-2": "/assets/uploads/IMG_0964-3.jpeg",
  "bot-3": "/assets/uploads/IMG_0451-4.jpeg",
};

// ─── Mobile D-pad Controls ────────────────────────────────────────────────────

interface MobileControlsProps {
  keysRef: MutableRefObject<Set<string>>;
  is2D: boolean;
}

function DPadButton({
  label,
  keyCode,
  keysRef,
  className,
}: {
  label: string;
  keyCode: string;
  keysRef: MutableRefObject<Set<string>>;
  className?: string;
}) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    keysRef.current.add(keyCode);
  };
  const handlePointerUp = () => {
    keysRef.current.delete(keyCode);
  };

  return (
    <button
      type="button"
      className={`flex items-center justify-center select-none touch-none rounded-lg text-lg font-black transition-colors active:scale-95 ${className ?? ""}`}
      style={{
        background: "oklch(0.15 0.03 260 / 0.75)",
        border: "1px solid oklch(0.82 0.18 195 / 0.35)",
        color: "oklch(0.82 0.18 195)",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

function MobileControls({ keysRef, is2D }: MobileControlsProps) {
  const btnSize = "w-14 h-14";

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 30 }}
    >
      {/* Left side D-pad */}
      <div
        className="absolute pointer-events-auto"
        style={{ bottom: "6rem", left: "1.5rem" }}
      >
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: "56px 56px 56px",
            gridTemplateRows: "56px 56px 56px",
          }}
        >
          <div />
          <DPadButton
            label="↑"
            keyCode="KeyW"
            keysRef={keysRef}
            className={btnSize}
          />
          <div />
          <DPadButton
            label="←"
            keyCode="KeyA"
            keysRef={keysRef}
            className={btnSize}
          />
          <div />
          <DPadButton
            label="→"
            keyCode="KeyD"
            keysRef={keysRef}
            className={btnSize}
          />
          <div />
          {is2D ? (
            <div />
          ) : (
            <DPadButton
              label="↓"
              keyCode="KeyS"
              keysRef={keysRef}
              className={btnSize}
            />
          )}
          <div />
        </div>
      </div>

      {/* Right side - Jump button (2D only) */}
      {is2D && (
        <div
          className="absolute pointer-events-auto"
          style={{ bottom: "6rem", right: "1.5rem" }}
        >
          <button
            type="button"
            className="w-20 h-20 rounded-full flex items-center justify-center select-none touch-none font-black text-sm tracking-widest transition-transform active:scale-95"
            style={{
              background: "oklch(0.75 0.22 140 / 0.25)",
              border: "2px solid oklch(0.75 0.22 140 / 0.7)",
              color: "oklch(0.75 0.22 140)",
              boxShadow: "0 0 16px oklch(0.75 0.22 140 / 0.25)",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              keysRef.current.add("Space");
            }}
            onPointerUp={() => keysRef.current.delete("Space")}
            onPointerLeave={() => keysRef.current.delete("Space")}
            onContextMenu={(e) => e.preventDefault()}
          >
            JUMP
          </button>
        </div>
      )}
    </div>
  );
}

interface GameScreenProps {
  initialPlayers: PlayerState[];
  obstacles: ObstacleBox[];
  onGameEnd: (players: PlayerState[], winners: string[]) => void;
  isHost?: boolean;
  onKickPlayer?: (id: string) => void;
  mapType?: "3d" | "2d-platformer";
  controlMode?: "pc" | "mobile";
  gameDuration?: number;
}

export function GameScreen({
  initialPlayers,
  obstacles,
  onGameEnd,
  isHost = false,
  onKickPlayer,
  mapType = "3d",
  controlMode = "pc",
  gameDuration = 100,
}: GameScreenProps) {
  const [players, setPlayers] = useState<PlayerState[]>(initialPlayers);
  const [timeRemaining, setTimeRemaining] = useState(gameDuration);
  const [gameActive, setGameActive] = useState(true);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [tagFlash, setTagFlash] = useState(false);
  const prevLocalITRef = useRef(
    initialPlayers.find((p) => p.isLocal)?.isIT ?? false,
  );

  const { playersRef, keysRef, obstaclesRef, cameraRef, updateFrame } =
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

  // Tag flash detection — when local player becomes IT, flash the screen red
  useEffect(() => {
    const localPlayer = players.find((p) => p.isLocal);
    const isLocalIT = localPlayer?.isIT ?? false;
    if (isLocalIT && !prevLocalITRef.current) {
      // Just became IT — flash!
      setTagFlash(true);
      setTimeout(() => setTagFlash(false), 600);
    }
    prevLocalITRef.current = isLocalIT;
  }, [players]);

  const localPlayer = players.find((p) => p.isLocal);
  const isLocalIT = localPlayer?.isIT ?? false;
  const itPlayer = players.find((p) => p.isIT);
  const localImmunityTimer = localPlayer?.tagImmunityTimer ?? 0;

  // Timer color
  const timeColor =
    timeRemaining > 60
      ? "oklch(0.82 0.18 195)"
      : timeRemaining > 20
        ? "oklch(0.85 0.18 85)"
        : "oklch(0.65 0.28 25)";

  const is2D = mapType === "2d-platformer";
  const kickablePlayers = players.filter((p) => !p.isLocal);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-game-deep">
      {/* 3D Canvas */}
      <Canvas
        shadows
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0.9, 0] }}
        frameloop="always"
      >
        <Scene
          players={players}
          obstacles={obstacles}
          keysRef={keysRef}
          onFrame={updateFrame}
          onPlayersUpdate={handlePlayersUpdate}
          mapType={mapType}
          cameraRef={cameraRef}
          onPointerLockChange={setIsPointerLocked}
          controlMode={controlMode}
        />
      </Canvas>

      {/* ── CROSSHAIR ────────────────────────────────────── */}
      {isPointerLocked && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ zIndex: 20 }}
        >
          <div style={{ position: "relative", width: 20, height: 20 }}>
            {/* Horizontal */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: 2,
                background: "rgba(255,255,255,0.8)",
                transform: "translateY(-50%)",
                borderRadius: 1,
              }}
            />
            {/* Vertical */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: 2,
                background: "rgba(255,255,255,0.8)",
                transform: "translateX(-50%)",
                borderRadius: 1,
              }}
            />
          </div>
        </div>
      )}

      {/* ── TAG FLASH OVERLAY ────────────────────────────── */}
      <AnimatePresence>
        {tagFlash && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "oklch(0.55 0.28 25 / 0.55)",
              zIndex: 25,
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {/* ── POINTER LOCK / CLICK TO PLAY OVERLAY ─────────── */}
      {controlMode === "pc" && !isPointerLocked && gameActive && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "oklch(0.06 0.02 260 / 0.85)",
            zIndex: 40,
            backdropFilter: "blur(4px)",
          }}
        >
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="text-5xl font-display font-black mb-3"
              style={{
                color: "oklch(0.82 0.18 195)",
                textShadow: "0 0 30px oklch(0.82 0.18 195 / 0.8)",
              }}
            >
              CUBE TAG
            </div>
            <div
              className="text-lg font-bold mb-2"
              style={{ color: "oklch(0.75 0.04 260)" }}
            >
              Click anywhere to play
            </div>
            <div className="text-sm" style={{ color: "oklch(0.55 0.04 260)" }}>
              Press{" "}
              <kbd
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  background: "oklch(0.2 0.03 260)",
                  border: "1px solid oklch(0.35 0.04 260)",
                }}
              >
                Esc
              </kbd>{" "}
              to pause
            </div>
            <div
              className="mt-4 text-sm"
              style={{ color: "oklch(0.6 0.1 195)" }}
            >
              {is2D
                ? "A/D to move · Space to jump · Mouse to look"
                : "WASD to move · Mouse to look"}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── HUD OVERLAY ──────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        {/* Map type badge */}
        {is2D && (
          <div
            className="absolute top-5 left-1/2 -translate-x-1/2"
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

        {/* Top Center - Timer */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <motion.div
            className="game-panel rounded-xl px-6 py-3 text-center"
            animate={{
              scale:
                timeRemaining <= 20 && timeRemaining > 0 ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 0.5,
              repeat: timeRemaining <= 20 ? Number.POSITIVE_INFINITY : 0,
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
              style={{ border: "1px solid oklch(0.65 0.28 25 / 0.4)" }}
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

        {/* Center Bottom - Tag Immunity indicator */}
        <AnimatePresence>
          {localImmunityTimer > 0 && (
            <motion.div
              className="absolute bottom-32 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="animate-pulse-it game-panel rounded-xl px-5 py-2 text-center"
                style={{
                  border: "1px solid rgba(255,255,255,0.5)",
                  boxShadow: "0 0 20px rgba(255,255,255,0.3)",
                }}
              >
                <div
                  className="text-base font-display font-black tracking-widest"
                  style={{
                    color: "#ffffff",
                    textShadow: "0 0 10px rgba(255,255,255,0.8)",
                  }}
                >
                  IMMUNE: {Math.ceil(localImmunityTimer)}s
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom - Scoreboard */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <div className="game-panel rounded-xl px-4 py-3 flex gap-3">
            {players.map((p) => {
              const botPhoto = p.isBot ? BOT_PHOTO_MAP[p.id] : null;
              return (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  {botPhoto ? (
                    <img
                      src={botPhoto}
                      alt={p.name}
                      className="w-6 h-6 rounded-sm object-cover"
                      style={{
                        border: p.isIT
                          ? "2px solid #ff3a1a"
                          : p.isLocal
                            ? "2px solid white"
                            : "2px solid transparent",
                        boxShadow: p.isIT ? "0 0 8px #ff3a1a" : undefined,
                      }}
                    />
                  ) : (
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
                  )}
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
                  {(p.tagImmunityTimer ?? 0) > 0 && (
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      🛡
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls reminder - bottom right */}
        {controlMode === "pc" && (
          <div className="absolute bottom-5 right-5">
            <div className="game-panel rounded-lg px-3 py-2 opacity-60">
              {is2D ? (
                <p className="text-xs text-muted-foreground">
                  A/D move · Space jump · Mouse look
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  WASD move · Mouse look
                </p>
              )}
            </div>
          </div>
        )}
        {controlMode === "mobile" && (
          <div className="absolute bottom-5 right-5">
            <div className="game-panel rounded-lg px-3 py-2 opacity-60">
              <p className="text-xs text-muted-foreground">
                Use on-screen controls
              </p>
            </div>
          </div>
        )}

        {/* Mobile Controls Overlay */}
        {controlMode === "mobile" && gameActive && (
          <MobileControls keysRef={keysRef} is2D={is2D} />
        )}

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
