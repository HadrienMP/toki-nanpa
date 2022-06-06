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
  const userId = socket.id
  io.to(userId).emit(`Welcome!`, { socketId: userId });

  socket.on('join', data => {
    try {
      const { room } = JSON.parse(data);
      join(room);
    } catch (e) {
      io.to(userId).emit('error', {
        message: `You could not join because your message is corrupted.\n\nTo join a room, use this: socket.emit("join", '{"room":"my-room"}')`,
        details: e.message,
      })
    }
  });

  socket.on('message', data => {
    try {
      const { room, data: innerData } = JSON.parse(data);
      if (!socket.rooms.has(room)) join(room);
      io.to(room).emit("message", innerData);
    } catch (e) {
      io.to(userId).emit('error', {
        message:
          `You could not send a message to this room because your message is corrupted.\n\n` +
          `To send a message to a room, use this: socket.emit("message", '{"room":"my-room", "data":...}')`,
        details: e.message,
      })
    }
  });

  socket.on("disconnecting", _ => {
    console.log(socket.rooms);
    socket.rooms.forEach(room => {
      io.to(room).emit(`${userId} is leaving ${room}`);
    });
  })

  function join(room) {
    socket.join(room);
    io.to(room).emit(`${userId} has joined ${room}`);
  }
});

const port = process.env.PORT || 9876;
server.listen(port, () => {
  console.log(`Server started: http://0.0.0.0:${port}`)
  console.log(`Socket io available on: http://0.0.0.0:${port}`)
})