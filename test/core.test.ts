import { Core, RoomId } from '../src/core';
import { InMemory } from '../src/histories/InMemory';
import { bettySnyder, emmaGoldman } from './fixtures';
import {
  join as socketJoin,
  leave as socketLeave,
  getRooms as socketRooms,
  flush as flushSockets
} from './fakeSocket';

describe('core', () => {
  const persistence = new InMemory();
  const core = new Core(persistence);
  const roomId = 'my-room' as RoomId;
  beforeEach(persistence.flush);
  beforeEach(flushSockets);

  describe('join', () => {
    it('returns history and broadcast join event', () => {
      // When
      const response = core.join({ roomId, user: bettySnyder, join: socketJoin });

      // Then
      expect(response).toEqual({
        response: {
          type: 'history',
          room: roomId,
          data: [],
          to: bettySnyder
        },
        broadcast: [{ type: 'joined', room: roomId, from: bettySnyder }]
      });
    });
    it('sends the history when joining a room with messages', () => {
      // Given
      const joinResponse = core.join({ roomId, user: emmaGoldman, join: socketJoin });
      const message = 'If voting changed anything';
      core.shareMessage({ roomId: roomId, data: message }, emmaGoldman, socketJoin);
      const message2 = `they'd make it illegal`;
      core.shareMessage({ roomId: roomId, data: message2 }, emmaGoldman, socketJoin);

      // When
      const response = core.join({ roomId, user: bettySnyder, join: socketJoin });

      // Then
      expect(response).toEqual({
        response: {
          type: 'history',
          room: roomId,
          data: [...joinResponse.broadcast, message, message2],
          to: bettySnyder
        },
        broadcast: [{ type: 'joined', room: roomId, from: bettySnyder }]
      });
    });
    it('joining a room that does not exist creates it', () => {
      // When
      const response = core.join({ roomId, user: bettySnyder, join: socketJoin });

      // Then
      expect(response).toEqual({
        response: {
          type: 'history',
          room: roomId,
          data: [],
          to: bettySnyder
        },
        broadcast: [{ type: 'joined', room: roomId, from: bettySnyder }]
      });
    });
    it('does nothing when joining a second time', () => {
      // Given
      const firstJoinResponse = core.join({ roomId, user: bettySnyder, join: socketJoin });

      // When
      const response = core.join({ roomId, user: bettySnyder, join: socketJoin });

      // Then
      expect(response).toEqual({
        response: null,
        broadcast: []
      });
      expect(core.getHistory(roomId, bettySnyder)).toEqual({
        response: {
          type: 'history',
          room: roomId,
          data: firstJoinResponse.broadcast,
          to: bettySnyder
        },
        broadcast: []
      });
    });
  });
  // todo share message without joining makes you join

  describe('messages', () => {
    it('broadcasts them', () => {
      // Given
      core.join({ roomId, user: emmaGoldman, join: socketJoin });

      const message = {
        roomId: roomId,
        data: `I demand the independence of woman, her right to support herself; 
        to live for herself; to love whomever she pleases, or as many as she pleases. 
        I demand freedom for both sexes, freedom of action, freedom in love and freedom in motherhood.`
      };
      // When
      const response = core.shareMessage(message, emmaGoldman, socketJoin);

      // Then
      expect(response).toEqual({
        response: null,
        broadcast: [
          {
            type: 'message',
            room: roomId,
            from: emmaGoldman,
            data: message.data
          }
        ]
      });
    });
    // todo test disconnection
    it('joins the room when sharing a message', () => {
      const message = {
        roomId: roomId,
        data: `Liberty will not descend to a people, a people must raise themselves to liberty`
      };
      // When
      const response = core.shareMessage(message, emmaGoldman, socketJoin);

      // Then
      expect(response).toEqual({
        response: {
          type: 'history',
          room: roomId,
          data: [],
          to: emmaGoldman
        },
        broadcast: [
          { type: 'joined', room: roomId, from: emmaGoldman },
          {
            type: 'message',
            room: roomId,
            from: emmaGoldman,
            data: message.data
          }
        ]
      });
    });
  });
  describe('leave', () => {
    it('broadcasts a leave message', () => {
      core.join({ roomId, user: emmaGoldman, join: socketJoin });
      core.join({ roomId, user: bettySnyder, join: socketJoin });
      const response = core.leave(roomId, emmaGoldman, socketLeave);
      expect(response).toEqual({
        response: null,
        broadcast: [{ type: 'left', room: roomId, from: emmaGoldman }]
      });
    });
    it('historizes left messages', () => {
      // Given
      const resp1 = core.join({ roomId, user: emmaGoldman, join: socketJoin });
      const resp2 = core.join({ roomId, user: bettySnyder, join: socketJoin });
      const resp3 = core.leave(roomId, emmaGoldman, socketLeave);

      // When
      const response = core.getHistory(roomId, bettySnyder);

      // Then
      expect(response).toEqual({
        response: {
          type: 'history',
          room: roomId,
          data: [...resp1.broadcast, ...resp2.broadcast, ...resp3.broadcast],
          to: bettySnyder
        },
        broadcast: []
      });
    });
    it('does nothing for a person that already left', () => {
      // Given
      core.join({ roomId, user: emmaGoldman, join: socketJoin });
      core.join({ roomId, user: bettySnyder, join: socketJoin });
      core.leave(roomId, emmaGoldman, socketLeave);

      // When
      const response = core.leave(roomId, emmaGoldman, socketLeave);

      // Then
      expect(response).toEqual({
        response: null,
        broadcast: []
      });
    });
    it('does nothing for a person that never joined', () => {
      const response = core.leave(roomId, emmaGoldman, socketLeave);
      expect(response).toEqual({
        response: null,
        broadcast: []
      });
    });
  });
  describe('disconnecting', () => {
    it('leaves all the rooms they were in', () => {
      const room1 = 'room 1' as RoomId;
      const room2 = 'room 2' as RoomId;
      core.join({ roomId: room1, user: emmaGoldman, join: socketJoin });
      core.join({ roomId: room2, user: emmaGoldman, join: socketJoin });
      const response = core.disconnect(emmaGoldman, socketRooms);
      expect(response).toEqual({
        response: null,
        broadcast: [
          { type: 'left', room: room1, from: emmaGoldman },
          { type: 'left', room: room2, from: emmaGoldman }
        ]
      });
    });
    it('historizes left messages', () => {
      const room1 = 'room 1' as RoomId;
      const room2 = 'room 2' as RoomId;
      core.join({ roomId: room1, user: emmaGoldman, join: socketJoin });
      core.join({ roomId: room2, user: emmaGoldman, join: socketJoin });
      core.disconnect(emmaGoldman, socketRooms);
      const response = core.getHistory(room1, bettySnyder);
      expect(response).toEqual({
        response: {
          type: 'history',
          room: room1,
          data: [
            { type: 'joined', room: room1, from: emmaGoldman },
            { type: 'left', room: room1, from: emmaGoldman }
          ],
          to: bettySnyder
        },
        broadcast: []
      });
    });
  });
});
