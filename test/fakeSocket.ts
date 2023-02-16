import { JoinFunction, RoomId, User } from './core';

let rooms: Record<RoomId, User[]> = {};
export const join: JoinFunction = (room: RoomId, user: User) => {
  const users = rooms[room] ?? [];
  console.error(users, user);
  if (users.includes(user)) return 'Already joined';
  rooms[room] = [...users, user];
  return 'OK';
};
export const flush = () => (rooms = {});
