import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import type { PlayerState } from "../types/game";

interface LobbyScreenProps {
  roomCode: string;
  isHost: boolean;
  playerName: string;
  players: PlayerState[];
  onStartGame: () => void;
  onLeave: () => void;
  onKickPlayer?: (id: string) => void;
  mapType?: "3d" | "2d-platformer";
}

export function LobbyScreen({
  roomCode,
  isHost,
  players,
  onStartGame,
  onLeave,
  onKickPlayer,
  mapType,
}: LobbyScreenProps) {
  const mapLabel =
    mapType === "2d-platformer"
      ? "2D JUMP"
      : mapType === "3d"
        ? "3D ARENA"
        : "Random";

  return (
    <div className="relative min-h-screen w-full bg-game-deep overflow-hidden flex items-center justify-center scanlines">
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
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">
            Room Code
          </p>
          <div
            className="text-5xl font-display font-black tracking-widest text-glow-cyan"
            style={{ color: "oklch(0.82 0.18 195)" }}
          >
            {roomCode}
          </div>
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
            Players ({players.length}/4)
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

        {/* Game info */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { label: "Time", value: "100s" },
            { label: "Players", value: `${players.length}` },
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
