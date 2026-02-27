export type GameScreen = "home" | "lobby" | "game" | "end";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  position: Vec3;
  isIT: boolean;
  isLocal: boolean;
  isBot: boolean;
  velocityY?: number;
  onGround?: boolean;
}

export interface ObstacleBox {
  id: string;
  position: Vec3;
  size: Vec3;
  color: string;
}

export interface GameState {
  screen: GameScreen;
  roomCode: string;
  playerName: string;
  isHost: boolean;
  players: PlayerState[];
  obstacles: ObstacleBox[];
  timeRemaining: number;
  mapSeed: number;
  winners: string[];
  mapType: "3d" | "2d-platformer";
}
