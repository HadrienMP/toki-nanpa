import { Err, Ok, Result } from '@sniptt/monads/build';
import { Persistence, RoomId, RoomData, User, AddError, CreateError } from '../src/core';

export class InMemory implements Persistence {
  private rooms: Record<RoomId, RoomData> = {};

  create = (roomData: RoomData): Result<null, CreateError> => {
    if (Object.keys(this.rooms).includes(roomData.room.id)) {
      return Err(CreateError.ALREADY_EXISTS);
    }
    this.rooms[roomData.room.id] = roomData;
    return Ok(null);
  };

  addUser = (roomId: RoomId, user: User): Result<RoomData, AddError> => {
    const roomData = this.get(roomId);

    if (!roomData) return Err(AddError.UNKNOWN_ROOM);
    if (roomData.connected.indexOf(user) !== -1) return Err(AddError.ALREADY_JOINED);

    const updated = { ...roomData, connected: [user, ...roomData.connected] };
    this.rooms[roomId] = updated;
    return Ok(updated);
  };

  get = (roomId: RoomId): RoomData | null => {
    return this.rooms[roomId];
  };

  historize = (room: RoomId, message: unknown): RoomData => {
    const roomData = this.get(room)!;
    const updated = { ...roomData, history: [...roomData.history, message] };
    this.rooms[room] = updated;
    return updated;
  };
  
  flush = () => (this.rooms = {});
}
