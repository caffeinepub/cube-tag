import { useCallback, useEffect, useRef, useState } from "react";
import { EndScreen } from "./components/EndScreen";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import type {
  GameScreen as GameScreenType,
  ObstacleBox,
  PlayerState,
} from "./types/game";
import { generateMap, generatePlatformerMap } from "./utils/mapGen";

const PLAYER_COLORS = ["#00ccff", "#aa44ff", "#ffcc00", "#44ff88"];
const BOT_NAMES = ["Bot Alpha", "Bot Beta", "Bot Gamma"];

// Max 4 entities play at once; up to 10 humans can join
const MAX_ENTITIES = 4;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Get or create a stable playerId persisted across refreshes in this session */
function getOrCreatePlayerId(): string {
  const existing = sessionStorage.getItem("playerId");
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem("playerId", id);
  return id;
}

/** Create AI bots to fill remaining slots up to MAX_ENTITIES */
function createBotPlayers(count: number, startColorIdx: number): PlayerState[] {
  return BOT_NAMES.slice(0, count).map((name, i) => ({
    id: `bot-${i}`,
    name,
    color: PLAYER_COLORS[(startColorIdx + i + 1) % PLAYER_COLORS.length],
    position: {
      x: (Math.random() - 0.5) * 6,
      y: 0.5,
      z: (Math.random() - 0.5) * 6,
    },
    isIT: false,
    isLocal: false,
    isBot: true,
    velocityY: 0,
    onGround: true,
  }));
}

/** Build initial player list: local player + AI bots to fill up to MAX_ENTITIES */
function buildLobbyPlayers(
  localPlayerId: string,
  playerName: string,
  localColor: string,
  humanPlayersFromBackend: Array<{
    playerId: string;
    playerName: string;
    color: string;
  }>,
): PlayerState[] {
  // Local human player
  const localPlayer: PlayerState = {
    id: localPlayerId,
    name: playerName,
    color: localColor,
    position: { x: 0, y: 0.5, z: 0 },
    isIT: false,
    isLocal: true,
    isBot: false,
    velocityY: 0,
    onGround: true,
  };

  // Other human players (not ourselves)
  const otherHumans: PlayerState[] = humanPlayersFromBackend
    .filter((p) => p.playerId !== localPlayerId)
    .map((p, i) => ({
      id: p.playerId,
      name: p.playerName,
      color: p.color || PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length],
      position: {
        x: (Math.random() - 0.5) * 6,
        y: 0.5,
        z: (Math.random() - 0.5) * 6,
      },
      isIT: false,
      isLocal: false,
      isBot: false,
      velocityY: 0,
      onGround: true,
    }));

  const allHumans = [localPlayer, ...otherHumans];
  const botsNeeded = Math.max(0, MAX_ENTITIES - allHumans.length);
  const bots = createBotPlayers(botsNeeded, allHumans.length - 1);

  return [...allHumans, ...bots];
}

