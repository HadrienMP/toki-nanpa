import { Brand } from './lib/Brand';
import { MongoClient, Db, Collection } from 'mongodb';

export interface Persistence {
  create: (roomData: RoomData) => void;
  // todo il se passe quoi si le room id est faux ?
  addUser: (room: RoomId, user: User) => RoomData;
  get: (room: RoomId) => RoomData | null;
  // todo il se passe quoi si le room id est faux ?
  historize: (room: RoomId, message: unknown) => RoomData;
}

export class InMemory implements Persistence {
  private rooms: Record<RoomId, RoomData> = {};
  create = (roomData: RoomData) => {
    this.rooms[roomData.room.id] = roomData;
  };
  addUser = (roomId: RoomId, user: User) => {
    const roomData = this.get(roomId)!;
    const updated = { ...roomData, connected: [user, ...roomData.connected] };
    this.rooms[roomId] = updated;
    return updated;
  };
  get = (roomId: RoomId): RoomData | null => {
    return this.rooms[roomId];
  };
  historize = (room: RoomId, message: unknown): RoomData => {
    const roomData = this.get(room)!;
    const updated = { ...roomData, history: [...roomData.history, message] };
    this.rooms[room] = updated;
    return updated;
  };
}

export class Core {
  private readonly persistence;
  constructor(persistence: Persistence) {
    this.persistence = persistence;
  }
  createRoom = (room: Room, creator: User): Response => {
    const roomData = { room: room, connected: [creator], history: [] };
    this.persistence.create(roomData);
    const joinedMessage = toJoinedMessage(roomData, creator);
    this.persistence.historize(room.id, joinedMessage);
    return {
      direct: [historyMessage(roomData)],
      broadcast: [joinedMessage]
    };
  };
  joinRoom = (roomId: RoomId, user: User): Response => {
    const upatedRoomData = this.persistence.addUser(roomId, user);
    return {
      direct: [historyMessage(upatedRoomData)],
      broadcast: [toJoinedMessage(upatedRoomData, user)]
    };
  };
  shareMessage(message: { roomId: RoomId; content: unknown; sender: User }): Response {
    const updatedRoomData = this.persistence.historize(message.roomId, message.content);
    return {
      direct: [],
      broadcast: [
        {
          type: BroadcastMessageType.MESSAGE,
          room: updatedRoomData.room.id,
          from: message.sender,
          data: message.content
        }
      ]
    };
  }
}

function historyMessage(roomData: RoomData): DirectResponse {
  return { type: DirectResponseType.HISTORY, room: roomData.room, messages: roomData.history };
}
function toJoinedMessage(roomData: RoomData, user: User): BroadcastMessage {
  return {
    type: BroadcastMessageType.JOINED,
    room: roomData.room.id,
    from: user,
    data: {}
  };
}

// -----------------------------------
// Model
// -----------------------------------
export type RoomId = Brand<string, 'RoomId'>;
export type RoomName = Brand<string, 'RoomName'>;
export type User = Brand<string, 'User'>;

export type Room = { id: RoomId; name: RoomName };
export type RoomData = {
  room: Room;
  connected: User[];
  history: unknown[];
};
// -----------------------------------
// Response
// -----------------------------------
export enum DirectResponseType {
  HISTORY = 'history'
}
export type DirectResponse = { type: DirectResponseType.HISTORY; room: Room; messages: unknown[] };
export enum BroadcastMessageType {
  JOINED = 'joined',
  MESSAGE = 'message'
}
export type BroadcastMessage = {
  room: RoomId;
  from: User;
} & (
  | { type: BroadcastMessageType.JOINED; data: {} }
  | { type: BroadcastMessageType.MESSAGE; data: unknown }
);
export type Response = { direct: DirectResponse[]; broadcast: BroadcastMessage[] };
