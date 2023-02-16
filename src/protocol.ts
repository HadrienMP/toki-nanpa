import { Err, Ok, Result } from '@sniptt/monads/build';
import { Server } from 'socket.io';
import { Decoder } from 'elm-decoders';
import { rommIdDecoder, RoomId, User } from './core';

// ------------------------------------
// Inbound
// ------------------------------------
export type Inbound = { roomId: RoomId; data: unknown };
export const messageDecoder: Decoder<Inbound> = Decoder.object({
  roomId: rommIdDecoder,
  data: Decoder.any
});
export type InDirectMessage = { to: User; data: unknown };
export const dmDecoder: Decoder<InDirectMessage> = Decoder.object({
  to: Decoder.string.map((it) => it as User),
  data: Decoder.any
});
export type Join = { roomId: RoomId };
export const joinDecoder: Decoder<Join> = Decoder.object({
  roomId: rommIdDecoder
});

// ------------------------------------
// Outbound
// ------------------------------------

export type Outbound<T> = {
  type: 'left' | 'message' | 'joined' | 'direct-message' | 'history';
  room: RoomId;
  data: T;
};
export type OutDirectMessage<T> = { to: User; data: T };

export const toHistoryMsg = (
  room: RoomId,
  history: Outbound<any>[]
): Outbound<Outbound<any>[]> => ({
  type: 'history',
  room,
  data: history
});
export const toJoinedMsg = (room: RoomId): Outbound<{}> => ({
  type: 'joined',
  room,
  data: {}
});
export const toLeftMsg = (room: RoomId): Outbound<{}> => ({
  type: 'left',
  room,
  data: {}
});
export const toMsg = <T>(params: { room: RoomId; data: T }): Outbound<T> => ({
  type: 'message',
  room: params.room,
  data: params.data
});
export const toDirectMessage = <T>(params: { peer: User; data: T }): OutDirectMessage<T> => ({
  to: params.peer,
  data: params.data
});

// ------------------------------------
// Sending messages
// ------------------------------------

export const sendMessageWith =
  (io: Server, peer: User) =>
  (message: Outbound<any>): void => {
    io.to(message.room).emit('message', { ...message, from: peer });
  };

export const sendDirectMessageWith =
  (io: Server, peer: User) =>
  (message: OutDirectMessage<any>): void => {
    io.to(message.to).emit('direct-message', { ...message, from: peer });
  };

export const sendErrorWith =
  (io: Server, peer: User) =>
  (e: any): void => {
    console.error(peer, { e });
    io.to(peer).emit('error', e);
  };
