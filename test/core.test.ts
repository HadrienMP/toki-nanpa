import {
  BroadcastMessageType,
  Core,
  DirectResponseType,
  InMemory,
  RoomId,
  RoomName
} from '../src/core';
import { bettySnyder, emmaGoldman } from './fixtures';

describe('core', () => {
  const persistence = new InMemory();
  const core = new Core(persistence);
  // todo room already exists
  it('create room', () => {
    const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
    const response = core.createRoom(room, emmaGoldman);
    expect(response).toEqual({
      direct: [{ type: DirectResponseType.HISTORY, room, messages: [] }],
      broadcast: [{ type: BroadcastMessageType.JOINED, room: room.id, from: emmaGoldman, data: {} }]
    });
  });
  // todo already joined
  // todo messages came in
  // todo joining a room that does not exist
  it('join room', () => {
    // Given
    const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
    const createRoomResponse = core.createRoom(room, emmaGoldman);

    // When
    const response = core.joinRoom(room.id, bettySnyder);

    // Then
    expect(response).toEqual({
      direct: [{ type: DirectResponseType.HISTORY, room: room, messages: createRoomResponse.broadcast }],
      broadcast: [{ type: BroadcastMessageType.JOINED, room: room.id, from: bettySnyder, data: {} }]
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
      direct: [
        {
          type: DirectResponseType.HISTORY,
          room: room,
          messages: [...createRoomResponse.broadcast, message, message2]
        }
      ],
      broadcast: [{ type: BroadcastMessageType.JOINED, room: room.id, from: bettySnyder, data: {} }]
    });
  });
  it('broadcasts incoming messages', () => {
    // Given
    const room = { id: 'my-room' as RoomId, name: 'my-room' as RoomName };
    core.createRoom(room, emmaGoldman);

    const message = {
      roomId: room.id,
      content: 'my awesome content',
      sender: emmaGoldman
    };
    // When
    const response = core.shareMessage(message);

    // Then
    expect(response).toEqual({
      direct: [],
      broadcast: [
        {
          type: BroadcastMessageType.MESSAGE,
          room: room.id,
          from: emmaGoldman,
          data: message.content
        }
      ]
    });
  });
});
