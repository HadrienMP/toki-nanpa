import { Result } from '@sniptt/monads/build';
import { Brand } from './lib/Brand';

export interface Persistence {
  create: (roomData: RoomData) => Result<RoomData, ErrorCode>;
  addUser: (room: RoomId, user: User) => Result<RoomData, ErrorCode>;
  get: (room: RoomId) => RoomData | null;
  historize: (room: RoomId, message: unknown) => Result<RoomData, ErrorCode>;
}
export enum ErrorCode {
  UNKNOWN_ROOM = 'UNKNOWN_ROOM',
  ALREADY_JOINED = 'ALREADY_JOINED',
  ALREADY_CREATED = 'ALREADY_CREATED'
}

export class Core {
  private readonly persistence;
  constructor(persistence: Persistence) {
    this.persistence = persistence;
  }

  createRoom = (room: Room, creator: User): Response => {
    return this.persistence.create({ room: room, connected: [creator], history: [] }).match({
      ok: this.sendJoinMessages(creator),
      err: sendError
    });
  };

  joinRoom = (roomId: RoomId, user: User): Response =>
    this.persistence.addUser(roomId, user).match({
      ok: this.sendJoinMessages(user),
      err: sendError
    });

  shareMessage = (message: { roomId: RoomId; content: unknown; sender: User }): Response =>
    this.persistence.historize(message.roomId, message.content).match({
      ok: (updatedRoomData) => ({
        direct: null,
        broadcast: {
          type: BroadcastMessageType.MESSAGE,
          room: updatedRoomData.room.id,
          from: message.sender,
          data: message.content
        }
      }),
      err: sendError
    });

  getHistory = (id: RoomId): Response => ({
    direct: historyMessage(this.persistence.get(id)!),
    broadcast: null
  });

  private sendJoinMessages = (joined: User) => (roomData: RoomData) => {
    const joinedMessage = toJoinedMessage(roomData, joined);
    this.persistence.historize(roomData.room.id, joinedMessage);
    return {
      direct: historyMessage(roomData),
      broadcast: joinedMessage
    };
  };
}
const sendError = (val: ErrorCode): Response => ({
  direct: { type: DirectResponseType.ERROR, code: val },
  broadcast: null
});

const historyMessage = (roomData: RoomData): DirectResponse => ({
  type: DirectResponseType.HISTORY,
  room: roomData.room,
  data: roomData.history
});

const toJoinedMessage = (roomData: RoomData, user: User): BroadcastMessage => ({
  type: BroadcastMessageType.JOINED,
  room: roomData.room.id,
  from: user,
  data: {}
});

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
  HISTORY = 'history',
  ERROR = 'error'
}
export type DirectResponse =
  | { type: DirectResponseType.HISTORY; room: Room; data: unknown[] }
  | { type: DirectResponseType.ERROR; code: ErrorCode };

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
export type Response = { direct: DirectResponse | null; broadcast: BroadcastMessage | null };
