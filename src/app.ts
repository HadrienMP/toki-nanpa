import express from 'express';
import * as E from 'fp-ts/Either';
import { flow } from 'fp-ts/lib/function';
import http from 'http';
import { Server } from 'socket.io';
import showdown from 'showdown';
import showdownHighlight from 'showdown-highlight';
import path from 'path';
import { readFileSync } from 'fs';
import mustache from 'mustache';
import { Core, DirectResponseType, JoinFunction, Messages, RoomId, User } from './core';
import { InMemory } from './histories/InMemory';
import { parse } from './lib/DecoderExtra';
import {
  messageDecoder,
  joinDecoder,
  toLeftMsg,
  dmDecoder,
  sendDirectMessageWith,
  sendErrorWith,
  sendMessageWith
} from './protocol';

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
  const user: User = socket.id as User;
  const joinFunction: JoinFunction = (roomId: RoomId) => {
    if (socket.rooms.has(roomId)) return 'Already joined';
    socket.join(roomId);
    return 'OK';
  };

  const sendError = sendErrorWith(io, user);
  const sendMsg = sendMessageWith(io, user);
  const sendDm = sendDirectMessageWith(io, user);

  socket.on('join', (data) => {
    const messages: Messages = parse({ raw: data, decoder: joinDecoder })
      .map((joinRequest) => core.join({ roomId: joinRequest.roomId, user, join: joinFunction }))
      .unwrapOrElse(decodingError(user));
    dispatch(messages);
  });

  socket.on('message', (data) => {
    const messages: Messages = parse({ raw: data, decoder: messageDecoder })
      .map((message) => core.shareMessage({ ...message, sender: user }, joinFunction))
      .unwrapOrElse(decodingError(user));
    dispatch(messages);
  });
  socket.on('direct-message', (data) => {
    parse({ raw: data, decoder: dmDecoder }).match({
      ok: sendDm,
      err: sendError
    });
  });
  socket.on('disconnecting', (_) =>
    socket.rooms.forEach(flow((it) => it as RoomId, toLeftMsg, sendMsg))
  );
});

const port = process.env.PORT || 9876;
server.listen(port, () => console.log(`Server started: http://0.0.0.0:${port}`));

const dispatch = (messages: Messages) => {
  if (messages.response) io.to(messages.response.to).emit('response', messages.response);
  messages.broadcast.forEach((message) => io.to(message.room).emit('message', message));
};
function decodingError(user: User): (err: string) => Messages {
  return (message) => ({
    response: { type: DirectResponseType.ERROR, code: 'DECODING_FAILED', message, to: user },
    broadcast: []
  });
}
