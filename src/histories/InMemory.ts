import { Err, Ok, Result } from '@sniptt/monads/build';
import { RoomId } from '../core';
import { History, Histories, HistoryError } from './Histories';

export class InMemory implements Histories {
  private rooms: Record<RoomId, History> = {};

  create = (roomId: RoomId): Result<null, HistoryError> => {
    if (Object.keys(this.rooms).includes(roomId)) {
      return Err(HistoryError.ALREADY_CREATED);
    }
    this.rooms[roomId] = [];
    return Ok(null);
  };

  get = (roomId: RoomId): History => {
    return this.rooms[roomId] ?? [];
  };

  historize = (room: RoomId, message: unknown): Result<null, HistoryError> => {
    const history = this.get(room);
    if (!history) return Err(HistoryError.UNKNOWN_ROOM);

    const updated = [...history, message];
    this.rooms[room] = updated;
    return Ok(null);
  };

  flush = () => (this.rooms = {});
}