export default function App() {
  const [screen, setScreen] = useState<GameScreenType>("home");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [localPlayerId, setLocalPlayerId] = useState("");
  const [lobbyPlayers, setLobbyPlayers] = useState<PlayerState[]>([]);
  const [humanPlayerCount, setHumanPlayerCount] = useState(1); // how many real humans in the room
  const [gamePlayers, setGamePlayers] = useState<PlayerState[]>([]);
  const [obstacles, setObstacles] = useState<ObstacleBox[]>([]);
  const [winners, setWinners] = useState<string[]>([]);
  const [finalPlayers, setFinalPlayers] = useState<PlayerState[]>([]);
  const [mapType, setMapType] = useState<"3d" | "2d-platformer">("3d");
  const [selectedMapType, setSelectedMapType] = useState<
    "3d" | "2d-platformer" | "random"
  >("random");
  const [controlMode, setControlMode] = useState<"pc" | "mobile">("pc");
  const [gameDuration, setGameDuration] = useState(100);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Lobby polling ref
  const lobbyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lock scrolling during gameplay, allow it on menus
  useEffect(() => {
    if (screen === "game") {
      document.body.classList.add("game-active");
    } else {
      document.body.classList.remove("game-active");
    }
    return () => {
      document.body.classList.remove("game-active");
    };
  }, [screen]);

  // Stop polling when leaving lobby
  const stopLobbyPoll = useCallback(() => {
    if (lobbyPollRef.current) {
      clearInterval(lobbyPollRef.current);
      lobbyPollRef.current = null;
    }
  }, []);

  // Start polling the backend for room state updates
  const startLobbyPoll = useCallback(
    (
      code: string,
      pid: string,
      pName: string,
      pColor: string,
      isHostPlayer: boolean,
    ) => {
      stopLobbyPoll();

      lobbyPollRef.current = setInterval(async () => {
        try {
          const actor = (window as any).backendActor;
          if (!actor) return;
          const roomView = await actor.getRoomState(code);
          if (!roomView) return;

          // Update duration/mapType from backend if non-host
          if (!isHostPlayer) {
            const serverDuration = Number(roomView.gameDuration);
            if (serverDuration > 0) setGameDuration(serverDuration);
            if (roomView.selectedMapType) {
              const smt = roomView.selectedMapType as
                | "3d"
                | "2d-platformer"
                | "random";
              setSelectedMapType(smt);
            }
          }

          // Update human player count
          setHumanPlayerCount(roomView.players.length);

          // Rebuild lobby players from server data
          setLobbyPlayers((prev) => {
            const newPlayers = buildLobbyPlayers(
              pid,
              pName,
              pColor,
              roomView.players.map((p: any) => ({
                playerId: p.playerId,
                playerName: p.playerName,
                color: p.color,
              })),
            );
            // Preserve position/physics state of existing bots
            return newPlayers.map((np) => {
              const existing = prev.find((ep) => ep.id === np.id);
              if (existing && np.isBot) {
                return { ...np, position: existing.position };
              }
              return np;
            });
          });

          // Non-host: auto-start game when status changes to "playing"
          if (!isHostPlayer && roomView.status === "playing") {
            stopLobbyPoll();
            const seed = Number(roomView.mapSeed);
            const smt = roomView.selectedMapType as
              | "3d"
              | "2d-platformer"
              | "random";
            let type: "3d" | "2d-platformer";
            if (smt === "random") {
              type = seed % 3 === 0 ? "2d-platformer" : "3d";
            } else {
              type = smt;
            }
            setMapType(type);
            const newObstacles =
              type === "2d-platformer"
                ? generatePlatformerMap(seed)
                : generateMap(seed);
            setObstacles(newObstacles);

            // Build game players from server + bots
            setLobbyPlayers((currentLobby) => {
              const playersWithIT = currentLobby.map((p, i) => ({
                ...p,
                isIT: i === 1,
                velocityY: 0,
                onGround: true,
                position: {
                  x: i === 0 ? 0 : (Math.random() - 0.5) * 8,
                  y: type === "2d-platformer" ? 2 : 0.5,
                  z: 0,
                },
              }));
              setGamePlayers(playersWithIT);
              return currentLobby;
            });
            setScreen("game");
          }
        } catch (err) {
          console.error("Lobby poll error:", err);
        }
      }, 2000);
    },
    [stopLobbyPoll],
  );

  const handleCreateRoom = useCallback(
    async (name: string, mode: "pc" | "mobile") => {
      const pid = getOrCreatePlayerId();
      const code = generateRoomCode();
      const color = PLAYER_COLORS[0];

      setLocalPlayerId(pid);
      setPlayerName(name);
      setRoomCode(code);
      setIsHost(true);
      setControlMode(mode);
      setJoinError("");

      // Build initial lobby with local player + bots
      const initialPlayers = buildLobbyPlayers(pid, name, color, []);
      setLobbyPlayers(initialPlayers);
      setHumanPlayerCount(1);
      setScreen("lobby");

      // Persist room to backend
      try {
        const actor = (window as any).backendActor;
        if (actor) {
          await actor.createRoom(
            code,
            pid,
            name,
            color,
            BigInt(0),
            BigInt(gameDuration),
            selectedMapType,
          );
        }
      } catch (err) {
        console.error("createRoom error:", err);
      }

      // Start polling for other humans joining
      startLobbyPoll(code, pid, name, color, true);
    },
    [gameDuration, selectedMapType, startLobbyPoll],
  );

  const handleJoinRoom = useCallback(
    async (name: string, code: string, mode: "pc" | "mobile") => {
      const pid = getOrCreatePlayerId();
      const color = PLAYER_COLORS[0];

      setIsJoining(true);
      setJoinError("");

      try {
        const actor = (window as any).backendActor;
        if (!actor) {
          setJoinError("Backend not available. Try again.");
          setIsJoining(false);
          return;
        }

        const roomView = await actor.joinRoom(code, pid, name, color);
        if (!roomView) {
          setJoinError("Room not found or already started.");
          setIsJoining(false);
          return;
        }

        // Success — set up lobby from server data
        setLocalPlayerId(pid);
        setPlayerName(name);
        setRoomCode(code);
        setIsHost(false);
        setControlMode(mode);
        setHumanPlayerCount(roomView.players.length);

        // Sync settings from server
        const serverDuration = Number(roomView.gameDuration);
        if (serverDuration > 0) setGameDuration(serverDuration);
        if (roomView.selectedMapType) {
          setSelectedMapType(
            roomView.selectedMapType as "3d" | "2d-platformer" | "random",
          );
        }

        const initialPlayers = buildLobbyPlayers(
          pid,
          name,
          color,
          roomView.players.map((p: any) => ({
            playerId: p.playerId,
            playerName: p.playerName,
            color: p.color,
          })),
        );
        setLobbyPlayers(initialPlayers);
        setScreen("lobby");

        // Start polling
        startLobbyPoll(code, pid, name, color, false);
      } catch (err) {
        console.error("joinRoom error:", err);
        setJoinError("Failed to join room. Check the code and try again.");
      } finally {
        setIsJoining(false);
      }
    },
    [startLobbyPoll],
  );

  const handleStartGame = useCallback(async () => {
    const seed = Math.floor(Math.random() * 999999);
    let type: "3d" | "2d-platformer";
    if (selectedMapType === "random") {
      type = Math.random() < 0.3 ? "2d-platformer" : "3d";
    } else {
      type = selectedMapType;
    }
    setMapType(type);

    const newObstacles =
      type === "2d-platformer"
        ? generatePlatformerMap(seed)
        : generateMap(seed);

    // Notify backend that game started
    try {
      const actor = (window as any).backendActor;
      if (actor && roomCode && localPlayerId) {
        await actor.startGame(roomCode, localPlayerId, BigInt(seed), type);
      }
    } catch (err) {
      console.error("startGame error:", err);
    }

    stopLobbyPoll();

    // Randomize IT — Bot Alpha (index 1) starts as IT
    const playersWithIT = lobbyPlayers.map((p, i) => ({
      ...p,
      isIT: i === 1,
      velocityY: 0,
      onGround: true,
      position: {
        x: i === 0 ? 0 : (Math.random() - 0.5) * 8,
        y: type === "2d-platformer" ? 2 : 0.5,
        z: 0,
      },
    }));

    setObstacles(newObstacles);
    setGamePlayers(playersWithIT);
    setScreen("game");
  }, [lobbyPlayers, selectedMapType, roomCode, localPlayerId, stopLobbyPoll]);

  const handleGameEnd = useCallback(
    (players: PlayerState[], gameWinners: string[]) => {
      setFinalPlayers(players);
      setWinners(gameWinners);
      setScreen("end");
    },
    [],
  );

  const handlePlayAgain = useCallback(() => {
    const color = PLAYER_COLORS[0];
    const players = buildLobbyPlayers(localPlayerId, playerName, color, []);
    setLobbyPlayers(players);
    setHumanPlayerCount(1);
    setScreen("lobby");
  }, [localPlayerId, playerName]);

  const handleHome = useCallback(async () => {
    stopLobbyPoll();

    // Notify backend we're leaving
    try {
      const actor = (window as any).backendActor;
      if (actor && roomCode && localPlayerId) {
        await actor.leaveRoom(roomCode, localPlayerId);
      }
    } catch (err) {
      console.error("leaveRoom error:", err);
    }

    setScreen("home");
    setRoomCode("");
    setIsHost(false);
    setPlayerName("");
    setLocalPlayerId("");
    setLobbyPlayers([]);
    setGamePlayers([]);
    setWinners([]);
    setControlMode("pc");
    setJoinError("");
    setHumanPlayerCount(1);
  }, [roomCode, localPlayerId, stopLobbyPoll]);

  // Kick handlers
  const handleKickLobbyPlayer = useCallback(
    async (id: string) => {
      if (id.startsWith("bot-")) {
        // Just remove bot locally
        setLobbyPlayers((prev) => {
          const filtered = prev.filter((p) => p.id !== id);
          // Maintain bot slots: if we kicked a bot and there are fewer than MAX_ENTITIES, re-add
          // Actually just filter — host removed this bot intentionally
          return filtered;
        });
      } else {
        // Kick real human via backend
        try {
          const actor = (window as any).backendActor;
          if (actor && roomCode && localPlayerId) {
            await actor.kickPlayer(roomCode, localPlayerId, id);
          }
        } catch (err) {
          console.error("kickPlayer error:", err);
        }
        setLobbyPlayers((prev) => prev.filter((p) => p.id !== id));
      }
    },
    [roomCode, localPlayerId],
  );

  const handleKickGamePlayer = useCallback((id: string) => {
    setGamePlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Sync settings changes to backend (host only)
  const handleDurationChange = useCallback(
    async (d: number) => {
      setGameDuration(d);
      try {
        const actor = (window as any).backendActor;
        if (actor && roomCode && localPlayerId) {
          await actor.updateRoomSettings(
            roomCode,
            localPlayerId,
            BigInt(d),
            selectedMapType,
          );
        }
      } catch (err) {
        console.error("updateRoomSettings error:", err);
      }
    },
    [roomCode, localPlayerId, selectedMapType],
  );

  const handleMapTypeChange = useCallback(
    async (t: "3d" | "2d-platformer" | "random") => {
      setSelectedMapType(t);
      try {
        const actor = (window as any).backendActor;
        if (actor && roomCode && localPlayerId) {
          await actor.updateRoomSettings(
            roomCode,
            localPlayerId,
            BigInt(gameDuration),
            t,
          );
        }
      } catch (err) {
        console.error("updateRoomSettings error:", err);
      }
    },
    [roomCode, localPlayerId, gameDuration],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLobbyPoll();
  }, [stopLobbyPoll]);

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          sensitivity={sensitivity}
          onSensitivityChange={setSensitivity}
          joinError={joinError}
          isJoining={isJoining}
        />
      )}
      {screen === "lobby" && (
        <LobbyScreen
          roomCode={roomCode}
          isHost={isHost}
          playerName={playerName}
          players={lobbyPlayers}
          humanPlayerCount={humanPlayerCount}
          onStartGame={handleStartGame}
          onLeave={handleHome}
          onKickPlayer={handleKickLobbyPlayer}
          mapType={mapType}
          gameDuration={gameDuration}
          onDurationChange={handleDurationChange}
          selectedMapType={selectedMapType}
          onMapTypeChange={handleMapTypeChange}
        />
      )}
      {screen === "game" && gamePlayers.length > 0 && (
        <GameScreen
          initialPlayers={gamePlayers}
          obstacles={obstacles}
          onGameEnd={handleGameEnd}
          isHost={isHost}
          onKickPlayer={handleKickGamePlayer}
          mapType={mapType}
          controlMode={controlMode}
          gameDuration={gameDuration}
          sensitivity={sensitivity}
        />
      )}
      {screen === "end" && (
        <EndScreen
          players={finalPlayers}
          winners={winners}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )}
    </>
  );
}
