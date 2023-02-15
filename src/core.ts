import { Result } from '@sniptt/monads/build';
import { Brand } from './lib/Brand';

export interface Persistence {
  create: (roomData: RoomData) => Result<null, CreateError>;
  // todo il se passe quoi si le room id est faux ?
  addUser: (room: RoomId, user: User) => Result<RoomData, AddError>;
  get: (room: RoomId) => RoomData | null;
  // todo il se passe quoi si le room id est faux ?
  historize: (room: RoomId, message: unknown) => RoomData;
}
export enum AddError {
  UNKNOWN_ROOM = 'UNKNOWN_ROOM',
  ALREADY_JOINED = 'ALREADY_JOINED'
}
export enum CreateError {
  ALREADY_EXISTS = 'ALREADY_EXISTS'
}

export class Core {
  private readonly persistence;
  constructor(persistence: Persistence) {
    this.persistence = persistence;
  }

  createRoom = (room: Room, creator: User): Response => {
    const roomData = { room: room, connected: [creator], history: [] };
    return this.persistence.create(roomData).match({
      ok: () => {
        const joinedMessage = toJoinedMessage(roomData, creator);
        this.persistence.historize(room.id, joinedMessage);
        return {
          direct: historyMessage(roomData),
          broadcast: joinedMessage
        };
      },
      err: sendError
    });
  };

  joinRoom = (roomId: RoomId, user: User): Response => {
    return this.persistence.addUser(roomId, user).match({
      ok: (upatedRoomData) => {
        const joinedMessage = toJoinedMessage(upatedRoomData, user);
        this.persistence.historize(roomId, joinedMessage);
        return {
          direct: historyMessage(upatedRoomData),
          broadcast: joinedMessage
        };
      },
      err: sendError
    });
  };

  shareMessage(message: { roomId: RoomId; content: unknown; sender: User }): Response {
    const updatedRoomData = this.persistence.historize(message.roomId, message.content);
    return {
      direct: null,
      broadcast: {
        type: BroadcastMessageType.MESSAGE,
        room: updatedRoomData.room.id,
        from: message.sender,
        data: message.content
      }
    };
  }
  getHistory(id: RoomId): Response {
    return { direct: historyMessage(this.persistence.get(id)!), broadcast: null };
  }
}

const sendError = (val: Errors): Response => ({
  direct: { type: DirectResponseType.ERROR, code: val },
  broadcast: null
});

function historyMessage(roomData: RoomData): DirectResponse {
  return { type: DirectResponseType.HISTORY, room: roomData.room, data: roomData.history };
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
  HISTORY = 'history',
  ERROR = 'error'
}
export type Errors = AddError | CreateError;
export type DirectResponse =
  | { type: DirectResponseType.HISTORY; room: Room; data: unknown[] }
  | { type: DirectResponseType.ERROR; code: Errors };

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
