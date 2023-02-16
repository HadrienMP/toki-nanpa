import { Core, RoomId } from '../src/core';
import { InMemory } from '../src/histories/InMemory';
import { bettySnyder, emmaGoldman } from './fixtures';
import { join as socketJoin, flush as flushSockets } from './fakeSocket';

describe('core', () => {
  const persistence = new InMemory();
  const core = new Core(persistence);
  beforeEach(persistence.flush);
  beforeEach(flushSockets);

  describe('join', () => {
    it('returns history and broadcast join event', () => {
      // Given
      const roomId = 'my-room' as RoomId;

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
        broadcast: [{ type: 'joined', room: roomId, from: bettySnyder, data: {} }]
      });
    });
    it('sends the history when joining a room with messages', () => {
      // Given
      const roomId = 'my-room' as RoomId;
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
        broadcast: [{ type: 'joined', room: roomId, from: bettySnyder, data: {} }]
      });
    });
    it('joining a room that does not exist creates it', () => {
      // When
      const roomId = 'ma-room' as RoomId;
      const response = core.join({ roomId, user: bettySnyder, join: socketJoin });

      // Then
      expect(response).toEqual({
        response: {
          type: 'history',
          room: roomId,
          data: [],
          to: bettySnyder
        },
        broadcast: [{ type: 'joined', room: roomId, from: bettySnyder, data: {} }]
      });
    });
    it('does nothing when joining a second time', () => {
      // Given
      const roomId = 'my-room' as RoomId;
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
      const roomId = 'my-room' as RoomId;
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
    // todo test dm
    it('joins the room when sharing a message', () => {
      const roomId = 'what room now ?' as RoomId;
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
          { type: 'joined', room: roomId, from: emmaGoldman, data: {} },
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
});
