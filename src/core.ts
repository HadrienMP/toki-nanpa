import { Brand } from './lib/Brand';
import { Histories, HistoryError } from './histories/Histories';
import { RoomManager, RoomManagerError } from './roomManager/RoomManager';
export type ErrorCode = RoomManagerError | HistoryError | 'DECODING_FAILED';

export class Core {
  private readonly histories;
  private readonly roomManager;
  constructor(histories: Histories, roomManager: RoomManager) {
    this.histories = histories;
    this.roomManager = roomManager;
  }

  joinRoom = (roomId: RoomId, user: User): Response => {
    const joinResult = this.roomManager.join(roomId, user);
    if (joinResult === 'Already joined') return emptyResponse;
    let history = this.histories.get(roomId);
    if (!history) this.histories.create(roomId);
    return this.sendJoinMessages(roomId, this.histories.get(roomId), user);
  };

  shareMessage = (message: { roomId: RoomId; content: unknown; sender: User }): Response => {
    const joinResponse = this.joinRoom(message.roomId, message.sender);
    return this.histories.historize(message.roomId, message.content).match({
      ok: (_) => ({
        direct: joinResponse.direct,
        broadcast: [
          ...joinResponse.broadcast,
          {
            type: BroadcastMessageType.MESSAGE,
            room: message.roomId,
            from: message.sender,
            data: message.content
          }
        ]
      }),
      err: sendError
    });
  };

  getHistory = (id: RoomId): Response => ({
    direct: historyMessage(id, this.histories.get(id)),
    broadcast: []
  });

  private sendJoinMessages = (roomId: RoomId, history: History, joined: User): Response => {
    // todo il se passe quoi quand on join 2 fois ?
    const joinedMessage = toJoinedMessage(roomId, joined);
    this.histories.historize(roomId, joinedMessage);
    return {
      direct: historyMessage(roomId, history),
      broadcast: [joinedMessage]
    };
  };
}
const sendError = (val: ErrorCode): Response => ({
  direct: { type: DirectResponseType.ERROR, code: val, message: val },
  broadcast: []
});

const historyMessage = (roomId: RoomId, history: History): DirectResponse => ({
  type: DirectResponseType.HISTORY,
  room: roomId,
  data: history
});

const toJoinedMessage = (room: RoomId, user: User): BroadcastMessage => ({
  type: BroadcastMessageType.JOINED,
  room: room,
  from: user,
  data: {}
});

// -----------------------------------
// Model
// -----------------------------------
export type RoomId = Brand<string, 'RoomId'>;
export type RoomName = Brand<string, 'RoomName'>;
export type User = Brand<string, 'User'>;
// -----------------------------------
// Response
// -----------------------------------
export enum DirectResponseType {
  HISTORY = 'history',
  ERROR = 'error'
}
export type History = unknown[];

export type DirectResponse =
  | { type: DirectResponseType.HISTORY; room: RoomId; data: History }
  | { type: DirectResponseType.ERROR; code: ErrorCode; message: string };

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
export type Response = { direct: DirectResponse | null; broadcast: BroadcastMessage[] };
const emptyResponse: Response = { direct: null, broadcast: [] };
