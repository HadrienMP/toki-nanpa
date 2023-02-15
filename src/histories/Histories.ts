import { Result } from '@sniptt/monads/build';
import { History, RoomId } from '../core';

export interface Histories {
  create: (roomId: RoomId) => Result<null, HistoryError>;
  get: (roomId: RoomId) => History;
  historize: (roomId: RoomId, message: unknown) => Result<null, HistoryError>;
}

export enum HistoryError {
  UNKNOWN_ROOM = 'UNKNOWN_ROOM',
  ALREADY_CREATED = 'ALREADY_CREATED'
}

