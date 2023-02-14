import { RoomData, RoomId, RoomName, User } from '../src/core';

export const aRoom = (): RoomData => ({
  room: { id: '12345' as RoomId, name: 'My-Test-Room' as RoomName },
  connected: [],
  history: []
});

export const emmaGoldman = 'Emma Goldman' as User;
export const bettySnyder = 'Betty Snyder' as User;
