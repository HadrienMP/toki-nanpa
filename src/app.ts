import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import showdown from 'showdown';
import showdownHighlight from 'showdown-highlight';
import path from 'path';
import { readFileSync } from 'fs';
import mustache from 'mustache';
import {
  Core,
  JoinFunction,
  LeaveFunction,
  Messages,
  rommIdDecoder,
  RoomId,
  RoomsFunction,
  User
} from './core';
import { InMemory } from './histories/InMemory';
import { parse } from './lib/DecoderExtra';
import { messageDecoder, joinDecoder, dmDecoder, leaveDecoder } from './protocol';

const converter = new showdown.Converter({ extensions: [showdownHighlight()] });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const core = new Core(new InMemory());

app.get('/', (_, res) => {
  const rootFolder = path.dirname(path.dirname(__filename));
  const markdown = readFileSync(path.join(rootFolder, 'README.md'), {
    encoding: 'utf8',
    flag: 'r'
  });
  const htmlReadme = converter.makeHtml(markdown);
  const template = readFileSync(path.join(rootFolder, 'public/index.html'), {
    encoding: 'utf8',
    flag: 'r'
  });
  const body = mustache.render(template, { data: htmlReadme });
  return res.send(body);
});

io.on('connection', (socket) => {

  // -------------------------------------
  // Utils
  // -------------------------------------
  const user: User = socket.id as User;
  const joinFunction: JoinFunction = (roomId: RoomId) => {
    if (socket.rooms.has(roomId)) return 'Already joined';
    socket.join(roomId);
    return 'OK';
  };
  const leaveFunction: LeaveFunction = (roomId: RoomId) => {
    if (!socket.rooms.has(roomId)) return 'Already left';
    socket.leave(roomId);
    return 'OK';
  };
  const getRooms: RoomsFunction = (_) =>
    Array.from(socket.rooms.values()).map((it) => it as RoomId);

  // -------------------------------------
  // Protocol
  // -------------------------------------
  socket.on('join', (data) => {
    const messages: Messages = parse({ raw: data, decoder: joinDecoder })
      .map((joinRequest) => core.join({ roomId: joinRequest.roomId, user, join: joinFunction }))
      .unwrapOrElse(decodingError(user));
    dispatch(messages);
  });

  socket.on('message', (raw) => {
    const messages: Messages = parse({ raw, decoder: messageDecoder })
      .map((message) => core.shareMessage(message, user, joinFunction))
      .unwrapOrElse(decodingError(user));
    dispatch(messages);
  });
  socket.on('direct-message', (raw) => {
    parse({ raw, decoder: dmDecoder }).match({
      ok: (dm) => {
        io.to(dm.to).emit('direct-message', dm);
      },
      err: (error) => {
        dispatch(decodingError(user)(error));
      }
    });
  });
  socket.on('leave', (raw) => {
    const messages: Messages = parse({ raw, decoder: leaveDecoder })
      .map((room) => core.leave(room.roomId, user, leaveFunction))
      .unwrapOrElse(decodingError(user));
    dispatch(messages);
  });
  socket.on('disconnecting', (_) => {
    dispatch(core.disconnect(user, getRooms));
  });
});

const dispatch = (messages: Messages) => {
  if (messages.response) io.to(messages.response.to).emit('response', messages.response);
  messages.broadcast.forEach((message) => io.to(message.room).emit('broadcast', message));
};
function decodingError(user: User): (err: string) => Messages {
  return (message) => ({
    response: { type: 'error', code: 'DECODING_FAILED', message, to: user },
    broadcast: []
  });
}

const port = process.env.PORT || 9876;
server.listen(port, () => console.log(`Server started: http://0.0.0.0:${port}`));
