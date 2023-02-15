import { RoomId, User } from '../../src/core';
import { RoomManager } from '../../src/roomManager/RoomManager';

export class FakeRoomManager implements RoomManager {
  private rooms: Record<RoomId, User[]> = {};

  join = (room: RoomId, user: User) => {
    const users = this.rooms[room] ?? [];
    console.error(users, user);
    if (users.includes(user)) return 'Already joined';
    this.rooms[room] = [...users, user];
    return 'OK';
  };

  flush = () => {
    this.rooms = {};
  };
}
