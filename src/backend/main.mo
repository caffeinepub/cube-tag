import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Bool "mo:core/Bool";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Player = {
    playerId : Text;
    playerName : Text;
    color : Text;
    x : Float;
    y : Float;
    z : Float;
    isIT : Bool;
    isAlive : Bool;
  };

  module Player {
    public func compareByName(p1 : Player, p2 : Player) : Order.Order {
      Text.compare(p1.playerName, p2.playerName);
    };
  };

  type Room = {
    roomCode : Text;
    hostId : Text;
    mapSeed : Int;
    gameDuration : Int;
    selectedMapType : Text;
    timeRemaining : Int;
    status : Text; // "lobby", "playing", "ended"
    players : Map.Map<Text, Player>;
    lastActivity : Int;
  };

  type RoomView = {
    roomCode : Text;
    hostId : Text;
    mapSeed : Int;
    gameDuration : Int;
    selectedMapType : Text;
    timeRemaining : Int;
    status : Text;
    players : [Player];
    lastActivity : Int;
  };

  module RoomView {
    public func compareByCode(r1 : RoomView, r2 : RoomView) : Order.Order {
      Text.compare(r1.roomCode, r2.roomCode);
    };
  };

  let rooms = Map.empty<Text, Room>();

  func toRoomView(room : Room) : RoomView {
    {
      roomCode = room.roomCode;
      hostId = room.hostId;
      mapSeed = room.mapSeed;
      gameDuration = room.gameDuration;
      selectedMapType = room.selectedMapType;
      timeRemaining = room.timeRemaining;
      status = room.status;
      players = room.players.values().toArray().sort(Player.compareByName);
      lastActivity = room.lastActivity;
    };
  };

  public shared ({ caller }) func createRoom(
    roomCode : Text,
    hostId : Text,
    hostName : Text,
    hostColor : Text,
    mapSeed : Int,
    gameDuration : Int,
    selectedMapType : Text,
  ) : async RoomView {
    let hostPlayer : Player = {
      playerId = hostId;
      playerName = hostName;
      color = hostColor;
      x = 0.0;
      y = 0.0;
      z = 0.0;
      isIT = false;
      isAlive = true;
    };

    let playerMap = Map.empty<Text, Player>();
    playerMap.add(hostId, hostPlayer);

    let room : Room = {
      roomCode;
      hostId;
      mapSeed;
      gameDuration;
      selectedMapType;
      timeRemaining = 0;
      status = "lobby";
      players = playerMap;
      lastActivity = Time.now();
    };

    rooms.add(roomCode, room);
    toRoomView(room);
  };

  public shared ({ caller }) func joinRoom(roomCode : Text, playerId : Text, playerName : Text, playerColor : Text) : async ?RoomView {
    switch (rooms.get(roomCode)) {
      case (null) { null };
      case (?room) {
        if (room.status != "lobby") { return null };
        if (room.players.size() >= 10) { return null };

        let newPlayer : Player = {
          playerId;
          playerName;
          color = playerColor;
          x = 0.0;
          y = 0.0;
          z = 0.0;
          isIT = false;
          isAlive = true;
        };

        room.players.add(playerId, newPlayer);
        let updatedRoom : Room = {
          room with
          players = room.players;
          lastActivity = Time.now();
        };
        rooms.add(roomCode, updatedRoom);
        ?toRoomView(updatedRoom);
      };
    };
  };

  public shared ({ caller }) func leaveRoom(roomCode : Text, playerId : Text) : async Bool {
    switch (rooms.get(roomCode)) {
      case (null) { false };
      case (?room) {
        if (playerId == room.hostId) {
          rooms.remove(roomCode);
          true;
        } else {
          room.players.remove(playerId);
          rooms.add(roomCode, room);
          true;
        };
      };
    };
  };

  public shared ({ caller }) func kickPlayer(roomCode : Text, requesterId : Text, targetId : Text) : async Bool {
    switch (rooms.get(roomCode)) {
      case (null) { false };
      case (?room) {
        if (requesterId != room.hostId) { return false };
        room.players.remove(targetId);
        rooms.add(roomCode, room);
        true;
      };
    };
  };

  public shared ({ caller }) func startGame(roomCode : Text, requesterId : Text, mapSeed : Int, mapType : Text) : async Bool {
    switch (rooms.get(roomCode)) {
      case (null) { false };
      case (?room) {
        if (requesterId != room.hostId) { return false };
        let updatedRoom : Room = {
          room with
          mapSeed;
          selectedMapType = mapType;
          status = "playing";
        };
        rooms.add(roomCode, updatedRoom);
        true;
      };
    };
  };

  public shared ({ caller }) func updateRoomSettings(roomCode : Text, requesterId : Text, gameDuration : Int, selectedMapType : Text) : async Bool {
    switch (rooms.get(roomCode)) {
      case (null) { false };
      case (?room) {
        if (requesterId != room.hostId) { return false };
        let updatedRoom : Room = {
          room with
          gameDuration;
          selectedMapType;
        };
        rooms.add(roomCode, updatedRoom);
        true;
      };
    };
  };

  public query ({ caller }) func getRoomState(roomCode : Text) : async ?RoomView {
    switch (rooms.get(roomCode)) {
      case (null) { null };
      case (?room) { ?toRoomView(room) };
    };
  };

  public query ({ caller }) func getAllRooms() : async [RoomView] {
    rooms.values().map<Room, RoomView>(toRoomView).toArray().sort(RoomView.compareByCode);
  };
};
