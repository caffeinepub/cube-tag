import Map "mo:core/Map";
import Text "mo:core/Text";
import Int "mo:core/Int";

module {
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

  type OldRoom = {
    roomCode : Text;
    hostId : Text;
    mapSeed : Int;
    timeRemaining : Int;
    status : Text;
    players : Map.Map<Text, Player>;
    lastActivity : Int;
  };

  type NewRoom = {
    roomCode : Text;
    hostId : Text;
    mapSeed : Int;
    gameDuration : Int;
    selectedMapType : Text;
    timeRemaining : Int;
    status : Text;
    players : Map.Map<Text, Player>;
    lastActivity : Int;
  };

  type OldState = { rooms : Map.Map<Text, OldRoom> };
  type NewState = { rooms : Map.Map<Text, NewRoom> };

  public func run(old : OldState) : NewState {
    let newRooms = old.rooms.map<Text, OldRoom, NewRoom>(
      func(_roomCode, oldRoom) {
        {
          oldRoom with
          gameDuration = 300; // Default 5 minutes for old rooms
          selectedMapType = "default";
        };
      }
    );
    { rooms = newRooms };
  };
};
