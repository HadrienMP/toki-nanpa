import * as t from 'io-ts';
import { Server } from 'socket.io';

// ------------------------------------
// Inbound
// ------------------------------------
export const InboundC = t.type({ room: t.string, data: t.unknown });

// ------------------------------------
// Outbound
// ------------------------------------
export type PeerId = string;
export type RoomName = string;

export type Outbound<T> = {
  type: 'left' | 'message' | 'joined';
  room: RoomName;
  data: T;
};

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

// ------------------------------------
// Sending messages
// ------------------------------------

export const sendWith =
  (io: Server, peer: PeerId) =>
  (message: Outbound<any>): void => {
    io.to(message.room).emit('message', { ...message, from: peer });
  };

export const sendErrorWith =
  (io: Server, peer: PeerId) =>
  (e: any): void => {
    console.error(peer, { e });
    io.to(peer).emit('error', e);
  };
