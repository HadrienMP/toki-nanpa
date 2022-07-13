import express from 'express';
import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import http from 'http';
import { Server, Socket } from 'socket.io';
import {
  InboundC,
  Outbound,
  RoomName,
  sendErrorWith as sendError,
  sendWith as sendMsg,
  toJoinedMsg,
  toLeftMsg,
  toMsg as toOutbound
} from './protocol';
import { peek } from './utils';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (_, res) => res.send('Welcome to toki nanpa ! Work in progress'));

const maybeJoinIn = (socket: Socket) =>(room: RoomName): O.Option<Outbound<unknown>> =>
  pipe(
    O.some(room),
    O.filter((room) => !socket.rooms.has(room)),
    O.map(peek<string>((room: RoomName) => socket.join(room))),
    O.map(toJoinedMsg),
  );

io.on('connection', (socket) => {
  const maybeJoin = maybeJoinIn(socket);
  socket.on(
    'message',
    flow(
      InboundC.decode,
      E.map((inbound) => pipe(maybeJoin(inbound.room), A.fromOption, A.append(toOutbound(inbound)))),
      E.match(sendError(io, socket.id), A.map(sendMsg(io, socket.id)))
    )
  );
  socket.on('disconnecting', (_) => socket.rooms.forEach(flow(toLeftMsg, sendMsg(io, socket.id))));
});

const port = process.env.PORT || 9876;
server.listen(port, () => console.log(`Server started: http://0.0.0.0:${port}`));
