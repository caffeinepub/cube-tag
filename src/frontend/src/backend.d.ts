import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Player {
    x: number;
    y: number;
    z: number;
    isIT: boolean;
    playerId: string;
    color: string;
    playerName: string;
    isAlive: boolean;
}
export interface RoomView {
    status: string;
    mapSeed: bigint;
    lastActivity: bigint;
    gameDuration: bigint;
    players: Array<Player>;
    selectedMapType: string;
    timeRemaining: bigint;
    hostId: string;
    roomCode: string;
    roomName: string;
}
export interface backendInterface {
    createRoom(roomCode: string, hostId: string, hostName: string, hostColor: string, mapSeed: bigint, gameDuration: bigint, selectedMapType: string, roomName: string): Promise<RoomView>;
    getAllRooms(): Promise<Array<RoomView>>;
    getRoomState(roomCode: string): Promise<RoomView | null>;
    joinRoom(roomCode: string, playerId: string, playerName: string, playerColor: string): Promise<RoomView | null>;
    kickPlayer(roomCode: string, requesterId: string, targetId: string): Promise<boolean>;
    leaveRoom(roomCode: string, playerId: string): Promise<boolean>;
    listOpenRooms(): Promise<Array<RoomView>>;
    startGame(roomCode: string, requesterId: string, mapSeed: bigint, mapType: string): Promise<boolean>;
    updateRoomSettings(roomCode: string, requesterId: string, gameDuration: bigint, selectedMapType: string): Promise<boolean>;
}
