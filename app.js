import express from 'express'
const app = express()
import http from 'http';
const server = http.createServer(app);
import { Server } from 'socket.io';
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to toki nanpa ! Work in progress');
})

io.on('connection', (socket) => {
  const peer = socket.id
  io.to(peer).emit('info', { message: 'Welcome!', peer, type: "welcome" });

  socket.on('join', data => {
    try {
      join(data.room);
    } catch (e) {
      console.error(peer, e, data);
      io.to(peer).emit('error', {
        message:
          `You could not join because your message is corrupted.\n\n
          To join a room, use this: socket.emit("join", '{"room":"my-room"}')`,
        details: e.message,
      })
    }
  });

  socket.on('message', data => {
    try {
      const { room, data: innerData } = data;
      if (!socket.rooms.has(room)) join(room);
      io.to(room).emit("message", { peer, data: innerData });
    } catch (e) {
      console.error(peer, e, data);
      io.to(peer).emit('error', {
        message:
          `You could not send a message to this room because your message is corrupted.\n\n` +
          `To send a message to a room, use this: socket.emit("message", '{"room":"my-room", "data":...}')`,
        details: e.message,
      })
    }
  });

  socket.on("disconnecting", _ => {
    socket.rooms.forEach(room => {
      io.to(room).emit('peer', { message: `${peer} is leaving ${room}`, peer, type: "disconnecting", room });
    });
  })

  function join(room) {
    socket.join(room);
    io.to(room).emit('peer', { message: `${peer} has joined ${room}`, peer, type: "joined", room });
  }
});

const port = process.env.PORT || 9876;
server.listen(port, () => {
  console.log(`Server started: http://0.0.0.0:${port}`)
})