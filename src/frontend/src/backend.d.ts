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
    players: Array<Player>;
    timeRemaining: bigint;
    hostId: string;
    roomCode: string;
}
export interface backendInterface {
    getAllRooms(): Promise<Array<RoomView>>;
    getRoomState(roomCode: string): Promise<RoomView>;
}
