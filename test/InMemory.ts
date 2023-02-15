import { Err, Ok, Result } from '@sniptt/monads/build';
import { Persistence, RoomId, RoomData, User, ErrorCode } from '../src/core';

export class InMemory implements Persistence {
  private rooms: Record<RoomId, RoomData> = {};

  create = (roomData: RoomData): Result<RoomData, ErrorCode> => {
    if (Object.keys(this.rooms).includes(roomData.room.id)) {
      return Err(ErrorCode.ALREADY_CREATED);
    }
    this.rooms[roomData.room.id] = roomData;
    return Ok(roomData);
  };

  addUser = (roomId: RoomId, user: User): Result<RoomData, ErrorCode> => {
    const roomData = this.get(roomId);
    if (!roomData) return Err(ErrorCode.UNKNOWN_ROOM);
    if (roomData.connected.indexOf(user) !== -1) return Err(ErrorCode.ALREADY_JOINED);

    const updated = { ...roomData, connected: [user, ...roomData.connected] };
    this.rooms[roomId] = updated;
    return Ok(updated);
  };

  get = (roomId: RoomId): RoomData | null => {
    return this.rooms[roomId];
  };

  historize = (room: RoomId, message: unknown): Result<RoomData, ErrorCode> => {
    const roomData = this.get(room);
    if (!roomData) return Err(ErrorCode.UNKNOWN_ROOM);

    const updated = { ...roomData, history: [...roomData.history, message] };
    this.rooms[room] = updated;
    return Ok(updated);
  };

  flush = () => (this.rooms = {});
}
