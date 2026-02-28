import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomView } from "../types/game";

const DECO_CUBES = [
  {
    id: "c0",
    left: "10%",
    top: "15%",
    color: "oklch(0.82 0.18 195)",
    duration: 3,
    delay: 0,
  },
  {
    id: "c1",
    left: "22%",
    top: "40%",
    color: "oklch(0.75 0.22 140)",
    duration: 3.7,
    delay: 0.4,
  },
  {
    id: "c2",
    left: "34%",
    top: "15%",
    color: "oklch(0.82 0.18 195)",
    duration: 4.4,
    delay: 0.8,
  },
  {
    id: "c3",
    left: "46%",
    top: "40%",
    color: "oklch(0.75 0.22 140)",
    duration: 5.1,
    delay: 1.2,
  },
  {
    id: "c4",
    left: "58%",
    top: "65%",
    color: "oklch(0.82 0.18 195)",
    duration: 5.8,
    delay: 1.6,
  },
  {
    id: "c5",
    left: "70%",
    top: "40%",
    color: "oklch(0.75 0.22 140)",
    duration: 6.5,
    delay: 2.0,
  },
  {
    id: "c6",
    left: "82%",
    top: "15%",
    color: "oklch(0.82 0.18 195)",
    duration: 7.2,
    delay: 2.4,
  },
  {
    id: "c7",
    left: "94%",
    top: "40%",
    color: "oklch(0.75 0.22 140)",
    duration: 7.9,
    delay: 2.8,
  },
];

interface HomeScreenProps {
  onCreateRoom: (
    playerName: string,
    roomName: string,
    controlMode: "pc" | "mobile",
  ) => void;
  onJoinRoom: (
    playerName: string,
    roomCode: string,
    controlMode: "pc" | "mobile",
  ) => void;
  onFetchRooms?: () => Promise<RoomView[]>;
  sensitivity?: number;
  onSensitivityChange?: (val: number) => void;
  graphicsQuality?: "fast" | "medium" | "high";
  onGraphicsChange?: (q: "fast" | "medium" | "high") => void;
  joinError?: string;
  isJoining?: boolean;
}

