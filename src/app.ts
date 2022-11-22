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
  InboundC, InDirectMessageC,
  JoinC,
  Outbound,
  RoomName,
  sendDirectMessageWith,
  sendErrorWith,
  sendMessageWith,
  toJoinedMsg,
  toLeftMsg,
  toMsg as toOutbound
} from './protocol';
import { peek } from './utils';
import { readFileSync } from 'fs';
import mustache from 'mustache';


const converter = new showdown.Converter({extensions: [showdownHighlight()]});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });


app.get('/', (_, res) => {
  const rootFolder = path.dirname(path.dirname(__filename));
  const markdown = readFileSync(path.join(rootFolder, 'README.md'), { encoding: 'utf8', flag: 'r' } );
  const htmlReadme = converter.makeHtml(markdown);
  const template = readFileSync(path.join(rootFolder, 'public/index.html'), { encoding: 'utf8', flag: 'r' } );
  const body = mustache.render(template, {data: htmlReadme});
  return res.send( body );
});

const maybeJoinIn = (socket: Socket) =>(room: RoomName): O.Option<Outbound<unknown>> =>
  pipe(
    O.some(room),
    O.filter((room) => !socket.rooms.has(room)),
    O.map(peek<string>((room: RoomName) => socket.join(room))),
    O.map(toJoinedMsg),
  );

io.on('connection', (socket) => {
  const maybeJoin = maybeJoinIn(socket);
  const sendError = sendErrorWith(io, socket.id);
  const sendMsg = sendMessageWith(io, socket.id);
  const sendDm = sendDirectMessageWith(io, socket.id);

  socket.on(
    'join', 
    flow(
      JoinC.decode, 
      E.mapLeft(JSON.stringify),
      E.map(join => maybeJoin(join.room)),
      E.map(E.fromOption(() => "Joining failed")),
      E.flatten,
      E.match(sendError, sendMsg)
    )
  )
  
  socket.on(
    'message',
    flow(
      InboundC.decode,
      E.map((inbound) => pipe(maybeJoin(inbound.room), A.fromOption, A.append(toOutbound(inbound)))),
      E.match(sendError, A.map(sendMsg))
    )
  );
  socket.on('direct-message', flow(InDirectMessageC.decode, E.match(sendError, sendDm)));
  socket.on('disconnecting', (_) => socket.rooms.forEach(flow(toLeftMsg, sendMsg)));
});

const port = process.env.PORT || 9876;
server.listen(port, () => console.log(`Server started: http://0.0.0.0:${port}`));
