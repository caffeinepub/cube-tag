import { useCallback, useEffect, useState } from "react";
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

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createBotPlayers(startColorIdx: number): PlayerState[] {
  return BOT_NAMES.map((name, i) => ({
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

function createInitialPlayers(playerName: string): PlayerState[] {
  const localPlayer: PlayerState = {
    id: "local",
    name: playerName,
    color: PLAYER_COLORS[0],
    position: { x: 0, y: 0.5, z: 0 },
    isIT: true, // Local player starts as IT
    isLocal: true,
    isBot: false,
    velocityY: 0,
    onGround: true,
  };

  const bots = createBotPlayers(0);

  return [localPlayer, ...bots];
}

export default function App() {
  const [screen, setScreen] = useState<GameScreenType>("home");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [lobbyPlayers, setLobbyPlayers] = useState<PlayerState[]>([]);
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

  const handleCreateRoom = useCallback(
    (name: string, mode: "pc" | "mobile") => {
      const code = generateRoomCode();
      const players = createInitialPlayers(name);
      setPlayerName(name);
      setRoomCode(code);
      setIsHost(true);
      setLobbyPlayers(players);
      setControlMode(mode);
      setScreen("lobby");
    },
    [],
  );

  const handleJoinRoom = useCallback(
    (name: string, code: string, mode: "pc" | "mobile") => {
      const players = createInitialPlayers(name);
      setPlayerName(name);
      setRoomCode(code);
      setIsHost(false);
      setLobbyPlayers(players);
      setControlMode(mode);
      setScreen("lobby");
    },
    [],
  );

  const handleStartGame = useCallback(() => {
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

    // Randomize IT assignment — pick a random bot to be IT instead
    const playersWithIT = lobbyPlayers.map((p, i) => ({
      ...p,
      isIT: i === 1, // Bot Alpha starts as IT
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
  }, [lobbyPlayers, selectedMapType]);

  const handleGameEnd = useCallback(
    (players: PlayerState[], gameWinners: string[]) => {
      setFinalPlayers(players);
      setWinners(gameWinners);
      setScreen("end");
    },
    [],
  );

  const handlePlayAgain = useCallback(() => {
    const players = createInitialPlayers(playerName);
    setLobbyPlayers(players);
    setScreen("lobby");
  }, [playerName]);

  const handleHome = useCallback(() => {
    setScreen("home");
    setRoomCode("");
    setIsHost(false);
    setPlayerName("");
    setLobbyPlayers([]);
    setGamePlayers([]);
    setWinners([]);
    setControlMode("pc");
  }, []);

  // Kick handlers
  const handleKickLobbyPlayer = useCallback((id: string) => {
    setLobbyPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleKickGamePlayer = useCallback((id: string) => {
    setGamePlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          sensitivity={sensitivity}
          onSensitivityChange={setSensitivity}
        />
      )}
      {screen === "lobby" && (
        <LobbyScreen
          roomCode={roomCode}
          isHost={isHost}
          playerName={playerName}
          players={lobbyPlayers}
          onStartGame={handleStartGame}
          onLeave={handleHome}
          onKickPlayer={handleKickLobbyPlayer}
          mapType={mapType}
          gameDuration={gameDuration}
          onDurationChange={setGameDuration}
          selectedMapType={selectedMapType}
          onMapTypeChange={setSelectedMapType}
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
