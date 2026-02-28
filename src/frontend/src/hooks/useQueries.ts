import { useQuery } from "@tanstack/react-query";
import type { RoomView } from "../backend.d.ts";
import { useActor } from "./useActor";

export function useGetAllRooms() {
  const { actor, isFetching } = useActor();
  return useQuery<RoomView[]>({
    queryKey: ["allRooms"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRooms();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useGetRoomState(roomCode: string) {
  const { actor, isFetching } = useActor();
  return useQuery<RoomView | null>({
    queryKey: ["roomState", roomCode],
    queryFn: async () => {
      if (!actor || !roomCode) return null;
      return actor.getRoomState(roomCode);
    },
    enabled: !!actor && !isFetching && !!roomCode,
    refetchInterval: 3000,
  });
}