export function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  onFetchRooms,
  sensitivity,
  onSensitivityChange,
  graphicsQuality = "medium",
  onGraphicsChange,
  joinError,
  isJoining,
}: HomeScreenProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [mode, setMode] = useState<
    "main" | "browse" | "create-name" | "controls"
  >("main");
  const [error, setError] = useState("");

  // Browse state
  const [openRooms, setOpenRooms] = useState<RoomView[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [showCodeFallback, setShowCodeFallback] = useState(false);
  const [fallbackCode, setFallbackCode] = useState("");
  const [pendingRoomCode, setPendingRoomCode] = useState("");

  const pendingAction = useRef<"create" | "browse-join">("create");
  const browseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    if (!onFetchRooms) return;
    setRoomsLoading(true);
    try {
      const rooms = await onFetchRooms();
      setOpenRooms(rooms);
    } catch {
      // silently fail
    } finally {
      setRoomsLoading(false);
    }
  }, [onFetchRooms]);

  // Auto-refresh rooms every 3s while in browse mode
  useEffect(() => {
    if (mode === "browse") {
      fetchRooms();
      browseIntervalRef.current = setInterval(fetchRooms, 3000);
    } else {
      if (browseIntervalRef.current) {
        clearInterval(browseIntervalRef.current);
        browseIntervalRef.current = null;
      }
    }
    return () => {
      if (browseIntervalRef.current) {
        clearInterval(browseIntervalRef.current);
        browseIntervalRef.current = null;
      }
    };
  }, [mode, fetchRooms]);

  const handleCreate = () => {
    if (!playerName.trim()) {
      setError("Enter your name first!");
      return;
    }
    pendingAction.current = "create";
    setMode("create-name");
  };

  const handleContinueCreateName = () => {
    if (!roomName.trim()) {
      setError("Enter a room name!");
      return;
    }
    setMode("controls");
  };

  const handleBrowseJoin = (code: string) => {
    if (!playerName.trim()) {
      setError("Enter your name first!");
      setMode("main");
      return;
    }
    setPendingRoomCode(code);
    pendingAction.current = "browse-join";
    setMode("controls");
  };

  const handleFallbackJoin = () => {
    if (!playerName.trim()) {
      setError("Enter your name first!");
      setMode("main");
      return;
    }
    if (!fallbackCode.trim() || fallbackCode.trim().length < 4) {
      setError("Enter a valid room code!");
      return;
    }
    setPendingRoomCode(fallbackCode.trim().toUpperCase());
    pendingAction.current = "browse-join";
    setMode("controls");
  };

  const handleSelectControl = (controlMode: "pc" | "mobile") => {
    if (pendingAction.current === "create") {
      onCreateRoom(playerName.trim(), roomName.trim(), controlMode);
    } else {
      onJoinRoom(playerName.trim(), pendingRoomCode, controlMode);
    }
  };

  // When a backend join error arrives, go back to browse screen so user sees it
  useEffect(() => {
    if (
      joinError &&
      mode === "controls" &&
      pendingAction.current === "browse-join"
    ) {
      setMode("browse");
    }
  }, [joinError, mode]);

  const displayError = error || "";

  const handleBackFromControls = () => {
    if (pendingAction.current === "browse-join") {
      setMode("browse");
    } else {
      setMode("create-name");
    }
  };

  const mapTypeBadge = (type: string) => {
    if (type === "3d") return "3D";
    if (type === "2d-platformer") return "2D";
    return "RAND";
  };

  return (
    <div className="relative min-h-screen w-full bg-game-deep flex items-center justify-center scanlines overflow-y-auto">
      {/* Animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Floating cubes decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {DECO_CUBES.map((cube) => (
          <motion.div
            key={cube.id}
            className="absolute w-8 h-8 rounded-sm opacity-20"
            style={{
              left: cube.left,
              top: cube.top,
              background: cube.color,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 180, 360],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: cube.duration,
              repeat: Number.POSITIVE_INFINITY,
              delay: cube.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md px-6 py-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-game-it rounded-sm rotate-12 shadow-neon-it" />
            <h1
              className="text-6xl font-display font-black tracking-tight text-glow-cyan"
              style={{ color: "oklch(0.82 0.18 195)" }}
            >
              CUBE TAG
            </h1>
            <div className="w-8 h-8 bg-game-it rounded-sm -rotate-12 shadow-neon-it" />
          </div>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            Don&apos;t be IT.
          </p>
        </motion.div>

        {/* Game panel */}
        <motion.div
          className="game-panel rounded-xl p-6 space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {mode !== "controls" && (
            /* Player Name Input — shown on all non-controls screens */
            <div className="space-y-2">
              <Label
                className="text-xs tracking-widest uppercase text-muted-foreground"
                htmlFor="player-name"
              >
                Your Name
              </Label>
              <Input
                id="player-name"
                placeholder="Enter your name..."
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setError("");
                }}
                maxLength={16}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 h-11"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {displayError && (
              <motion.p
                key="local-err"
                className="text-sm"
                style={{ color: "oklch(0.65 0.28 25)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                ⚠ {displayError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* ── MAIN MODE ── */}
          {mode === "main" && (
            <div className="space-y-3">
              {/* Look Sensitivity slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                    Look Sensitivity
                  </Label>
                  <span
                    style={{ color: "oklch(0.82 0.18 195)" }}
                    className="text-sm font-bold"
                  >
                    {sensitivity?.toFixed(1) ?? "1.0"}x
                  </span>
                </div>
                <Slider
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={[sensitivity ?? 1.0]}
                  onValueChange={(v) => onSensitivityChange?.(v[0])}
                  className="w-full"
                />
              </div>

              {/* Graphics Quality Picker */}
              <div className="space-y-2">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Graphics Quality
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        key: "fast",
                        label: "Fast",
                        desc: "No shaders, max performance",
                        color: "oklch(0.75 0.22 140)",
                      },
                      {
                        key: "medium",
                        label: "Medium",
                        desc: "Balanced (recommended)",
                        color: "oklch(0.82 0.18 195)",
                      },
                      {
                        key: "high",
                        label: "High",
                        desc: "Full shaders & shadows",
                        color: "oklch(0.72 0.25 310)",
                      },
                    ] as const
                  ).map(({ key, label, desc, color }) => {
                    const isActive = graphicsQuality === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onGraphicsChange?.(key)}
                        className="relative rounded-lg p-2.5 text-center cursor-pointer transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        style={{
                          background: isActive
                            ? `oklch(from ${color} l c h / 0.15)`
                            : "oklch(0.14 0.03 260 / 0.6)",
                          border: `1px solid ${isActive ? color : "oklch(0.35 0.05 260 / 0.4)"}`,
                          boxShadow: isActive
                            ? `0 0 10px ${color}40`
                            : undefined,
                        }}
                      >
                        <div
                          className="text-xs font-black tracking-wide mb-0.5"
                          style={{
                            color: isActive ? color : "oklch(0.65 0.05 260)",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          className="text-[10px] leading-tight"
                          style={{ color: "oklch(0.5 0.04 260)" }}
                        >
                          {desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-bold tracking-wide neon-border-cyan"
                style={{
                  background: "oklch(0.82 0.18 195)",
                  color: "oklch(0.1 0.02 260)",
                }}
                onClick={handleCreate}
              >
                ⚡ Create Room
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 text-base font-bold tracking-wide border-border hover:bg-secondary"
                onClick={() => {
                  if (!playerName.trim()) {
                    setError("Enter your name first!");
                    return;
                  }
                  setError("");
                  setMode("browse");
                }}
              >
                🌐 Browse Rooms
              </Button>
            </div>
          )}

          {/* ── CREATE-NAME MODE ── */}
          {mode === "create-name" && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-2">
                <Label
                  className="text-xs tracking-widest uppercase text-muted-foreground"
                  htmlFor="room-name"
                >
                  Room Name
                </Label>
                <Input
                  id="room-name"
                  placeholder="e.g. Mike's Room"
                  value={roomName}
                  onChange={(e) => {
                    setRoomName(e.target.value);
                    setError("");
                  }}
                  maxLength={24}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 h-11"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleContinueCreateName()
                  }
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is what others will see in the room browser.
                </p>
              </div>
              <Button
                className="w-full h-12 text-base font-bold tracking-wide neon-border-cyan"
                style={{
                  background: "oklch(0.82 0.18 195)",
                  color: "oklch(0.1 0.02 260)",
                }}
                onClick={handleContinueCreateName}
              >
                Continue →
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setError("");
                  setMode("main");
                }}
              >
                ← Back
              </Button>
            </motion.div>
          )}

          {/* ── BROWSE MODE ── */}
          {mode === "browse" && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Open Rooms
                </Label>
                {roomsLoading && (
                  <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ background: "oklch(0.82 0.18 195)" }}
                  />
                )}
              </div>

              {/* Join error */}
              <AnimatePresence>
                {joinError && (
                  <motion.p
                    key="join-err"
                    className="text-sm font-medium"
                    style={{ color: "oklch(0.65 0.28 25)" }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    ⚠ Unable to join room
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Room list */}
              <div
                className="space-y-2 overflow-y-auto pr-1"
                style={{ maxHeight: "260px" }}
              >
                {roomsLoading && openRooms.length === 0 ? (
                  /* Loading skeletons */
                  [0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3 animate-pulse"
                      style={{
                        background: "oklch(0.14 0.03 260 / 0.6)",
                        border: "1px solid oklch(0.35 0.05 260 / 0.4)",
                        height: "60px",
                      }}
                    />
                  ))
                ) : openRooms.length === 0 ? (
                  <div className="text-center py-6 space-y-1">
                    <p className="text-2xl">🕹️</p>
                    <p className="text-sm text-muted-foreground">
                      No open rooms yet.
                    </p>
                    <p className="text-xs text-muted-foreground opacity-70">
                      Be the first to create one!
                    </p>
                  </div>
                ) : (
                  openRooms.map((room) => (
                    <motion.div
                      key={room.roomCode}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150 group"
                      style={{
                        background: "oklch(0.14 0.03 260 / 0.6)",
                        border: "1px solid oklch(0.35 0.05 260 / 0.4)",
                      }}
                      whileHover={{
                        borderColor: "oklch(0.82 0.18 195 / 0.6)",
                        boxShadow: "0 0 12px oklch(0.82 0.18 195 / 0.2)",
                      }}
                    >
                      {/* Room info */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-bold truncate"
                          style={{ color: "oklch(0.9 0.06 220)" }}
                        >
                          {room.roomName || room.roomCode}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            👥 {room.players.length}/10
                          </span>
                          <span
                            className="text-[10px] font-black px-1.5 py-0.5 rounded"
                            style={{
                              background: "oklch(0.82 0.18 195 / 0.15)",
                              color: "oklch(0.82 0.18 195)",
                              border: "1px solid oklch(0.82 0.18 195 / 0.3)",
                            }}
                          >
                            {mapTypeBadge(room.selectedMapType)}
                          </span>
                        </div>
                      </div>
                      {/* Join button */}
                      <button
                        type="button"
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all duration-150 active:scale-95"
                        style={{
                          background: "oklch(0.75 0.22 140)",
                          color: "oklch(0.1 0.02 140)",
                        }}
                        onClick={() => handleBrowseJoin(room.roomCode)}
                        disabled={isJoining}
                      >
                        {isJoining ? "..." : "Join →"}
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Have a code? fallback */}
              <div
                className="rounded-lg overflow-hidden transition-all duration-200"
                style={{
                  border: "1px solid oklch(0.35 0.05 260 / 0.3)",
                }}
              >
                <button
                  type="button"
                  className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground text-left flex items-center gap-2 transition-colors"
                  onClick={() => setShowCodeFallback((v) => !v)}
                >
                  <span>{showCodeFallback ? "▾" : "▸"}</span>
                  Have a room code?
                </button>
                <AnimatePresence>
                  {showCodeFallback && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 px-3 pb-3">
                        <Input
                          placeholder="XXXXXX"
                          value={fallbackCode}
                          onChange={(e) =>
                            setFallbackCode(e.target.value.toUpperCase())
                          }
                          maxLength={8}
                          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground font-mono text-center text-sm tracking-widest h-9 uppercase flex-1"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleFallbackJoin()
                          }
                        />
                        <Button
                          className="h-9 px-4 text-sm font-bold"
                          style={{
                            background: "oklch(0.75 0.22 140)",
                            color: "oklch(0.1 0.02 140)",
                          }}
                          onClick={handleFallbackJoin}
                          disabled={isJoining}
                        >
                          {isJoining ? "..." : "Join"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setError("");
                  setMode("main");
                }}
              >
                ← Back
              </Button>
            </motion.div>
          )}

          {/* ── CONTROLS MODE ── */}
          {mode === "controls" && (
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="text-center space-y-1">
                <p
                  className="text-xs tracking-widest uppercase font-bold"
                  style={{ color: "oklch(0.82 0.18 195)" }}
                >
                  Choose Your Controls
                </p>
                <p className="text-xs text-muted-foreground">
                  How will you play,{" "}
                  <span className="text-foreground font-semibold">
                    {playerName}
                  </span>
                  ?
                </p>
              </div>

              {/* Control cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* PC Card */}
                <motion.button
                  className="relative group rounded-xl p-5 text-center cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{
                    background: "oklch(0.14 0.03 260 / 0.8)",
                    border: "1px solid oklch(0.82 0.18 195 / 0.3)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectControl("pc")}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSelectControl("pc")
                  }
                >
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      border: "1px solid oklch(0.82 0.18 195 / 0.9)",
                      boxShadow:
                        "0 0 16px oklch(0.82 0.18 195 / 0.35), inset 0 0 20px oklch(0.82 0.18 195 / 0.05)",
                    }}
                  />
                  <div className="text-4xl mb-3 leading-none">⌨️</div>
                  <div
                    className="text-sm font-black tracking-wide mb-1"
                    style={{ color: "oklch(0.82 0.18 195)" }}
                  >
                    PC / Desktop
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    WASD or Arrow Keys
                  </div>
                </motion.button>

                {/* Mobile Card */}
                <motion.button
                  className="relative group rounded-xl p-5 text-center cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{
                    background: "oklch(0.14 0.03 260 / 0.8)",
                    border: "1px solid oklch(0.75 0.22 140 / 0.3)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectControl("mobile")}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSelectControl("mobile")
                  }
                >
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      border: "1px solid oklch(0.75 0.22 140 / 0.9)",
                      boxShadow:
                        "0 0 16px oklch(0.75 0.22 140 / 0.35), inset 0 0 20px oklch(0.75 0.22 140 / 0.05)",
                    }}
                  />
                  <div className="text-4xl mb-3 leading-none">📱</div>
                  <div
                    className="text-sm font-black tracking-wide mb-1"
                    style={{ color: "oklch(0.75 0.22 140)" }}
                  >
                    Mobile
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    On-screen joystick
                  </div>
                </motion.button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleBackFromControls}
              >
                ← Back
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Controls hint */}
        {mode !== "controls" && (
          <motion.div
            className="mt-6 text-center space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-muted-foreground">
              🎮 WASD or Arrow Keys to move
            </p>
            <p className="text-xs text-muted-foreground">
              Tag other players to pass IT · Survive the timer
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8 opacity-50">
          © {new Date().getFullYear()}. Built with ❤ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="underline hover:opacity-80"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
