export type GameScreen = "home" | "lobby" | "game" | "end";

/** Mirrors the RoomView shape returned by the Motoko backend */
export interface RoomView {
  roomCode: string;
  roomName: string;
  hostId: string;
  status: string;
  players: Array<{
    playerId: string;
    playerName: string;
    color: string;
    x: number;
    y: number;
    z: number;
    isIT: boolean;
    isAlive: boolean;
  }>;
  mapSeed: bigint;
  gameDuration: bigint;
  selectedMapType: string;
  timeRemaining: bigint;
  lastActivity: bigint;
}

export type GraphicsQuality = "fast" | "medium" | "high";

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
  tagImmunityTimer?: number; // seconds remaining of post-tag immunity (3s)
  yaw?: number; // horizontal look angle in radians for first-person view
}

export interface ObstacleBox {
  id: string;
  position: Vec3;
  size: Vec3;
  color: string;
  rotation?: Vec3; // optional Euler rotation
}

/** Anchor point for a wanted poster attached to a wall */
export interface PosterAnchor {
  pos: [number, number, number];
  rotY: number;
  photoIdx: number;
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
