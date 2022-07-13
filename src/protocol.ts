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
  type: 'left' | 'message';
  room: RoomName;
  data: T;
};

export const toLeftMsg = (params: { room: RoomName }): Outbound<{}> => ({
  type: 'left',
  room: params.room,
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
