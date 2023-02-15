import { RoomId, User } from '../core';

export enum RoomManagerError {
  UNKNOWN_ROOM = 'UNKNOWN_ROOM',
}

export interface RoomManager {
  join: (room: RoomId, user: User) => 'OK' | 'Already joined';
}
