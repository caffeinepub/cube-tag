import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";
import { useRef, useState } from "react";

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
  onCreateRoom: (playerName: string, controlMode: "pc" | "mobile") => void;
  onJoinRoom: (
    playerName: string,
    roomCode: string,
    controlMode: "pc" | "mobile",
  ) => void;
}

export function HomeScreen({ onCreateRoom, onJoinRoom }: HomeScreenProps) {
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"main" | "join" | "controls">("main");
  const [error, setError] = useState("");
  const pendingAction = useRef<"create" | "join">("create");

  const handleCreate = () => {
    if (!playerName.trim()) {
      setError("Enter your name first!");
      return;
    }
    pendingAction.current = "create";
    setMode("controls");
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      setError("Enter your name first!");
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length < 4) {
      setError("Enter a valid room code!");
      return;
    }
    pendingAction.current = "join";
    setMode("controls");
  };

  const handleSelectControl = (controlMode: "pc" | "mobile") => {
    if (pendingAction.current === "create") {
      onCreateRoom(playerName.trim(), controlMode);
    } else {
      onJoinRoom(playerName.trim(), joinCode.trim().toUpperCase(), controlMode);
    }
  };

  const handleBackFromControls = () => {
    setMode(pendingAction.current === "join" ? "join" : "main");
  };

  return (
    <div className="relative min-h-screen w-full bg-game-deep overflow-hidden flex items-center justify-center scanlines">
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
        className="relative z-10 w-full max-w-md px-6"
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
            100 seconds. Don&apos;t be IT.
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
            /* Player Name Input — shown on main and join screens */
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

          {error && (
            <motion.p
              className="text-sm"
              style={{ color: "oklch(0.65 0.28 25)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ⚠ {error}
            </motion.p>
          )}

          {mode === "main" && (
            <div className="space-y-3">
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
                onClick={() => setMode("join")}
              >
                🔗 Join Room
              </Button>
            </div>
          )}

          {mode === "join" && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-2">
                <Label
                  className="text-xs tracking-widest uppercase text-muted-foreground"
                  htmlFor="room-code"
                >
                  Room Code
                </Label>
                <Input
                  id="room-code"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  maxLength={8}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground font-mono text-center text-xl tracking-widest h-12 uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
              </div>
              <Button
                className="w-full h-12 text-base font-bold tracking-wide"
                style={{
                  background: "oklch(0.75 0.22 140)",
                  color: "oklch(0.1 0.02 140)",
                }}
                onClick={handleJoin}
              >
                🎮 Join Game
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setMode("main");
                  setError("");
                }}
              >
                ← Back
              </Button>
            </motion.div>
          )}

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
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      border: "1px solid oklch(0.82 0.18 195 / 0.9)",
                      boxShadow:
                        "0 0 16px oklch(0.82 0.18 195 / 0.35), inset 0 0 20px oklch(0.82 0.18 195 / 0.05)",
                    }}
                  />
                  {/* Icon */}
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
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{
                      border: "1px solid oklch(0.75 0.22 140 / 0.9)",
                      boxShadow:
                        "0 0 16px oklch(0.75 0.22 140 / 0.35), inset 0 0 20px oklch(0.75 0.22 140 / 0.05)",
                    }}
                  />
                  {/* Icon */}
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
              Tag other players to pass IT · Survive 100 seconds
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
