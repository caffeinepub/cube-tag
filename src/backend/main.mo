import Text "mo:core/Text";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Bool "mo:core/Bool";
import Map "mo:core/Map";
import Char "mo:core/Char";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Iterate "mo:core/Iter";
import Time "mo:core/Time";

actor {
  type Player = {
    playerId : Text;
    playerName : Text;
    x : Float;
    y : Float;
    z : Float;
    isIT : Bool;
    isAlive : Bool;
    color : Text;
  };

  module Player {
    public func compareByName(player1 : Player, player2 : Player) : Order.Order {
      Text.compare(player1.playerName, player2.playerName);
    };
  };

  type Room = {
    roomCode : Text;
    hostId : Text;
    mapSeed : Int;
    timeRemaining : Int;
    status : Text; // "lobby", "playing", "ended"
    players : Map.Map<Text, Player>;
    lastActivity : Int;
  };

  type RoomView = {
    roomCode : Text;
    hostId : Text;
    mapSeed : Int;
    timeRemaining : Int;
    status : Text;
    players : [Player];
    lastActivity : Int;
  };

  module RoomView {
    public func compareByCode(room1 : RoomView, room2 : RoomView) : Order.Order {
      Text.compare(room1.roomCode, room2.roomCode);
    };
  };

  let rooms = Map.empty<Text, Room>();

  func toRoomView(room : Room) : RoomView {
    {
      roomCode = room.roomCode;
      hostId = room.hostId;
      mapSeed = room.mapSeed;
      timeRemaining = room.timeRemaining;
      status = room.status;
      players = room.players.values().toArray().sort(Player.compareByName);
      lastActivity = room.lastActivity;
    };
  };

  public query ({ caller }) func getRoomState(roomCode : Text) : async RoomView {
    switch (rooms.get(roomCode)) {
      case (null) { Runtime.trap("Room not found") };
      case (?room) { toRoomView(room) };
    };
  };

  public query ({ caller }) func getAllRooms() : async [RoomView] {
    rooms.values().map<Room, RoomView>(toRoomView).toArray().sort(RoomView.compareByCode);
  };
};
