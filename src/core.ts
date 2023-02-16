import { Brand } from './lib/Brand';
  import { History, Histories } from './histories/Histories';
import { Decoder } from 'elm-decoders';
import {
  BroadcastMessage,
  DirectResponse,
  historyMessage,
  Inbound,
  toErrorResponse,
  toJoinedMessage,
  toOutBound
} from './protocol';

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

  shareMessage = (message: Inbound, sender: User, join: JoinFunction): Messages => {
    const joinResponse = this.join({ roomId: message.roomId, user: sender, join });
    return this.histories.historize(message.roomId, message.data).match({
      ok: (_) => ({
        response: joinResponse.response,
        broadcast: [...joinResponse.broadcast, toOutBound(message, sender)]
      }),
      err: (error) => ({ response: toErrorResponse(error, sender), broadcast: [] })
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
// -----------------------------------
// Model
// -----------------------------------
export type RoomId = Brand<string, 'RoomId'>;
export const rommIdDecoder = Decoder.string.map((it) => it as RoomId);
export type User = Brand<string, 'User'>;

// -----------------------------------
// Response
// -----------------------------------

export type Messages = { response: DirectResponse | null; broadcast: BroadcastMessage[] };
const noMessages: Messages = { response: null, broadcast: [] };
