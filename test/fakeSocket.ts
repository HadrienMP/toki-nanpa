import { JoinFunction, LeaveFunction, RoomId, User } from './core';

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
