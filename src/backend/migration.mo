import Map "mo:core/Map";
import Text "mo:core/Text";

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
    gameDuration : Int;
    selectedMapType : Text;
    timeRemaining : Int;
    status : Text; // "lobby", "playing", "ended"
    players : Map.Map<Text, Player>;
    lastActivity : Int;
  };

  type OldActor = {
    rooms : Map.Map<Text, OldRoom>;
  };

  type NewRoom = {
    roomCode : Text;
    roomName : Text;
    hostId : Text;
    mapSeed : Int;
    gameDuration : Int;
    selectedMapType : Text;
    timeRemaining : Int;
    status : Text; // "lobby", "playing", "ended"
    players : Map.Map<Text, Player>;
    lastActivity : Int;
  };

  type NewActor = {
    rooms : Map.Map<Text, NewRoom>;
  };

  public func run(old : OldActor) : NewActor {
    let newRooms = old.rooms.map<Text, OldRoom, NewRoom>(
      func(_code, oldRoom) {
        { oldRoom with roomName = "(unnamed room)" };
      }
    );
    { rooms = newRooms };
  };
};
