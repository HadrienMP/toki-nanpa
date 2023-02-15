import express from 'express';
import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import http from 'http';
import { Server, Socket } from 'socket.io';
import showdown from 'showdown';
import showdownHighlight from 'showdown-highlight';
import path from 'path';
import {
  InboundC,
  InDirectMessageC,
  Join,
  JoinC,
  joinDecoder,
  Outbound,
  RoomName,
  sendDirectMessageWith,
  sendErrorWith,
  sendMessageWith,
  toHistoryMsg,
  toJoinedMsg,
  toLeftMsg,
  toMsg as toOutbound
} from './protocol';
import { peek } from './utils';
import { readFileSync } from 'fs';
import mustache from 'mustache';
import { Err, Ok, Result } from '@sniptt/monads/build';
import { Errors } from 'io-ts';
import { Core, DirectResponseType, ErrorCode, Response, RoomId, User } from './core';
import { InMemory } from './histories/InMemory';
import { parse } from './lib/DecoderExtra';

const converter = new showdown.Converter({ extensions: [showdownHighlight()] });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

type RoomHistory = Outbound<any>[];
const history: Record<RoomName, RoomHistory> = {};
const historize = (room: RoomName) => (messages: Outbound<any>[]) => {
  history[room] = [...historyOf(room), ...messages.filter((msg) => msg.type !== 'history')];
};
const historyOf = (room: RoomName) => history[room] ?? [];

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

  const sendError = sendErrorWith(io, user);
  const sendMsg = sendMessageWith(io, user);
  const sendDm = sendDirectMessageWith(io, user);

  socket.on('join', (data) => {
    const { direct, broadcast } = parse({ raw: data, decoder: joinDecoder }).match<Response>({
      ok: (join) => core.joinRoom(join.roomId, user),
      err: (message) => ({
        direct: { type: DirectResponseType.ERROR, code: ErrorCode.DECODING_FAILED, message },
        broadcast: null
      })
    });
    if (direct) io.to(user).emit('response', direct);
    if (broadcast) io.to(broadcast.room).emit('message', { ...message, from: peer });
    return pipe(
      data,
      JoinC.decode,
      E.map((join) =>
        pipe(
          maybeJoin(join.room),
          peek(historize(join.room)),
          A.append(toHistoryMsg(join.room, historyOf(join.room)))
        )
      ),
      E.match(sendError, A.map(sendMsg))
    );
  });

  socket.on(
    'message',
    flow(
      InboundC.decode,
      E.map((inbound) =>
        pipe(maybeJoin(inbound.room), A.append(toOutbound(inbound)), peek(historize(inbound.room)))
      ),
      E.match(sendError, A.map(sendMsg))
    )
  );
  socket.on('direct-message', flow(InDirectMessageC.decode, E.match(sendError, sendDm)));
  socket.on('disconnecting', (_) => socket.rooms.forEach(flow(toLeftMsg, sendMsg)));
});

const port = process.env.PORT || 9876;
server.listen(port, () => console.log(`Server started: http://0.0.0.0:${port}`));
