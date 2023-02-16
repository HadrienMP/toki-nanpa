import { Brand } from './lib/Brand';
import { Histories, HistoryError } from './histories/Histories';
import { Decoder } from 'elm-decoders';
export type ErrorCode = HistoryError | 'DECODING_FAILED';

export type JoinFunction = (roomId: RoomId, user: User) => 'OK' | 'Already joined';

export class Core {
  private readonly histories;
  constructor(histories: Histories) {
    this.histories = histories;
  }

  join = (params: { roomId: RoomId; user: User; join: JoinFunction }): Messages => {
    const joinResult = params.join(params.roomId, params.user);
    if (joinResult === 'Already joined') return noMessages;
    let history = this.histories.get(params.roomId);
    if (!history) this.histories.create(params.roomId);
    return this.sendJoinMessages(params.roomId, this.histories.get(params.roomId), params.user);
  };

  shareMessage = (
    message: { roomId: RoomId; data: unknown; sender: User },
    join: JoinFunction
  ): Messages => {
    const joinResponse = this.join({ roomId: message.roomId, user: message.sender, join });
    return this.histories.historize(message.roomId, message.data).match({
      ok: (_) => ({
        response: joinResponse.response,
        broadcast: [
          ...joinResponse.broadcast,
          {
            type: BroadcastMessageType.MESSAGE,
            room: message.roomId,
            from: message.sender,
            data: message.data
          }
        ]
      }),
      err: sendError(message.sender)
    });
  };

  getHistory = (id: RoomId, user: User): Messages => ({
    response: historyMessage(id, user, this.histories.get(id)),
    broadcast: []
  });

  private sendJoinMessages = (roomId: RoomId, history: History, joined: User): Messages => {
    const joinedMessage = toJoinedMessage(roomId, joined);
    this.histories.historize(roomId, joinedMessage);
    return {
      response: historyMessage(roomId, joined, history),
      broadcast: [joinedMessage]
    };
  };
}
const sendError =
  (user: User) =>
  (val: ErrorCode): Messages => ({
    response: { type: DirectResponseType.ERROR, code: val, message: val, to: user },
    broadcast: []
  });

const historyMessage = (roomId: RoomId, user: User, history: History): DirectResponse => ({
  type: DirectResponseType.HISTORY,
  room: roomId,
  data: history,
  to: user
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
export const rommIdDecoder = Decoder.string.map((it) => it as RoomId);
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

export type DirectResponse = { to: User } & (
  | { type: DirectResponseType.HISTORY; room: RoomId; data: History }
  | { type: DirectResponseType.ERROR; code: ErrorCode; message: string }
);

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
export type Messages = { response: DirectResponse | null; broadcast: BroadcastMessage[] };
const noMessages: Messages = { response: null, broadcast: [] };
