import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import type { PlayerState } from "../types/game";

const CONFETTI_PIECES = [
  {
    id: "p0",
    left: "5%",
    color: "oklch(0.82 0.18 195)",
    duration: 2.1,
    delay: 0,
  },
  {
    id: "p1",
    left: "12%",
    color: "oklch(0.75 0.22 140)",
    duration: 2.8,
    delay: 0.1,
  },
  {
    id: "p2",
    left: "19%",
    color: "oklch(0.85 0.18 85)",
    duration: 3.5,
    delay: 0.3,
  },
  {
    id: "p3",
    left: "26%",
    color: "oklch(0.82 0.18 195)",
    duration: 2.2,
    delay: 0.7,
  },
  {
    id: "p4",
    left: "33%",
    color: "oklch(0.75 0.22 140)",
    duration: 3.1,
    delay: 0.2,
  },
  {
    id: "p5",
    left: "40%",
    color: "oklch(0.85 0.18 85)",
    duration: 2.6,
    delay: 0.9,
  },
  {
    id: "p6",
    left: "47%",
    color: "oklch(0.82 0.18 195)",
    duration: 3.3,
    delay: 0.4,
  },
  {
    id: "p7",
    left: "54%",
    color: "oklch(0.75 0.22 140)",
    duration: 2.4,
    delay: 1.1,
  },
  {
    id: "p8",
    left: "61%",
    color: "oklch(0.85 0.18 85)",
    duration: 3.0,
    delay: 0.6,
  },
  {
    id: "p9",
    left: "68%",
    color: "oklch(0.82 0.18 195)",
    duration: 2.9,
    delay: 0.0,
  },
  {
    id: "p10",
    left: "75%",
    color: "oklch(0.75 0.22 140)",
    duration: 3.7,
    delay: 1.3,
  },
  {
    id: "p11",
    left: "82%",
    color: "oklch(0.85 0.18 85)",
    duration: 2.3,
    delay: 0.5,
  },
  {
    id: "p12",
    left: "89%",
    color: "oklch(0.82 0.18 195)",
    duration: 3.4,
    delay: 0.8,
  },
  {
    id: "p13",
    left: "96%",
    color: "oklch(0.75 0.22 140)",
    duration: 2.7,
    delay: 1.4,
  },
  {
    id: "p14",
    left: "8%",
    color: "oklch(0.85 0.18 85)",
    duration: 3.2,
    delay: 0.15,
  },
  {
    id: "p15",
    left: "22%",
    color: "oklch(0.82 0.18 195)",
    duration: 2.5,
    delay: 1.0,
  },
  {
    id: "p16",
    left: "38%",
    color: "oklch(0.75 0.22 140)",
    duration: 3.6,
    delay: 0.35,
  },
  {
    id: "p17",
    left: "55%",
    color: "oklch(0.85 0.18 85)",
    duration: 2.8,
    delay: 1.2,
  },
  {
    id: "p18",
    left: "72%",
    color: "oklch(0.82 0.18 195)",
    duration: 3.1,
    delay: 0.55,
  },
  {
    id: "p19",
    left: "88%",
    color: "oklch(0.75 0.22 140)",
    duration: 2.2,
    delay: 0.95,
  },
];

interface EndScreenProps {
  players: PlayerState[];
  winners: string[];
  onPlayAgain: () => void;
  onHome: () => void;
}

export function EndScreen({
  players,
  winners,
  onPlayAgain,
  onHome,
}: EndScreenProps) {
  const localPlayer = players.find((p) => p.isLocal);
  const localWon = localPlayer && winners.includes(localPlayer.id);

  return (
    <div className="relative min-h-screen w-full bg-game-deep overflow-hidden flex items-center justify-center scanlines">
      <div className="absolute inset-0 grid-bg opacity-30" />

      {/* Confetti-like particles for winners */}
      {localWon && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {CONFETTI_PIECES.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                left: piece.left,
                top: -20,
                background: piece.color,
              }}
              animate={{
                y: ["0vh", "110vh"],
                rotate: [0, 720],
                opacity: [1, 0],
              }}
              transition={{
                duration: piece.duration,
                delay: piece.delay,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="relative z-10 w-full max-w-md px-6 text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
      >
        {/* Result */}
        <motion.div
          className="mb-8"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {localWon ? (
            <>
              <div className="text-6xl mb-3">🏆</div>
              <h1
                className="text-5xl font-display font-black tracking-tight text-glow-safe"
                style={{ color: "oklch(0.75 0.22 140)" }}
              >
                YOU WIN!
              </h1>
              <p className="text-muted-foreground mt-2">
                You survived without being IT!
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-3">💀</div>
              <h1
                className="text-5xl font-display font-black tracking-tight text-glow-it"
                style={{ color: "oklch(0.65 0.28 25)" }}
              >
                GAME OVER
              </h1>
              <p className="text-muted-foreground mt-2">
                You were IT when time ran out!
              </p>
            </>
          )}
        </motion.div>

        {/* Final Scoreboard */}
        <motion.div
          className="game-panel rounded-2xl p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-4">
            Final Results
          </p>
          <div className="space-y-2">
            {players
              .slice()
              .sort((a, b) => {
                const aWon = winners.includes(a.id) ? 0 : 1;
                const bWon = winners.includes(b.id) ? 0 : 1;
                return aWon - bWon;
              })
              .map((player, idx) => {
                const won = winners.includes(player.id);
                return (
                  <motion.div
                    key={player.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      background: won
                        ? "oklch(0.75 0.22 140 / 0.15)"
                        : "oklch(0.65 0.28 25 / 0.1)",
                      border: `1px solid ${won ? "oklch(0.75 0.22 140 / 0.3)" : "oklch(0.65 0.28 25 / 0.2)"}`,
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                  >
                    <span className="text-lg">{won ? "✅" : "❌"}</span>
                    <div
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{
                        background: player.isIT ? "#ff3a1a" : player.color,
                      }}
                    />
                    <span className="text-sm font-medium flex-1 text-left">
                      {player.name}
                      {player.isLocal && " (You)"}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: won
                          ? "oklch(0.75 0.22 140 / 0.2)"
                          : "oklch(0.65 0.28 25 / 0.2)",
                        color: won
                          ? "oklch(0.75 0.22 140)"
                          : "oklch(0.65 0.28 25)",
                      }}
                    >
                      {won ? "SURVIVED" : "IT"}
                    </span>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            className="w-full h-12 text-base font-bold tracking-wide neon-border-cyan"
            style={{
              background: "oklch(0.82 0.18 195)",
              color: "oklch(0.1 0.02 260)",
            }}
            onClick={onPlayAgain}
          >
            🔄 Play Again
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={onHome}
          >
            ← Back to Home
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
