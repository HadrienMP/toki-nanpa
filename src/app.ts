import express from 'express';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import http from 'http';
import * as t from 'io-ts';
import { Server, Socket } from 'socket.io';
import {
  InboundC,
  Outbound,
  RoomName,
  sendErrorWith as sendError,
  sendWith as sendMsg,
  toLeftMsg,
  toMsg
} from './protocol';
import { onSuccess } from './utils';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (_, res) => res.send('Welcome to toki nanpa ! Work in progress'));

io.on('connection', (socket) => {
  socket.on('message', handleIn(socket)(InboundC.decode, toMsg));
  socket.on('disconnecting', (_) =>
    socket.rooms.forEach(handleIn(socket)((room) => E.right({ room }), toLeftMsg))
  );
});

const handleIn =
  (socket: Socket) =>
  <A extends { room: RoomName }, T, IN>(
    decoder: (arg: IN) => t.Validation<A>,
    msgFactory: (arg: A) => Outbound<T>
  ) =>
  (input: IN): void => {
    pipe(
      decoder(input),
      onSuccess<A>(({ room }) => {
        if (!socket.rooms.has(room)) socket.join(room);
      }),
      E.map(msgFactory),
      E.match(sendError(io, socket.id), sendMsg(io, socket.id))
    );
  };

const port = process.env.PORT || 9876;
server.listen(port, () => console.log(`Server started: http://0.0.0.0:${port}`));
