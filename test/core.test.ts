import {
  BroadcastMessageType,
  Core,
  DirectResponseType,
  ErrorCode,
  RoomId,
  RoomName
} from '../src/core';
import { InMemory } from './persistence/InMemory';
import { bettySnyder, emmaGoldman } from './fixtures';

describe('core', () => {
  const persistence = new InMemory();
  const core = new Core(persistence);
  beforeEach(persistence.flush);

  describe('create room', () => {
    it('acknowledges with empty history and join broadcast', () => {
      const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
      const response = core.createRoom(room, emmaGoldman);
      expect(response).toEqual({
        direct: { type: DirectResponseType.HISTORY, room, data: [] },
        broadcast: { type: BroadcastMessageType.JOINED, room: room.id, from: emmaGoldman, data: {} }
      });
    });
    it('sends an error when the already exists', () => {
      const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
      core.createRoom(room, emmaGoldman);
      const response = core.createRoom(room, bettySnyder);
      expect(response).toEqual({
        direct: { type: DirectResponseType.ERROR, code: ErrorCode.ALREADY_CREATED },
        broadcast: null
      });
    });
  });

  describe('join', () => {
    it('returns history and broadcast join event', () => {
      // Given
      const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
      const createRoomResponse = core.createRoom(room, emmaGoldman);

      // When
      const response = core.joinRoom(room.id, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room: room,
          data: [createRoomResponse.broadcast]
        },
        broadcast: { type: BroadcastMessageType.JOINED, room: room.id, from: bettySnyder, data: {} }
      });
    });
    it('sends the history when joining a room with messages', () => {
      // Given
      const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
      const createRoomResponse = core.createRoom(room, emmaGoldman);
      const message = 'If voting changed anything';
      core.shareMessage({ roomId: room.id, sender: emmaGoldman, content: message });
      const message2 = `they'd make it illegal`;
      core.shareMessage({ roomId: room.id, sender: emmaGoldman, content: message2 });

      // When
      const response = core.joinRoom(room.id, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room: room,
          data: [createRoomResponse.broadcast, message, message2]
        },
        broadcast: { type: BroadcastMessageType.JOINED, room: room.id, from: bettySnyder, data: {} }
      });
    });
    it('joining a room that does not exist fails', () => {
      // When
      const response = core.joinRoom('what room now ?' as RoomId, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: { type: DirectResponseType.ERROR, code: ErrorCode.UNKNOWN_ROOM },
        broadcast: null
      });
    });
    it('does nothing when joining a second time', () => {
      // Given
      const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
      const createRoomResponse = core.createRoom(room, emmaGoldman);
      const firstJoinResponse = core.joinRoom(room.id, bettySnyder);

      // When
      const response = core.joinRoom(room.id, bettySnyder);

      // Then
      expect(response).toEqual({
        direct: { type: DirectResponseType.ERROR, code: ErrorCode.ALREADY_JOINED },
        broadcast: null
      });
      expect(core.getHistory(room.id)).toEqual({
        direct: {
          type: DirectResponseType.HISTORY,
          room,
          data: [createRoomResponse.broadcast, firstJoinResponse.broadcast]
        },
        broadcast: null
      });
    });
  });

  describe('messages', () => {
    it('broadcasts them', () => {
      // Given
      const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
      core.createRoom(room, emmaGoldman);

      const message = {
        roomId: room.id,
        content:
          'I demand the independence of woman, her right to support herself; to live for herself; to love whomever she pleases, or as many as she pleases. I demand freedom for both sexes, freedom of action, freedom in love and freedom in motherhood.',
        sender: emmaGoldman
      };
      // When
      const response = core.shareMessage(message);

      // Then
      expect(response).toEqual({
        direct: null,
        broadcast: {
          type: BroadcastMessageType.MESSAGE,
          room: room.id,
          from: emmaGoldman,
          data: message.content
        }
      });
    });
    it('sends an error for messages in a room that does not exists', () => {
      const message = {
        roomId: 'what room now ?' as RoomId,
        content: `I demand the independence of woman, her right to support herself; 
          to live for herself; to love whomever she pleases, or as many as she pleases. 
          I demand freedom for both sexes, freedom of action, freedom in love and freedom in motherhood.`,
        sender: emmaGoldman
      };
      // When
      const response = core.shareMessage(message);

      // Then
      expect(response).toEqual({
        direct: { type: DirectResponseType.ERROR, code: ErrorCode.UNKNOWN_ROOM },
        broadcast: null
      });
    });
  });
});
