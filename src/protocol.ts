import * as t from 'io-ts';
import { Server } from 'socket.io';

const PeerIdC = t.string;
export type PeerId = t.TypeOf<typeof PeerIdC>;
const RoomNameC = t.string;
export type RoomName = t.TypeOf<typeof RoomNameC>;

// ------------------------------------
// Inbound
// ------------------------------------
export const InboundC = t.type({ room: RoomNameC, data: t.unknown });
export const InDirectMessageC = t.type({to: PeerIdC, data: t.unknown});
export const JoinC = t.type({ room: RoomNameC });

// ------------------------------------
// Outbound
// ------------------------------------

export type Outbound<T> = {
  type: 'left' | 'message' | 'joined' | 'direct-message';
  room: RoomName;
  data: T;
};
export type OutDirectMessage<T> = { to: PeerId; data: T; };

export const toJoinedMsg = (room: RoomName): Outbound<{}> => ({
  type: 'joined',
  room,
  data: {}
});
export const toLeftMsg = (room: RoomName): Outbound<{}> => ({
  type: 'left',
  room,
  data: {}
});
export const toMsg = <T>(params: { room: RoomName; data: T }): Outbound<T> => ({
  type: 'message',
  room: params.room,
  data: params.data
});
export const toDirectMessage = <T>(params: { peer: PeerId; data: T }): OutDirectMessage<T> => ({
  to: params.peer,
  data: params.data
});

// ------------------------------------
// Sending messages
// ------------------------------------

export const sendMessageWith =
  (io: Server, peer: PeerId) =>
  (message: Outbound<any>): void => {
    io.to(message.room).emit('message', { ...message, from: peer });
  };

export const sendDirectMessageWith =
  (io: Server, peer: PeerId) =>
  (message: OutDirectMessage<any>): void => {
    io.to(message.to).emit('direct-message', { ...message, from: peer });
  };

export const sendErrorWith =
  (io: Server, peer: PeerId) =>
  (e: any): void => {
    console.error(peer, { e });
    io.to(peer).emit('error', e);
  };
