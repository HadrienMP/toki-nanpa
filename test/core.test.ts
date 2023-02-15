import { BroadcastMessageType, Core, DirectResponseType, RoomId, RoomName } from '../src/core';
import { InMemory } from '../src/histories/InMemory';
import { bettySnyder, emmaGoldman } from './fixtures';
import { FakeRoomManager } from './roomManager/FakeRoomManager';

describe('core', () => {
  const persistence = new InMemory();
  const roomManager = new FakeRoomManager();
  const core = new Core(persistence, roomManager);
  beforeEach(persistence.flush);
  beforeEach(roomManager.flush);

  describe('join', () => {
    it('returns history and broadcast join event', () => {
      // Given
      const roomId = 'my-room' as RoomId;

      // When
      const response = core.joinRoom(roomId, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room: roomId,
          data: []
        },
        broadcast: [
          { type: BroadcastMessageType.JOINED, room: roomId, from: bettySnyder, data: {} }
        ]
      });
    });
    it('sends the history when joining a room with messages', () => {
      // Given
      const roomId = 'my-room' as RoomId;
      const joinResponse = core.joinRoom(roomId, emmaGoldman);
      const message = 'If voting changed anything';
      core.shareMessage({ roomId: roomId, sender: emmaGoldman, content: message });
      const message2 = `they'd make it illegal`;
      core.shareMessage({ roomId: roomId, sender: emmaGoldman, content: message2 });

      // When
      const response = core.joinRoom(roomId, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room: roomId,
          data: [...joinResponse.broadcast, message, message2]
        },
        broadcast: [
          { type: BroadcastMessageType.JOINED, room: roomId, from: bettySnyder, data: {} }
        ]
      });
    });
    it('joining a room that does not exist creates it', () => {
      // When
      const roomId = 'ma-room' as RoomId;
      const response = core.joinRoom(roomId, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room: roomId,
          data: []
        },
        broadcast: [
          { type: BroadcastMessageType.JOINED, room: roomId, from: bettySnyder, data: {} }
        ]
      });
    });
    it('does nothing when joining a second time', () => {
      // Given
      const roomId = 'my-room' as RoomId;
      const firstJoinResponse = core.joinRoom(roomId, bettySnyder);

      // When
      const response = core.joinRoom(roomId, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: null,
        broadcast: []
      });
      expect(core.getHistory(roomId)).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room: roomId,
          data: firstJoinResponse.broadcast
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
      core.joinRoom(roomId, emmaGoldman);

      const message = {
        roomId: roomId,
        content: `I demand the independence of woman, her right to support herself; 
        to live for herself; to love whomever she pleases, or as many as she pleases. 
        I demand freedom for both sexes, freedom of action, freedom in love and freedom in motherhood.`,
        sender: emmaGoldman
      };
      // When
      const response = core.shareMessage(message);

      // Then
      expect(response).toEqual({
        direct: null,
        broadcast: [
          {
            type: BroadcastMessageType.MESSAGE,
            room: roomId,
            from: emmaGoldman,
            data: message.content
          }
        ]
      });
    });
    it('joins the room when sharing a message', () => {
      const roomId = 'what room now ?' as RoomId;
      const message = {
        roomId: roomId,
        content: `Liberty will not descend to a people, a people must raise themselves to liberty`,
        sender: emmaGoldman
      };
      // When
      const response = core.shareMessage(message);

      // Then
      expect(response).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room: roomId,
          data: []
        },
        broadcast: [
          { type: BroadcastMessageType.JOINED, room: roomId, from: emmaGoldman, data: {} },
          {
            type: BroadcastMessageType.MESSAGE,
            room: roomId,
            from: emmaGoldman,
            data: message.content
          }
        ]
      });
    });
  });
});
