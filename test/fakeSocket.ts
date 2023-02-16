import { JoinFunction, LeaveFunction, RoomId, RoomsFunction, User } from './core';

let rooms: Record<RoomId, User[]> = {};
export const join: JoinFunction = (room: RoomId, user: User) => {
  const users = rooms[room] ?? [];
  if (users.includes(user)) return 'Already joined';
  rooms[room] = [...users, user];
  return 'OK';
};
export const leave: LeaveFunction = (room: RoomId, user: User) => {
  const users = rooms[room] ?? [];
  if (!users.includes(user)) return 'Already left';
  rooms[room] = users.filter((it) => it !== user);
  return 'OK';
};
export const flush = () => (rooms = {});
export const getRooms: RoomsFunction = (user: User) =>
  Object.entries(rooms)
    .filter(([room, users]) => users.includes(user))
    .map(([room]) => room as RoomId);
