import { Decoder } from 'elm-decoders';
import { rommIdDecoder, RoomId, User } from './core';
import { History, HistoryError } from './histories/Histories';

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

export type Leave = { roomId: RoomId };
export const leaveDecoder: Decoder<Join> = Decoder.object({
  roomId: rommIdDecoder
});
    // todo update protocol

// ------------------------------------
// Outbound
// ------------------------------------

export type ErrorCode = HistoryError | 'DECODING_FAILED';
export type DirectResponse = { to: User } & (
  | { type: 'history'; room: RoomId; data: History }
  | { type: 'error'; code: ErrorCode; message: string }
);

export type BroadcastMessage = {
  room: RoomId;
  from: User;
} & ({ type: 'joined' | 'left' } | { type: 'message'; data: unknown });

// ------------------------------------
// Outbound factories
// ------------------------------------
export const toOutBound = (message: Inbound, sender: User): BroadcastMessage => ({
  type: 'message',
  room: message.roomId,
  from: sender,
  data: message.data
});
export const toErrorResponse = (val: ErrorCode, user: User): DirectResponse => ({
  type: 'error',
  code: val,
  message: val,
  to: user
});
export const historyMessage = (roomId: RoomId, user: User, history: History): DirectResponse => ({
  type: 'history',
  room: roomId,
  data: history,
  to: user
});
export const toJoinedMessage = (room: RoomId, user: User): BroadcastMessage => ({
  type: 'joined',
  room: room,
  from: user
});
export const toLeftMessage = (id: RoomId, user: User): BroadcastMessage => ({
  type: 'left',
  room: id,
  from: user
});
