import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import type { PlayerState } from "../types/game";

interface LobbyScreenProps {
  roomCode: string;
  roomName?: string;
  isHost: boolean;
  playerName: string;
  players: PlayerState[];
  humanPlayerCount?: number; // real humans in the room (from backend)
  onStartGame: () => void;
  onLeave: () => void;
  onKickPlayer?: (id: string) => void;
  mapType?: "3d" | "2d-platformer";
  gameDuration?: number;
  onDurationChange?: (d: number) => void;
  selectedMapType?: "3d" | "2d-platformer" | "random";
  onMapTypeChange?: (t: "3d" | "2d-platformer" | "random") => void;
}

const MAP_TYPE_OPTIONS: {
  value: "3d" | "2d-platformer" | "random";
  label: string;
}[] = [
  { value: "3d", label: "3D ARENA" },
  { value: "2d-platformer", label: "2D JUMP" },
  { value: "random", label: "RANDOM" },
];

export function LobbyScreen({
  roomCode,
  roomName,
  isHost,
  players,
  humanPlayerCount = 1,
  onStartGame,
  onLeave,
  onKickPlayer,
  gameDuration = 100,
  onDurationChange,
  selectedMapType = "random",
  onMapTypeChange,
}: LobbyScreenProps) {
  const mapLabel =
    selectedMapType === "2d-platformer"
      ? "2D JUMP"
      : selectedMapType === "3d"
        ? "3D ARENA"
        : "RANDOM";

  return (
    <div className="relative min-h-screen w-full bg-game-deep flex items-center justify-center scanlines">
      <div className="absolute inset-0 grid-bg opacity-40" />

      <motion.div
        className="relative z-10 w-full max-w-lg px-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2
            className="text-2xl font-display font-black tracking-tight"
            style={{ color: "oklch(0.82 0.18 195)" }}
          >
            GAME LOBBY
          </h2>
        </div>

        {/* Room Code Display */}
        <motion.div
          className="game-panel rounded-2xl p-6 mb-5 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {roomName ? (
            <>
              <div
                className="text-2xl font-display font-black tracking-tight text-glow-cyan mb-1"
                style={{ color: "oklch(0.82 0.18 195)" }}
              >
                {roomName}
              </div>
              <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">
                Code
              </p>
              <div
                className="text-3xl font-display font-black tracking-widest"
                style={{ color: "oklch(0.75 0.14 220)" }}
              >
                {roomCode}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">
                Room Code
              </p>
              <div
                className="text-5xl font-display font-black tracking-widest text-glow-cyan"
                style={{ color: "oklch(0.82 0.18 195)" }}
              >
                {roomCode}
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Share this code with friends
          </p>
        </motion.div>

        {/* Players list */}
        <motion.div
          className="game-panel rounded-2xl p-5 mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-4">
            Players ({humanPlayerCount}/10) ·{" "}
            {players.filter((p) => p.isBot).length} AI
          </p>
          <div className="space-y-2">
            {players.map((player, idx) => (
              <motion.div
                key={player.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
              >
                <div
                  className="w-5 h-5 rounded-sm flex-shrink-0"
                  style={{
                    background: player.color,
                    boxShadow: `0 0 8px ${player.color}60`,
                  }}
                />
                <span className="text-sm font-medium text-foreground flex-1">
                  {player.name}
                </span>
                <div className="flex gap-1 items-center">
                  {player.isLocal && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      YOU
                    </span>
                  )}
                  {player.isBot && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      AI
                    </span>
                  )}
                  {idx === 0 && !player.isBot && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                      HOST
                    </span>
                  )}

                  {/* Kick button — only for host, not for the local (host) player */}
                  {isHost && !player.isLocal && onKickPlayer && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 px-2 text-xs font-bold ml-1"
                      onClick={() => onKickPlayer(player.id)}
                    >
                      Kick
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Duration picker — host only */}
        {isHost && onDurationChange && (
          <motion.div
            className="game-panel rounded-2xl p-4 mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">
              Game Duration
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-black transition-all active:scale-95 hover:opacity-80"
                style={{
                  background: "oklch(0.15 0.03 260 / 0.8)",
                  border: "1px solid oklch(0.82 0.18 195 / 0.4)",
                  color: "oklch(0.82 0.18 195)",
                }}
                onClick={() =>
                  onDurationChange(Math.max(100, gameDuration - 50))
                }
                disabled={gameDuration <= 100}
              >
                −
              </button>
              <div
                className="text-2xl font-display font-black tabular-nums min-w-[80px] text-center"
                style={{ color: "oklch(0.82 0.18 195)" }}
              >
                {gameDuration}s
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-black transition-all active:scale-95 hover:opacity-80"
                style={{
                  background: "oklch(0.15 0.03 260 / 0.8)",
                  border: "1px solid oklch(0.82 0.18 195 / 0.4)",
                  color: "oklch(0.82 0.18 195)",
                }}
                onClick={() =>
                  onDurationChange(Math.min(500, gameDuration + 50))
                }
                disabled={gameDuration >= 500}
              >
                +
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Range: 100s – 500s
            </p>
          </motion.div>
        )}

        {/* Map type selector — host interactive, non-host read-only */}
        <motion.div
          className="game-panel rounded-2xl p-4 mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">
            Map Type
          </p>
          {isHost && onMapTypeChange ? (
            <div className="grid grid-cols-3 gap-2">
              {MAP_TYPE_OPTIONS.map((opt) => {
                const isActive = selectedMapType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className="h-10 rounded-lg text-xs font-black tracking-wider transition-all active:scale-95"
                    style={
                      isActive
                        ? {
                            background: "oklch(0.82 0.18 195)",
                            color: "oklch(0.1 0.02 260)",
                            border: "1px solid oklch(0.82 0.18 195)",
                            boxShadow: "0 0 12px oklch(0.82 0.18 195 / 0.5)",
                          }
                        : {
                            background: "oklch(0.15 0.03 260 / 0.8)",
                            color: "oklch(0.65 0.08 220)",
                            border: "1px solid oklch(0.82 0.18 195 / 0.25)",
                          }
                    }
                    onClick={() => onMapTypeChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-center">
              <span
                className="px-4 py-1.5 rounded-full text-sm font-bold tracking-wide"
                style={{
                  background: "oklch(0.82 0.18 195 / 0.15)",
                  border: "1px solid oklch(0.82 0.18 195 / 0.4)",
                  color: "oklch(0.82 0.18 195)",
                }}
              >
                {mapLabel}
              </span>
            </div>
          )}
        </motion.div>

        {/* Game info */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { label: "Time", value: `${gameDuration}s` },
            { label: "Players", value: `${humanPlayerCount}/10` },
            { label: "Map", value: mapLabel },
          ].map((stat) => (
            <div
              key={stat.label}
              className="game-panel rounded-xl p-3 text-center"
            >
              <div className="text-lg font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Action buttons */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {isHost ? (
            <Button
              className="w-full h-13 text-lg font-bold tracking-wide py-3 neon-border-cyan"
              style={{
                background: "oklch(0.82 0.18 195)",
                color: "oklch(0.1 0.02 260)",
              }}
              onClick={onStartGame}
            >
              🚀 Start Game
            </Button>
          ) : (
            <div className="w-full h-12 flex items-center justify-center text-sm text-muted-foreground game-panel rounded-lg">
              Waiting for host to start...
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={onLeave}
          >
            ← Leave Lobby
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
